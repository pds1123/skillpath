using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Data;

namespace SkillPath.Api.Services;

public sealed record ExamModuleStats(long Id, string Name, int Total, int Correct, int? Accuracy, bool SmallSample);
public sealed record ExamSnapshot(Guid AttemptId, string Certification, int Score, int Total, int DurationSeconds,
    DateTimeOffset? FinishedAt, IReadOnlyList<ExamModuleStats> Modules);

public sealed class ExamAnalysis(SkillPathDbContext db)
{
    public async Task<ExamSnapshot?> Get(Guid userId, Guid attemptId, CancellationToken token)
    {
        var exam = await db.ExamAttempts.AsNoTracking().SingleOrDefaultAsync(
            e => e.Id == attemptId && e.UserId == userId && e.Status == "completed", token);
        if (exam is null) return null;
        var cert = await db.Certifications.AsNoTracking().SingleAsync(c => c.Id == exam.CertificationId, token);
        var modules = await (from mapping in db.CertificationModules.AsNoTracking()
                             join module in db.Modules.AsNoTracking() on mapping.ModuleId equals module.Id
                             where mapping.CertificationId == cert.Id
                             orderby mapping.SortOrder, module.SortOrder, module.Id
                             select module).ToListAsync(token);
        var answers = await (from item in db.ExamAttemptQuestions.AsNoTracking()
                             join answer in db.QuestionAttempts.AsNoTracking() on item.QuestionAttemptId equals answer.Id
                             where item.ExamAttemptId == attemptId && answer.ExamAttemptId == attemptId && answer.UserId == userId
                             select new { item.QuestionId, answer.IsCorrect }).ToListAsync(token);
        var ids = answers.Select(a => a.QuestionId).ToList();
        var moduleIds = modules.Select(m => m.Id).ToList();
        var links = await db.QuestionModules.AsNoTracking().Where(q => ids.Contains(q.QuestionId) && moduleIds.Contains(q.ModuleId)).ToListAsync(token);
        var stats = modules.Select(module =>
        {
            var questions = links.Where(l => l.ModuleId == module.Id).Select(l => l.QuestionId).ToHashSet();
            var rows = answers.Where(a => questions.Contains(a.QuestionId)).ToList();
            var correct = rows.Count(a => a.IsCorrect == true);
            return new ExamModuleStats(module.Id, module.Name, rows.Count, correct,
                rows.Count == 0 ? null : (int)Math.Round(100d * correct / rows.Count, MidpointRounding.AwayFromZero), rows.Count is > 0 and < 5);
        }).ToList();
        return new ExamSnapshot(exam.Id, cert.Code, exam.Score ?? 0, exam.Total ?? 0, exam.DurationSeconds ?? 0, exam.FinishedAt, stats);
    }
}
