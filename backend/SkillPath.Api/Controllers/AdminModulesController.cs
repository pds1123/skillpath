using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Contracts;
using SkillPath.Api.Data;
using SkillPath.Api.Models;

namespace SkillPath.Api.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/admin/modules")]
public sealed partial class AdminModulesController(SkillPathDbContext db) : ControllerBase
{
    private static readonly HashSet<string> AllowedStatuses = ["draft", "published", "archived"];

    [HttpGet]
    public async Task<ActionResult<AdminModulePageResponse>> GetModules(
        [FromQuery] string? path = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        path = path?.Trim();
        status = status?.Trim().ToLowerInvariant();
        search = search?.Trim();

        var baseQuery =
            from module in db.Modules.AsNoTracking()
            join learningPath in db.LearningPaths.AsNoTracking() on module.LearningPathId equals learningPath.Id
            join certMapping in db.CertificationModules.AsNoTracking() on module.Id equals certMapping.ModuleId
            join certification in db.Certifications.AsNoTracking() on certMapping.CertificationId equals certification.Id
            select new { Module = module, Path = learningPath, Certification = certification.Code };

        var query = baseQuery;
        if (long.TryParse(path, out var pathId)) query = query.Where(item => item.Path.Id == pathId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(item => item.Module.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(item => item.Module.Name.ToLower().Contains(term) || item.Module.Slug.ToLower().Contains(term));
        }

        var rows = await query
            .OrderBy(item => item.Path.SortOrder)
            .ThenBy(item => item.Module.SortOrder)
            .ThenBy(item => item.Module.Id)
            .ToListAsync();
        var moduleIds = rows.Select(item => item.Module.Id).ToList();
        var lessonCounts = await db.Lessons.AsNoTracking()
            .Where(item => moduleIds.Contains(item.ModuleId))
            .GroupBy(item => item.ModuleId)
            .Select(group => new { ModuleId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.ModuleId, item => item.Count);
        var questionCounts = await db.QuestionModules.AsNoTracking()
            .Where(item => moduleIds.Contains(item.ModuleId))
            .GroupBy(item => item.ModuleId)
            .Select(group => new { ModuleId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.ModuleId, item => item.Count);

        var stats = new AdminModuleStatsResponse(
            await db.Modules.CountAsync(),
            await db.Modules.CountAsync(item => item.Status == "published"),
            await db.Modules.CountAsync(item => item.Status == "draft"),
            await db.Modules.CountAsync(item => item.Status == "archived"));

        var paths = await GetPathOptions();
        var items = rows.Select(item => new AdminModuleListItemResponse(
            item.Module.Id,
            item.Path.Id,
            item.Path.Name,
            item.Certification,
            item.Module.Slug,
            item.Module.Name,
            item.Module.Description,
            item.Module.SortOrder,
            item.Module.Status,
            lessonCounts.GetValueOrDefault(item.Module.Id),
            questionCounts.GetValueOrDefault(item.Module.Id),
            item.Module.UpdatedAt)).ToList();

        return Ok(new AdminModulePageResponse(items, stats, paths));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<AdminModuleDetailResponse>> GetModule(long id)
    {
        var response = await FindModule(id);
        return response is null ? NotFound(new ApiError("Module was not found.")) : Ok(response);
    }

    [HttpPost]
    public async Task<ActionResult<AdminModuleDetailResponse>> CreateModule(AdminModuleUpsertRequest request)
    {
        var validation = await Validate(request);
        if (validation is not null) return BadRequest(new ApiError(validation));

        var certification = await db.Certifications.SingleAsync(item => item.Code == request.Certification.Trim().ToUpperInvariant());
        await using var transaction = await db.Database.BeginTransactionAsync();
        var module = new LearningModule
        {
            LearningPathId = request.LearningPathId,
            Slug = NormalizeSlug(request.Slug),
            Name = request.Name.Trim(),
            Description = NullIfWhiteSpace(request.Description),
            SortOrder = (await db.Modules.Where(item => item.LearningPathId == request.LearningPathId).MaxAsync(item => (int?)item.SortOrder) ?? 0) + 1,
            Status = request.Status.Trim().ToLowerInvariant(),
        };
        db.Modules.Add(module);
        await db.SaveChangesAsync();
        db.CertificationModules.Add(new CertificationModule
        {
            CertificationId = certification.Id,
            ModuleId = module.Id,
            SortOrder = module.SortOrder,
        });
        await db.SaveChangesAsync();
        await ReorderPath(request.LearningPathId, module.Id, request.SortOrder);
        await transaction.CommitAsync();

        return Created($"/api/admin/modules/{module.Id}", await FindModule(module.Id));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<AdminModuleDetailResponse>> UpdateModule(long id, AdminModuleUpsertRequest request)
    {
        var validation = await Validate(request, id);
        if (validation is not null) return BadRequest(new ApiError(validation));

        var module = await db.Modules.SingleOrDefaultAsync(item => item.Id == id);
        if (module is null) return NotFound(new ApiError("Module was not found."));
        if (module.LearningPathId != request.LearningPathId)
            return BadRequest(new ApiError("Moving a module to another learning path is not supported. Create a new module in that path instead."));

        await using var transaction = await db.Database.BeginTransactionAsync();
        module.Slug = NormalizeSlug(request.Slug);
        module.Name = request.Name.Trim();
        module.Description = NullIfWhiteSpace(request.Description);
        module.Status = request.Status.Trim().ToLowerInvariant();
        module.UpdatedAt = DateTimeOffset.UtcNow;

        var certificationCode = await (
            from mapping in db.CertificationModules
            join certification in db.Certifications on mapping.CertificationId equals certification.Id
            where mapping.ModuleId == id
            select certification.Code)
            .SingleAsync();
        if (!string.Equals(certificationCode, request.Certification.Trim(), StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ApiError("Certification cannot be changed after a module is created."));
        await db.SaveChangesAsync();
        await ReorderPath(module.LearningPathId, module.Id, request.SortOrder);
        await transaction.CommitAsync();

        return Ok(await FindModule(id));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> ArchiveModule(long id)
    {
        var module = await db.Modules.SingleOrDefaultAsync(item => item.Id == id);
        if (module is null) return NotFound(new ApiError("Module was not found."));
        module.Status = "archived";
        module.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string?> Validate(AdminModuleUpsertRequest request, long? currentId = null)
    {
        if (!await db.LearningPaths.AnyAsync(item => item.Id == request.LearningPathId)) return "Learning path was not found.";
        var certification = request.Certification?.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(certification) || !await db.Certifications.AnyAsync(item => item.Code == certification)) return "Certification was not found.";
        var pathCertifications = await (
            from module in db.Modules.AsNoTracking()
            join mapping in db.CertificationModules.AsNoTracking() on module.Id equals mapping.ModuleId
            join item in db.Certifications.AsNoTracking() on mapping.CertificationId equals item.Id
            where module.LearningPathId == request.LearningPathId
            select item.Code)
            .Distinct()
            .ToListAsync();
        if (pathCertifications.Count > 0 && !pathCertifications.Contains(certification)) return "Certification does not match the learning path.";
        if (string.IsNullOrWhiteSpace(request.Name)) return "Module name is required.";
        if (request.Name.Trim().Length > 160) return "Module name cannot exceed 160 characters.";
        var slug = NormalizeSlug(request.Slug);
        if (string.IsNullOrWhiteSpace(slug)) return "Slug is required.";
        if (slug.Length > 120 || !SlugPattern().IsMatch(slug)) return "Slug can contain lowercase letters, numbers and hyphens only.";
        var slugUsed = currentId is null
            ? await db.Modules.AnyAsync(item => item.LearningPathId == request.LearningPathId && item.Slug == slug)
            : await db.Modules.AnyAsync(item => item.LearningPathId == request.LearningPathId && item.Slug == slug && item.Id != currentId.Value);
        if (slugUsed) return "This slug is already used in the learning path.";
        if (request.SortOrder < 1) return "Sort order must be at least 1.";
        var status = request.Status?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(status) || !AllowedStatuses.Contains(status)) return "Status must be draft, published or archived.";
        return null;
    }

    private async Task ReorderPath(long pathId, long moduleId, int requestedOrder)
    {
        var modules = await db.Modules
            .Where(item => item.LearningPathId == pathId)
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Id)
            .ToListAsync();
        var current = modules.Single(item => item.Id == moduleId);
        modules.Remove(current);
        modules.Insert(Math.Clamp(requestedOrder - 1, 0, modules.Count), current);

        for (var index = 0; index < modules.Count; index++) modules[index].SortOrder = -100000 - index;
        await db.SaveChangesAsync();
        for (var index = 0; index < modules.Count; index++) modules[index].SortOrder = index + 1;

        var certificationOrders = await db.CertificationModules
            .Where(item => modules.Select(module => module.Id).Contains(item.ModuleId))
            .ToListAsync();
        foreach (var mapping in certificationOrders)
            mapping.SortOrder = modules.FindIndex(item => item.Id == mapping.ModuleId) + 1;
        await db.SaveChangesAsync();
    }

    private async Task<AdminModuleDetailResponse?> FindModule(long id)
    {
        var row = await (
            from module in db.Modules.AsNoTracking()
            join learningPath in db.LearningPaths.AsNoTracking() on module.LearningPathId equals learningPath.Id
            join certMapping in db.CertificationModules.AsNoTracking() on module.Id equals certMapping.ModuleId
            join certification in db.Certifications.AsNoTracking() on certMapping.CertificationId equals certification.Id
            where module.Id == id
            select new { Module = module, Path = learningPath, Certification = certification.Code })
            .SingleOrDefaultAsync();
        if (row is null) return null;

        return new AdminModuleDetailResponse(
            row.Module.Id,
            row.Path.Id,
            row.Path.Name,
            row.Certification,
            row.Module.Slug,
            row.Module.Name,
            row.Module.Description,
            row.Module.SortOrder,
            row.Module.Status,
            await db.Lessons.CountAsync(item => item.ModuleId == id),
            await db.QuestionModules.CountAsync(item => item.ModuleId == id),
            row.Module.CreatedAt,
            row.Module.UpdatedAt);
    }

    private async Task<List<AdminLearningPathOptionResponse>> GetPathOptions()
    {
        var rows = await (
            from path in db.LearningPaths.AsNoTracking()
            join module in db.Modules.AsNoTracking() on path.Id equals module.LearningPathId
            join certMapping in db.CertificationModules.AsNoTracking() on module.Id equals certMapping.ModuleId
            join certification in db.Certifications.AsNoTracking() on certMapping.CertificationId equals certification.Id
            orderby path.SortOrder, path.Name
            select new AdminLearningPathOptionResponse(path.Id, path.Name, certification.Code))
            .ToListAsync();
        return rows.DistinctBy(item => item.Id).ToList();
    }

    private static string NormalizeSlug(string? value) => value?.Trim().ToLowerInvariant() ?? string.Empty;
    private static string? NullIfWhiteSpace(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();
}
