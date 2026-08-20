using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Contracts;
using SkillPath.Api.Data;
using SkillPath.Api.Models;

namespace SkillPath.Api.Controllers;

[ApiController]
[Route("api/questions")]
public sealed class QuestionsController(SkillPathDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<QuestionPageResponse>> GetQuestions(
        [FromQuery] string certification = "AZ-900",
        [FromQuery] string? domain = null,
        [FromQuery] string? mode = null,
        [FromQuery] int offset = 0,
        [FromQuery] int limit = 50)
    {
        certification = certification.Trim().ToUpperInvariant();
        offset = Math.Max(offset, 0);
        limit = Math.Clamp(limit, 1, 100);

        var query =
            from question in db.Questions.AsNoTracking()
            join mapping in db.CertificationQuestions.AsNoTracking() on question.Id equals mapping.QuestionId
            join cert in db.Certifications.AsNoTracking() on mapping.CertificationId equals cert.Id
            where cert.Code == certification && question.Status == "published"
            select new { Question = question, Certification = cert.Code, Domain = mapping.DomainName ?? "General" };

        if (!string.IsNullOrWhiteSpace(domain)) query = query.Where(item => item.Domain == domain);
        if (!string.IsNullOrWhiteSpace(mode)) query = query.Where(item => item.Question.Mode == mode);

        var total = await query.CountAsync();
        var rows = await query
            .OrderBy(item => item.Question.Id)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();
        var responses = await MapQuestions(rows.Select(row => (row.Question, row.Certification, row.Domain)).ToList());

        return Ok(new QuestionPageResponse(responses, total, offset, limit));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<QuestionBankSummaryResponse>> GetSummary([FromQuery] string certification = "AZ-900")
    {
        certification = certification.Trim().ToUpperInvariant();
        var domains = await (
                from mapping in db.CertificationQuestions.AsNoTracking()
                join cert in db.Certifications.AsNoTracking() on mapping.CertificationId equals cert.Id
                join question in db.Questions.AsNoTracking() on mapping.QuestionId equals question.Id
                where cert.Code == certification && question.Status == "published"
                select mapping.DomainName ?? "General")
            .ToListAsync();

        if (domains.Count == 0) return NotFound(new ApiError("Certification question bank was not found."));
        return Ok(new QuestionBankSummaryResponse(certification, domains.Count, domains.Distinct().Order().ToList()));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<QuestionResponse>> GetQuestion(long id)
    {
        var row = await (
                from question in db.Questions.AsNoTracking()
                join mapping in db.CertificationQuestions.AsNoTracking() on question.Id equals mapping.QuestionId
                join cert in db.Certifications.AsNoTracking() on mapping.CertificationId equals cert.Id
                where question.Id == id && question.Status == "published"
                select new { Question = question, Certification = cert.Code, Domain = mapping.DomainName ?? "General" })
            .FirstOrDefaultAsync();

        if (row is null) return NotFound(new ApiError("Question was not found."));
        return Ok((await MapQuestions([(row.Question, row.Certification, row.Domain)])).Single());
    }

    [HttpPost("{id:long}/attempts")]
    public async Task<ActionResult<SubmitAnswerResponse>> SubmitAnswer(long id, SubmitAnswerRequest request)
    {
        if (request.DurationSeconds is < 0)
            return BadRequest(new ApiError("Duration cannot be negative."));

        var question = await db.Questions.AsNoTracking().SingleOrDefaultAsync(item => item.Id == id && item.Status == "published");
        if (question is null) return NotFound(new ApiError("Question was not found."));

        var options = await db.QuestionOptions.AsNoTracking()
            .Where(option => option.QuestionId == id)
            .OrderBy(option => option.SortOrder)
            .ToListAsync();
        var selectedKeys = (request.SelectedAnswers ?? [])
            .Select(value => value.Trim().ToUpperInvariant())
            .Where(value => value.Length > 0)
            .Distinct()
            .Order()
            .ToList();
        var validKeys = options.Select(option => option.OptionKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (selectedKeys.Any(key => !validKeys.Contains(key)))
            return BadRequest(new ApiError("One or more selected answers are invalid."));

        var correctKeys = options.Where(option => option.IsCorrect).Select(option => option.OptionKey).Order().ToList();
        bool correct;
        if (request.SelfGrade is not null)
        {
            if (question.Mode == "quiz") return BadRequest(new ApiError("Quiz questions must be graded by selected answers."));
            correct = request.SelfGrade.Value;
        }
        else
        {
            if (selectedKeys.Count == 0) return BadRequest(new ApiError("Select at least one answer."));
            correct = selectedKeys.SequenceEqual(correctKeys, StringComparer.OrdinalIgnoreCase);
        }

        Guid? attemptId = null;
        var userId = GetUserId();
        if (userId is not null)
        {
            if (request.PracticeSessionId is not null &&
                !await db.PracticeSessions.AnyAsync(session => session.Id == request.PracticeSessionId && session.UserId == userId))
                return BadRequest(new ApiError("Practice session was not found."));

            var attempt = new QuestionAttempt
            {
                UserId = userId.Value,
                QuestionId = id,
                PracticeSessionId = request.PracticeSessionId,
                IsCorrect = correct,
                ResponseData = request.SelfGrade is null ? null : JsonSerializer.Serialize(new { selfGrade = request.SelfGrade }),
                DurationSeconds = request.DurationSeconds,
            };
            db.QuestionAttempts.Add(attempt);
            foreach (var option in options.Where(option => selectedKeys.Contains(option.OptionKey, StringComparer.OrdinalIgnoreCase)))
                db.QuestionAttemptSelections.Add(new QuestionAttemptSelection { QuestionAttemptId = attempt.Id, QuestionOptionId = option.Id });
            await db.SaveChangesAsync();
            attemptId = attempt.Id;
        }

        return Ok(new SubmitAnswerResponse(attemptId, correct, correctKeys, question.Explanation));
    }

    [HttpPost("{id:long}/reveal")]
    public async Task<ActionResult<RevealAnswerResponse>> RevealAnswer(long id)
    {
        var question = await db.Questions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id && item.Status == "published");
        if (question is null) return NotFound(new ApiError("Question was not found."));

        var correctKeys = await db.QuestionOptions.AsNoTracking()
            .Where(option => option.QuestionId == id && option.IsCorrect)
            .OrderBy(option => option.SortOrder)
            .Select(option => option.OptionKey)
            .ToListAsync();

        return Ok(new RevealAnswerResponse(correctKeys, question.Explanation));
    }

    private async Task<List<QuestionResponse>> MapQuestions(IReadOnlyList<(Question Question, string Certification, string Domain)> rows)
    {
        var ids = rows.Select(row => row.Question.Id).ToList();
        var options = await db.QuestionOptions.AsNoTracking()
            .Where(option => ids.Contains(option.QuestionId))
            .OrderBy(option => option.SortOrder)
            .ToListAsync();
        var optionsByQuestion = options.GroupBy(option => option.QuestionId).ToDictionary(group => group.Key, group => group.ToList());

        return rows.Select(row =>
        {
            var questionOptions = optionsByQuestion.GetValueOrDefault(row.Question.Id) ?? [];
            return new QuestionResponse(
                row.Question.Id,
                row.Question.LegacyId,
                row.Certification,
                row.Question.QuestionType,
                row.Question.Prompt,
                questionOptions.ToDictionary(option => option.OptionKey, option => option.OptionText),
                row.Domain,
                row.Question.Mode,
                questionOptions.Count(option => option.IsCorrect) > 1,
                ParseOptionalJson(row.Question.TableData));
        }).ToList();
    }

    private static JsonElement? ParseOptionalJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
