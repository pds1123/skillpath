using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Contracts;
using SkillPath.Api.Data;
using SkillPath.Api.Models;

namespace SkillPath.Api.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/admin/questions")]
public sealed class AdminQuestionsController(SkillPathDbContext db) : ControllerBase
{
    private static readonly HashSet<string> AllowedTypes = ["multiple_choice", "yes_no", "drag_drop", "hotspot", "self_grade"];
    private static readonly HashSet<string> AllowedContentTypes = ["knowledge_check", "practice_question", "mock_question"];
    private static readonly HashSet<string> AllowedModes = ["quiz", "reveal", "read"];
    private static readonly HashSet<string> AllowedDifficulties = ["beginner", "intermediate", "advanced"];
    private static readonly HashSet<string> AllowedStatuses = ["draft", "published", "archived"];

    [HttpGet]
    public async Task<ActionResult<AdminQuestionPageResponse>> GetQuestions(
        [FromQuery] string? certification = null,
        [FromQuery] string? domain = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int offset = 0,
        [FromQuery] int limit = 25)
    {
        offset = Math.Max(0, offset);
        limit = Math.Clamp(limit, 1, 100);
        certification = certification?.Trim().ToUpperInvariant();
        domain = domain?.Trim();
        status = status?.Trim().ToLowerInvariant();
        search = search?.Trim();

        var baseQuery =
            from question in db.Questions.AsNoTracking()
            join mapping in db.CertificationQuestions.AsNoTracking() on question.Id equals mapping.QuestionId
            join cert in db.Certifications.AsNoTracking() on mapping.CertificationId equals cert.Id
            select new { Question = question, Certification = cert.Code, Domain = mapping.DomainName ?? "General" };

        var certifications = await db.Certifications.AsNoTracking().OrderBy(item => item.Code).Select(item => item.Code).ToListAsync();
        var domains = await baseQuery.Select(item => item.Domain).Distinct().OrderBy(item => item).ToListAsync();
        var stats = new AdminQuestionStatsResponse(
            await db.Questions.CountAsync(),
            await db.Questions.CountAsync(item => item.Status == "published"),
            await db.Questions.CountAsync(item => item.Status == "draft"),
            await db.Questions.CountAsync(item => item.Status == "archived"));

        var query = baseQuery;
        if (!string.IsNullOrWhiteSpace(certification)) query = query.Where(item => item.Certification == certification);
        if (!string.IsNullOrWhiteSpace(domain)) query = query.Where(item => item.Domain == domain);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(item => item.Question.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(item => item.Question.Prompt.ToLower().Contains(term) || item.Question.Id.ToString() == term);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(item => item.Question.Id)
            .Skip(offset)
            .Take(limit)
            .Select(item => new AdminQuestionListItemResponse(
                item.Question.Id,
                item.Question.LegacyId,
                item.Certification,
                item.Domain,
                item.Question.QuestionType,
                item.Question.ContentType,
                item.Question.Prompt,
                item.Question.Difficulty,
                item.Question.Status,
                item.Question.UpdatedAt))
            .ToListAsync();

        return Ok(new AdminQuestionPageResponse(items, total, offset, limit, stats, certifications, domains));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<AdminQuestionDetailResponse>> GetQuestion(long id)
    {
        var response = await FindQuestion(id);
        return response is null ? NotFound(new ApiError("Question was not found.")) : Ok(response);
    }

    [HttpPost]
    public async Task<ActionResult<AdminQuestionDetailResponse>> CreateQuestion(AdminQuestionUpsertRequest request)
    {
        var validation = Validate(request);
        if (validation is not null) return BadRequest(new ApiError(validation));

        var certification = await db.Certifications.SingleOrDefaultAsync(item => item.Code == request.Certification.Trim().ToUpperInvariant());
        if (certification is null) return BadRequest(new ApiError("Certification was not found."));

        await using var transaction = await db.Database.BeginTransactionAsync();
        var nextLegacyId = (await db.Questions.MaxAsync(item => (int?)item.LegacyId) ?? 0) + 1;
        var question = new Question
        {
            SourceKey = $"admin:{Guid.NewGuid():N}",
            LegacyId = nextLegacyId,
            QuestionType = Normalize(request.Type),
            ContentType = Normalize(request.ContentType),
            Prompt = request.Prompt.Trim(),
            Explanation = NullIfWhiteSpace(request.Explanation),
            Mode = Normalize(request.Mode),
            Difficulty = Normalize(request.Difficulty),
            Status = Normalize(request.Status),
        };
        db.Questions.Add(question);
        await db.SaveChangesAsync();

        AddOptions(question.Id, request.Options);
        db.CertificationQuestions.Add(new CertificationQuestion
        {
            CertificationId = certification.Id,
            QuestionId = question.Id,
            DomainName = request.Domain.Trim(),
        });
        await AssignModule(question.Id, certification.Id, request.Domain.Trim());
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Created($"/api/admin/questions/{question.Id}", await FindQuestion(question.Id));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<AdminQuestionDetailResponse>> UpdateQuestion(long id, AdminQuestionUpsertRequest request)
    {
        var validation = Validate(request);
        if (validation is not null) return BadRequest(new ApiError(validation));

        var certification = await db.Certifications.SingleOrDefaultAsync(item => item.Code == request.Certification.Trim().ToUpperInvariant());
        if (certification is null) return BadRequest(new ApiError("Certification was not found."));
        var question = await db.Questions.SingleOrDefaultAsync(item => item.Id == id);
        if (question is null) return NotFound(new ApiError("Question was not found."));

        await using var transaction = await db.Database.BeginTransactionAsync();
        question.QuestionType = Normalize(request.Type);
        question.ContentType = Normalize(request.ContentType);
        question.Prompt = request.Prompt.Trim();
        question.Explanation = NullIfWhiteSpace(request.Explanation);
        question.Mode = Normalize(request.Mode);
        question.Difficulty = Normalize(request.Difficulty);
        question.Status = Normalize(request.Status);
        question.UpdatedAt = DateTimeOffset.UtcNow;

        var mapping = await db.CertificationQuestions.SingleAsync(item => item.QuestionId == id);
        mapping.CertificationId = certification.Id;
        mapping.DomainName = request.Domain.Trim();
        try
        {
            await SyncOptions(id, request.Options);
        }
        catch (InvalidOperationException error)
        {
            return Conflict(new ApiError(error.Message));
        }

        var moduleMappings = await db.QuestionModules.Where(item => item.QuestionId == id).ToListAsync();
        db.QuestionModules.RemoveRange(moduleMappings);
        await AssignModule(id, certification.Id, request.Domain.Trim());
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(await FindQuestion(id));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> ArchiveQuestion(long id)
    {
        var question = await db.Questions.SingleOrDefaultAsync(item => item.Id == id);
        if (question is null) return NotFound(new ApiError("Question was not found."));
        question.Status = "archived";
        question.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<AdminQuestionDetailResponse?> FindQuestion(long id)
    {
        var row = await (
                from question in db.Questions.AsNoTracking()
                join mapping in db.CertificationQuestions.AsNoTracking() on question.Id equals mapping.QuestionId
                join cert in db.Certifications.AsNoTracking() on mapping.CertificationId equals cert.Id
                where question.Id == id
                select new { Question = question, Certification = cert.Code, Domain = mapping.DomainName ?? "General" })
            .SingleOrDefaultAsync();
        if (row is null) return null;
        var options = await db.QuestionOptions.AsNoTracking()
            .Where(item => item.QuestionId == id)
            .OrderBy(item => item.SortOrder)
            .Select(item => new AdminQuestionOptionResponse(item.OptionKey, item.OptionText, item.IsCorrect))
            .ToListAsync();
        return new AdminQuestionDetailResponse(
            row.Question.Id,
            row.Question.LegacyId,
            row.Certification,
            row.Domain,
            row.Question.QuestionType,
            row.Question.ContentType,
            row.Question.Prompt,
            row.Question.Explanation,
            row.Question.Mode,
            row.Question.Difficulty,
            row.Question.Status,
            options,
            row.Question.CreatedAt,
            row.Question.UpdatedAt);
    }

    private static string? Validate(AdminQuestionUpsertRequest request)
    {
        var type = Normalize(request.Type);
        if (request.Prompt.Trim().Length is < 10 or > 10000) return "Question text must be between 10 and 10,000 characters.";
        if (request.Domain.Trim().Length is < 2 or > 160) return "Domain must be between 2 and 160 characters.";
        if (!AllowedTypes.Contains(type)) return "Question type is invalid.";
        if (!AllowedContentTypes.Contains(Normalize(request.ContentType))) return "Content type is invalid.";
        if (!AllowedModes.Contains(Normalize(request.Mode))) return "Question mode is invalid.";
        if (!AllowedDifficulties.Contains(Normalize(request.Difficulty))) return "Difficulty is invalid.";
        if (!AllowedStatuses.Contains(Normalize(request.Status))) return "Status is invalid.";
        if (request.Options.Count > 8) return "A question can have no more than eight options.";
        if (request.Options.Any(option => string.IsNullOrWhiteSpace(option.Key) || option.Key.Trim().Length > 20 || string.IsNullOrWhiteSpace(option.Text)))
            return "Every answer option needs a key and text.";
        if (request.Options.Select(option => option.Key.Trim().ToUpperInvariant()).Distinct().Count() != request.Options.Count)
            return "Answer option keys must be unique.";
        if (type is "multiple_choice" or "yes_no")
        {
            if (request.Options.Count < 2) return "This question type needs at least two answer options.";
            if (!request.Options.Any(option => option.IsCorrect)) return "Select at least one correct answer.";
        }
        return null;
    }

    private void AddOptions(long questionId, IReadOnlyList<AdminQuestionOptionRequest> options)
    {
        foreach (var (option, index) in options.Select((item, index) => (item, index)))
            db.QuestionOptions.Add(new QuestionOption
            {
                QuestionId = questionId,
                OptionKey = option.Key.Trim().ToUpperInvariant(),
                OptionText = option.Text.Trim(),
                SortOrder = checked((short)(index + 1)),
                IsCorrect = option.IsCorrect,
            });
    }

    private async Task SyncOptions(long questionId, IReadOnlyList<AdminQuestionOptionRequest> requested)
    {
        var existing = await db.QuestionOptions.Where(item => item.QuestionId == questionId).ToListAsync();
        var requestedByKey = requested.ToDictionary(item => item.Key.Trim().ToUpperInvariant());
        var removed = existing.Where(item => !requestedByKey.ContainsKey(item.OptionKey)).ToList();
        if (removed.Count > 0)
        {
            var removedIds = removed.Select(item => item.Id).ToList();
            if (await db.QuestionAttemptSelections.AnyAsync(item => removedIds.Contains(item.QuestionOptionId)))
                throw new InvalidOperationException("An answer option used in attempt history cannot be removed.");
            db.QuestionOptions.RemoveRange(removed);
        }

        foreach (var (option, index) in existing.Select((item, index) => (item, index)))
            option.SortOrder = checked((short)(-index - 1));
        await db.SaveChangesAsync();

        foreach (var (option, index) in requested.Select((item, index) => (item, index)))
        {
            var key = option.Key.Trim().ToUpperInvariant();
            var current = existing.SingleOrDefault(item => item.OptionKey == key);
            if (current is null)
            {
                db.QuestionOptions.Add(new QuestionOption
                {
                    QuestionId = questionId,
                    OptionKey = key,
                    OptionText = option.Text.Trim(),
                    SortOrder = checked((short)(index + 1)),
                    IsCorrect = option.IsCorrect,
                });
            }
            else
            {
                current.OptionText = option.Text.Trim();
                current.SortOrder = checked((short)(index + 1));
                current.IsCorrect = option.IsCorrect;
            }
        }
    }

    private async Task AssignModule(long questionId, long certificationId, string domain)
    {
        var moduleId = await (
                from mapping in db.CertificationQuestions.AsNoTracking()
                join questionModule in db.QuestionModules.AsNoTracking() on mapping.QuestionId equals questionModule.QuestionId
                where mapping.CertificationId == certificationId && mapping.DomainName == domain && mapping.QuestionId != questionId
                orderby questionModule.IsPrimary descending
                select (long?)questionModule.ModuleId)
            .FirstOrDefaultAsync();
        if (moduleId is not null)
            db.QuestionModules.Add(new QuestionModule { QuestionId = questionId, ModuleId = moduleId.Value, IsPrimary = true });
    }

    private static string Normalize(string value) => value.Trim().ToLowerInvariant();
    private static string? NullIfWhiteSpace(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
