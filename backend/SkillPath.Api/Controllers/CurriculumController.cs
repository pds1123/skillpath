using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Contracts;
using SkillPath.Api.Data;

namespace SkillPath.Api.Controllers;

[ApiController]
[Route("api/curriculum")]
public sealed class CurriculumController(SkillPathDbContext db) : ControllerBase
{
    [HttpGet("areas")]
    public async Task<ActionResult<IReadOnlyList<CurriculumAreaResponse>>> GetAreas()
    {
        var areas = await db.LearningAreas.AsNoTracking()
            .Where(item => item.Status == "published")
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Id)
            .ToListAsync();
        var areaIds = areas.Select(item => item.Id).ToList();
        var paths = await db.LearningPaths.AsNoTracking()
            .Where(item => areaIds.Contains(item.LearningAreaId) && item.Status == "published")
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Id)
            .ToListAsync();

        return Ok(areas.Select(area => new CurriculumAreaResponse(
            area.Id,
            area.Slug,
            area.Name,
            area.Description,
            paths.Where(path => path.LearningAreaId == area.Id)
                .Select(path => new CurriculumPathSummaryResponse(
                    path.Id,
                    path.Slug,
                    path.Name,
                    path.Description,
                    path.Level,
                    path.SortOrder))
                .ToList()))
            .ToList());
    }

    [HttpGet("paths/{slug}")]
    public async Task<ActionResult<CurriculumPathResponse>> GetPath(string slug)
    {
        slug = slug.Trim().ToLowerInvariant();
        var row = await (
                from path in db.LearningPaths.AsNoTracking()
                join area in db.LearningAreas.AsNoTracking() on path.LearningAreaId equals area.Id
                where path.Slug == slug && path.Status == "published" && area.Status == "published"
                select new { Path = path, Area = area })
            .SingleOrDefaultAsync();
        if (row is null) return NotFound(new ApiError("Learning path was not found."));

        var modules = await db.Modules.AsNoTracking()
            .Where(item => item.LearningPathId == row.Path.Id && item.Status == "published")
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Id)
            .ToListAsync();
        var moduleIds = modules.Select(item => item.Id).ToList();
        var lessons = await db.Lessons.AsNoTracking()
            .Where(item => moduleIds.Contains(item.ModuleId) && item.Status == "published")
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Id)
            .ToListAsync();
        var questionMappings = await (
                from mapping in db.QuestionModules.AsNoTracking()
                join question in db.Questions.AsNoTracking() on mapping.QuestionId equals question.Id
                where moduleIds.Contains(mapping.ModuleId) && question.Status == "published"
                select new { mapping.ModuleId, mapping.QuestionId })
            .ToListAsync();

        var responses = modules.Select(module => new CurriculumModuleResponse(
            module.Id,
            module.Slug,
            module.Name,
            module.Description,
            module.SortOrder,
            lessons.Where(lesson => lesson.ModuleId == module.Id)
                .Select(lesson => new CurriculumLessonResponse(
                    lesson.Id,
                    lesson.Slug,
                    lesson.Title,
                    lesson.Summary,
                    lesson.Content,
                    lesson.EstimatedMinutes,
                    lesson.SortOrder))
                .ToList(),
            questionMappings.Where(mapping => mapping.ModuleId == module.Id)
                .Select(mapping => mapping.QuestionId)
                .Distinct()
                .Order()
                .ToList()))
            .ToList();

        return Ok(new CurriculumPathResponse(
            row.Path.Id,
            row.Path.Slug,
            row.Path.Name,
            row.Path.Description,
            row.Path.Level,
            new CurriculumAreaSummaryResponse(row.Area.Id, row.Area.Slug, row.Area.Name),
            responses));
    }
}
