using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Contracts;
using SkillPath.Api.Data;
using SkillPath.Api.Models;
using SkillPath.Api.Services;

namespace SkillPath.Api.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/admin/lessons")]
public sealed partial class AdminLessonsController(
    SkillPathDbContext db,
    CurriculumRevisionService revisions) : ControllerBase
{
    private static readonly HashSet<string> AllowedStatuses = ["draft", "published", "archived"];

    [HttpGet]
    public async Task<ActionResult<AdminLessonPageResponse>> GetLessons(
        [FromQuery] string? module = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        module = module?.Trim();
        status = status?.Trim().ToLowerInvariant();
        search = search?.Trim();

        var baseQuery =
            from lesson in db.Lessons.AsNoTracking()
            join learningModule in db.Modules.AsNoTracking() on lesson.ModuleId equals learningModule.Id
            join path in db.LearningPaths.AsNoTracking() on learningModule.LearningPathId equals path.Id
            join certificationMapping in db.CertificationModules.AsNoTracking() on learningModule.Id equals certificationMapping.ModuleId
            join certification in db.Certifications.AsNoTracking() on certificationMapping.CertificationId equals certification.Id
            select new { Lesson = lesson, Module = learningModule, Path = path, Certification = certification.Code };

        var query = baseQuery;
        if (long.TryParse(module, out var moduleId)) query = query.Where(item => item.Module.Id == moduleId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(item => item.Lesson.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(item => item.Lesson.Title.ToLower().Contains(term) || item.Lesson.Slug.ToLower().Contains(term));
        }

        var rows = await query
            .OrderBy(item => item.Path.Name)
            .ThenBy(item => item.Module.SortOrder)
            .ThenBy(item => item.Lesson.SortOrder)
            .ThenBy(item => item.Lesson.Id)
            .ToListAsync();
        var stats = new AdminLessonStatsResponse(
            await db.Lessons.CountAsync(),
            await db.Lessons.CountAsync(item => item.Status == "published"),
            await db.Lessons.CountAsync(item => item.Status == "draft"),
            await db.Lessons.CountAsync(item => item.Status == "archived"));

        var items = rows.Select(item => new AdminLessonListItemResponse(
            item.Lesson.Id,
            item.Module.Id,
            item.Module.Name,
            item.Path.Name,
            item.Certification,
            item.Lesson.Slug,
            item.Lesson.Title,
            item.Lesson.Summary,
            item.Lesson.EstimatedMinutes,
            item.Lesson.SortOrder,
            item.Lesson.Status,
            item.Lesson.UpdatedAt)).ToList();

        return Ok(new AdminLessonPageResponse(items, stats, await GetModuleOptions()));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<AdminLessonDetailResponse>> GetLesson(long id)
    {
        var response = await FindLesson(id);
        return response is null ? NotFound(new ApiError("Lesson was not found.")) : Ok(response);
    }

    [HttpGet("{id:long}/versions")]
    public async Task<ActionResult<IReadOnlyList<ContentRevisionResponse>>> GetVersions(long id)
    {
        if (!await db.Lessons.AnyAsync(item => item.Id == id)) return NotFound(new ApiError("Lesson was not found."));
        return Ok(await revisions.GetHistory("lesson", id));
    }

    [HttpPost]
    public async Task<ActionResult<AdminLessonDetailResponse>> CreateLesson(AdminLessonUpsertRequest request)
    {
        var validation = await Validate(request);
        if (validation is not null) return BadRequest(new ApiError(validation));

        await using var transaction = await db.Database.BeginTransactionAsync();
        var lesson = new Lesson
        {
            ModuleId = request.ModuleId,
            Slug = NormalizeSlug(request.Slug),
            Title = request.Title.Trim(),
            Summary = NullIfWhiteSpace(request.Summary),
            Content = request.Content.Trim(),
            EstimatedMinutes = request.EstimatedMinutes,
            SortOrder = (await db.Lessons.Where(item => item.ModuleId == request.ModuleId).MaxAsync(item => (int?)item.SortOrder) ?? 0) + 1,
            Status = NormalizeStatus(request.Status),
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();
        var reordered = await ReorderModule(request.ModuleId, lesson.Id, request.SortOrder);
        await CaptureChangedLessons(reordered, lesson.Id, "created");
        await transaction.CommitAsync();

        return Created($"/api/admin/lessons/{lesson.Id}", await FindLesson(lesson.Id));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<AdminLessonDetailResponse>> UpdateLesson(long id, AdminLessonUpsertRequest request)
    {
        var validation = await Validate(request, id);
        if (validation is not null) return BadRequest(new ApiError(validation));
        var lesson = await db.Lessons.SingleOrDefaultAsync(item => item.Id == id);
        if (lesson is null) return NotFound(new ApiError("Lesson was not found."));
        if (lesson.ModuleId != request.ModuleId)
            return BadRequest(new ApiError("Moving a lesson to another module is not supported. Create a new lesson in that module instead."));

        var oldStatus = lesson.Status;
        var contentChanged = lesson.Slug != NormalizeSlug(request.Slug) ||
            lesson.Title != request.Title.Trim() ||
            lesson.Summary != NullIfWhiteSpace(request.Summary) ||
            lesson.Content != request.Content.Trim() ||
            lesson.EstimatedMinutes != request.EstimatedMinutes ||
            lesson.Status != NormalizeStatus(request.Status);

        await using var transaction = await db.Database.BeginTransactionAsync();
        lesson.Slug = NormalizeSlug(request.Slug);
        lesson.Title = request.Title.Trim();
        lesson.Summary = NullIfWhiteSpace(request.Summary);
        lesson.Content = request.Content.Trim();
        lesson.EstimatedMinutes = request.EstimatedMinutes;
        lesson.Status = NormalizeStatus(request.Status);
        if (contentChanged) lesson.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        var reordered = await ReorderModule(lesson.ModuleId, lesson.Id, request.SortOrder);
        if (contentChanged || reordered.Contains(lesson.Id))
            await CaptureChangedLessons(reordered, lesson.Id, ChangeType(oldStatus, lesson.Status, contentChanged));
        await transaction.CommitAsync();

        return Ok(await FindLesson(id));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> ArchiveLesson(long id)
    {
        var lesson = await db.Lessons.SingleOrDefaultAsync(item => item.Id == id);
        if (lesson is null) return NotFound(new ApiError("Lesson was not found."));
        if (lesson.Status == "archived") return NoContent();
        lesson.Status = "archived";
        lesson.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        await revisions.CaptureLesson(id, "archived", CurrentUserId());
        return NoContent();
    }

    private async Task<string?> Validate(AdminLessonUpsertRequest request, long? currentId = null)
    {
        if (!await db.Modules.AnyAsync(item => item.Id == request.ModuleId)) return "Module was not found.";
        if (string.IsNullOrWhiteSpace(request.Title)) return "Lesson title is required.";
        if (request.Title.Trim().Length > 200) return "Lesson title cannot exceed 200 characters.";
        if (request.Summary?.Trim().Length > 1000) return "Summary cannot exceed 1000 characters.";
        if (string.IsNullOrWhiteSpace(request.Content)) return "Lesson content is required.";
        if (request.Content.Trim().Length > 200000) return "Lesson content cannot exceed 200000 characters.";
        if (request.EstimatedMinutes is < 1 or > 480) return "Estimated time must be between 1 and 480 minutes.";
        if (request.SortOrder < 1) return "Sort order must be at least 1.";
        var slug = NormalizeSlug(request.Slug);
        if (string.IsNullOrWhiteSpace(slug)) return "Slug is required.";
        if (slug.Length > 140 || !SlugPattern().IsMatch(slug)) return "Slug can contain lowercase letters, numbers and hyphens only.";
        var slugUsed = currentId is null
            ? await db.Lessons.AnyAsync(item => item.ModuleId == request.ModuleId && item.Slug == slug)
            : await db.Lessons.AnyAsync(item => item.ModuleId == request.ModuleId && item.Slug == slug && item.Id != currentId.Value);
        if (slugUsed) return "This slug is already used in the module.";
        if (!AllowedStatuses.Contains(NormalizeStatus(request.Status))) return "Status must be draft, published or archived.";
        return null;
    }

    private async Task<IReadOnlyList<long>> ReorderModule(long moduleId, long lessonId, int requestedOrder)
    {
        var lessons = await db.Lessons
            .Where(item => item.ModuleId == moduleId)
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Id)
            .ToListAsync();
        var originalOrders = lessons.ToDictionary(item => item.Id, item => item.SortOrder);
        var current = lessons.Single(item => item.Id == lessonId);
        lessons.Remove(current);
        lessons.Insert(Math.Clamp(requestedOrder - 1, 0, lessons.Count), current);

        for (var index = 0; index < lessons.Count; index++) lessons[index].SortOrder = -100000 - index;
        await db.SaveChangesAsync();
        var changedAt = DateTimeOffset.UtcNow;
        for (var index = 0; index < lessons.Count; index++)
        {
            lessons[index].SortOrder = index + 1;
            if (originalOrders[lessons[index].Id] != lessons[index].SortOrder) lessons[index].UpdatedAt = changedAt;
        }
        await db.SaveChangesAsync();

        return lessons.Where(item => originalOrders[item.Id] != item.SortOrder).Select(item => item.Id).ToList();
    }

    private async Task CaptureChangedLessons(IReadOnlyList<long> reordered, long currentId, string currentChangeType)
    {
        var ids = reordered.Append(currentId).Distinct().ToList();
        foreach (var id in ids)
            await revisions.CaptureLesson(id, id == currentId ? currentChangeType : "reordered", CurrentUserId());
    }

    private async Task<AdminLessonDetailResponse?> FindLesson(long id)
    {
        return await (
                from lesson in db.Lessons.AsNoTracking()
                join module in db.Modules.AsNoTracking() on lesson.ModuleId equals module.Id
                join path in db.LearningPaths.AsNoTracking() on module.LearningPathId equals path.Id
                join certificationMapping in db.CertificationModules.AsNoTracking() on module.Id equals certificationMapping.ModuleId
                join certification in db.Certifications.AsNoTracking() on certificationMapping.CertificationId equals certification.Id
                where lesson.Id == id
                select new AdminLessonDetailResponse(
                    lesson.Id,
                    module.Id,
                    module.Name,
                    path.Name,
                    certification.Code,
                    lesson.Slug,
                    lesson.Title,
                    lesson.Summary,
                    lesson.Content,
                    lesson.EstimatedMinutes,
                    lesson.SortOrder,
                    lesson.Status,
                    lesson.CreatedAt,
                    lesson.UpdatedAt))
            .SingleOrDefaultAsync();
    }

    private async Task<List<AdminLessonModuleOptionResponse>> GetModuleOptions()
    {
        var rows = await (
                from module in db.Modules.AsNoTracking()
                join path in db.LearningPaths.AsNoTracking() on module.LearningPathId equals path.Id
                join certificationMapping in db.CertificationModules.AsNoTracking() on module.Id equals certificationMapping.ModuleId
                join certification in db.Certifications.AsNoTracking() on certificationMapping.CertificationId equals certification.Id
                orderby path.Name, module.SortOrder, module.Name
                select new AdminLessonModuleOptionResponse(
                    module.Id,
                    path.Id,
                    path.Name,
                    certification.Code,
                    module.Name,
                    module.SortOrder))
            .ToListAsync();
        return rows.DistinctBy(item => item.Id).ToList();
    }

    private static string ChangeType(string oldStatus, string newStatus, bool contentChanged) =>
        oldStatus != newStatus
            ? newStatus switch
            {
                "published" => "published",
                "draft" => "unpublished",
                "archived" => "archived",
                _ => "updated",
            }
            : contentChanged ? "updated" : "reordered";

    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static string NormalizeSlug(string? value) => value?.Trim().ToLowerInvariant() ?? string.Empty;
    private static string NormalizeStatus(string? value) => value?.Trim().ToLowerInvariant() ?? string.Empty;
    private static string? NullIfWhiteSpace(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();
}
