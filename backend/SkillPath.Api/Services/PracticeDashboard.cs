using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Data;

namespace SkillPath.Api.Services;

public sealed record ModulePracticeStats(long Id, string Slug, string Name, int Practiced, int Correct, int? Accuracy, bool SmallSample);
public sealed record PracticeSnapshot(string Certification, int Practiced, int FirstCorrect, int LatestCorrect,
    int ToReview, int? FirstAccuracy, int? LatestAccuracy, long? LastAttemptAt, IReadOnlyList<ModulePracticeStats> Modules);

public sealed class PracticeDashboard(SkillPathDbContext db)
{
    private sealed record Attempt(long QuestionId, bool Correct, long At);

    public async Task<PracticeSnapshot?> Get(Guid userId, string certification, CancellationToken token)
    {
        var cert = await db.Certifications.AsNoTracking().SingleOrDefaultAsync(c => c.Code == certification && c.Status == "active", token);
        if (cert is null) return null;
        var questionIds = await (from mapping in db.CertificationQuestions.AsNoTracking()
                                 join question in db.Questions.AsNoTracking() on mapping.QuestionId equals question.Id
                                 where mapping.CertificationId == cert.Id && question.Status == "published"
                                 select question.Id).Distinct().ToListAsync(token);
        var modules = await (from mapping in db.CertificationModules.AsNoTracking()
                             join module in db.Modules.AsNoTracking() on mapping.ModuleId equals module.Id
                             join path in db.LearningPaths.AsNoTracking() on module.LearningPathId equals path.Id
                             join area in db.LearningAreas.AsNoTracking() on path.LearningAreaId equals area.Id
                             where mapping.CertificationId == cert.Id && module.Status == "published" && path.Status == "published" && area.Status == "published"
                             orderby mapping.SortOrder, module.SortOrder, module.Id
                             select module).ToListAsync(token);
        var moduleIds = modules.Select(m => m.Id).ToList();
        var links = await db.QuestionModules.AsNoTracking().Where(m => moduleIds.Contains(m.ModuleId) && questionIds.Contains(m.QuestionId)).ToListAsync(token);
        var rows = await db.QuestionAttempts.AsNoTracking().Where(a => a.UserId == userId && a.IsCorrect != null && questionIds.Contains(a.QuestionId))
            .Select(a => new { a.QuestionId, a.IsCorrect, a.SubmittedAt }).ToListAsync(token);
        var attempts = rows.Select(a => new Attempt(a.QuestionId, a.IsCorrect!.Value, a.SubmittedAt.ToUnixTimeMilliseconds())).ToList();
        // Include migrated progress documents; duplicate recordings cannot inflate distinct-question statistics.
        var document = await db.UserProgressDocuments.AsNoTracking().SingleOrDefaultAsync(p => p.UserId == userId, token);
        if (document is not null)
        {
            using var json = JsonDocument.Parse(document.Json);
            if (json.RootElement.ValueKind == JsonValueKind.Object && json.RootElement.TryGetProperty("results", out var results) && results.ValueKind == JsonValueKind.Object)
            {
                var validIds = questionIds.ToHashSet();
                foreach (var item in results.EnumerateObject())
                {
                    if (!long.TryParse(item.Name, out var id) || !validIds.Contains(id) || item.Value.ValueKind != JsonValueKind.Array) continue;
                    foreach (var attempt in item.Value.EnumerateArray())
                        if (attempt.ValueKind == JsonValueKind.Object && attempt.TryGetProperty("correct", out var correct)
                            && correct.ValueKind is JsonValueKind.True or JsonValueKind.False
                            && attempt.TryGetProperty("attemptedAt", out var at) && at.ValueKind == JsonValueKind.Number && at.TryGetInt64(out var timestamp))
                            attempts.Add(new Attempt(id, correct.GetBoolean(), timestamp));
                }
            }
        }
        var questions = attempts.GroupBy(a => a.QuestionId).ToDictionary(g => g.Key, g => g.OrderBy(a => a.At).ToList());
        var firstCorrect = questions.Values.Count(a => a[0].Correct);
        var latestCorrect = questions.Values.Count(a => a[^1].Correct);
        var stats = modules.Select(module =>
        {
            var practiced = links.Where(m => m.ModuleId == module.Id).Select(m => m.QuestionId).Distinct()
                .Where(questions.ContainsKey).Select(id => questions[id][^1]).ToList();
            var correct = practiced.Count(a => a.Correct);
            return new ModulePracticeStats(module.Id, module.Slug, module.Name, practiced.Count, correct,
                Percent(correct, practiced.Count), practiced.Count is > 0 and < 5);
        }).ToList();
        return new PracticeSnapshot(certification, questions.Count, firstCorrect, latestCorrect, questions.Count - latestCorrect,
            Percent(firstCorrect, questions.Count), Percent(latestCorrect, questions.Count),
            attempts.Count == 0 ? null : attempts.Max(a => a.At), stats);
    }

    private static int? Percent(int correct, int count) => count == 0 ? null : (int)Math.Round(100d * correct / count, MidpointRounding.AwayFromZero);
}
