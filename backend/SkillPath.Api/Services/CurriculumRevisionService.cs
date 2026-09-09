using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Contracts;
using SkillPath.Api.Data;
using SkillPath.Api.Models;

namespace SkillPath.Api.Services;

public sealed class CurriculumRevisionService(SkillPathDbContext db)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public Task CaptureModule(long moduleId, string changeType, Guid? changedByUserId) =>
        Capture("module", moduleId, changeType, changedByUserId);

    public Task CaptureLesson(long lessonId, string changeType, Guid? changedByUserId) =>
        Capture("lesson", lessonId, changeType, changedByUserId);

    public async Task<IReadOnlyList<ContentRevisionResponse>> GetHistory(string entityType, long entityId)
    {
        return await (
                from revision in db.ContentRevisions.AsNoTracking()
                join user in db.Users.AsNoTracking() on revision.ChangedByUserId equals user.Id into users
                from user in users.DefaultIfEmpty()
                where revision.EntityType == entityType && revision.EntityId == entityId
                orderby revision.Version descending
                select new ContentRevisionResponse(
                    revision.Version,
                    revision.ChangeType,
                    revision.SnapshotJson,
                    revision.ChangedByUserId,
                    user == null ? null : user.DisplayName,
                    revision.ChangedAt))
            .ToListAsync();
    }

    public async Task EnsureInitialRevisions()
    {
        var revisedModules = await db.ContentRevisions
            .Where(item => item.EntityType == "module")
            .Select(item => item.EntityId)
            .Distinct()
            .ToListAsync();
        var revisedLessons = await db.ContentRevisions
            .Where(item => item.EntityType == "lesson")
            .Select(item => item.EntityId)
            .Distinct()
            .ToListAsync();

        var moduleIds = await db.Modules.AsNoTracking()
            .Where(item => !revisedModules.Contains(item.Id))
            .Select(item => item.Id)
            .ToListAsync();
        foreach (var id in moduleIds) await CaptureModule(id, "seeded", null);

        var lessonIds = await db.Lessons.AsNoTracking()
            .Where(item => !revisedLessons.Contains(item.Id))
            .Select(item => item.Id)
            .ToListAsync();
        foreach (var id in lessonIds) await CaptureLesson(id, "seeded", null);
    }

    private async Task Capture(string entityType, long entityId, string changeType, Guid? changedByUserId)
    {
        var snapshot = entityType switch
        {
            "module" => await ModuleSnapshot(entityId),
            "lesson" => await LessonSnapshot(entityId),
            _ => throw new ArgumentOutOfRangeException(nameof(entityType)),
        };
        var nextVersion = (await db.ContentRevisions
            .Where(item => item.EntityType == entityType && item.EntityId == entityId)
            .MaxAsync(item => (int?)item.Version) ?? 0) + 1;
        db.ContentRevisions.Add(new ContentRevision
        {
            EntityType = entityType,
            EntityId = entityId,
            Version = nextVersion,
            ChangeType = changeType,
            SnapshotJson = snapshot,
            ChangedByUserId = changedByUserId,
        });
        await db.SaveChangesAsync();
    }

    private async Task<string> ModuleSnapshot(long id)
    {
        var module = await db.Modules.AsNoTracking().SingleAsync(item => item.Id == id);
        return JsonSerializer.Serialize(new
        {
            module.Id,
            module.LearningPathId,
            module.Slug,
            module.Name,
            module.Description,
            module.SortOrder,
            module.Status,
            module.CreatedAt,
            module.UpdatedAt,
        }, JsonOptions);
    }

    private async Task<string> LessonSnapshot(long id)
    {
        var lesson = await db.Lessons.AsNoTracking().SingleAsync(item => item.Id == id);
        return JsonSerializer.Serialize(new
        {
            lesson.Id,
            lesson.ModuleId,
            lesson.Slug,
            lesson.Title,
            lesson.Summary,
            lesson.Content,
            lesson.EstimatedMinutes,
            lesson.SortOrder,
            lesson.Status,
            lesson.CreatedAt,
            lesson.UpdatedAt,
        }, JsonOptions);
    }
}
