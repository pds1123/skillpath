using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Contracts;
using SkillPath.Api.Data;
using SkillPath.Api.Models;
using SkillPath.Api.Services;

namespace SkillPath.Api.Controllers;

[ApiController]
[Route("api/exams")]
public sealed class ExamsController(SkillPathDbContext db) : ControllerBase
{
    [HttpPost("grade")]
    public async Task<ActionResult<GradeExamResponse>> Grade(GradeExamRequest request)
    {
        if (request.DurationSeconds < 0) return BadRequest(new ApiError("Duration cannot be negative."));
        if (request.Answers.Count == 0) return BadRequest(new ApiError("Submit at least one exam answer."));
        if (request.Answers.Select(answer => answer.QuestionId).Distinct().Count() != request.Answers.Count)
            return BadRequest(new ApiError("An exam cannot contain duplicate questions."));

        var certificationCode = request.Certification.Trim().ToUpperInvariant();
        var certification = await db.Certifications.AsNoTracking().SingleOrDefaultAsync(item => item.Code == certificationCode);
        if (certification is null) return NotFound(new ApiError("Certification was not found."));

        var ids = request.Answers.Select(answer => answer.QuestionId).ToList();
        var questionRows = await (
                from question in db.Questions.AsNoTracking()
                join mapping in db.CertificationQuestions.AsNoTracking() on question.Id equals mapping.QuestionId
                where mapping.CertificationId == certification.Id && ids.Contains(question.Id)
                select new { Question = question, Domain = mapping.DomainName ?? "General" })
            .ToListAsync();
        if (questionRows.Count != ids.Count) return BadRequest(new ApiError("One or more questions do not belong to this certification."));

        var options = await db.QuestionOptions.AsNoTracking().Where(option => ids.Contains(option.QuestionId)).ToListAsync();
        var optionsByQuestion = options.GroupBy(option => option.QuestionId).ToDictionary(group => group.Key, group => group.ToList());
        var questionById = questionRows.ToDictionary(row => row.Question.Id);
        var results = new List<ExamQuestionResultResponse>();
        var gradesByQuestion = new Dictionary<long, QuestionGradeResult>();
        var domainScores = new Dictionary<string, DomainScoreResponse>();

        foreach (var answer in request.Answers)
        {
            var row = questionById[answer.QuestionId];
            var questionOptions = optionsByQuestion.GetValueOrDefault(answer.QuestionId) ?? [];
            if (!QuestionEngine.TryGrade(
                    row.Question,
                    questionOptions,
                    answer.SelectedAnswers,
                    answer.SelfGrade,
                    answer.InteractionResponse,
                    true,
                    out var grade,
                    out var gradeError))
                return BadRequest(new ApiError($"Question {answer.QuestionId}: {gradeError}"));
            var graded = grade!;
            gradesByQuestion[answer.QuestionId] = graded;
            results.Add(new ExamQuestionResultResponse(
                answer.QuestionId,
                graded.Correct,
                graded.CorrectAnswer,
                graded.CorrectInteraction,
                row.Question.Explanation));

            var current = domainScores.GetValueOrDefault(row.Domain) ?? new DomainScoreResponse(0, 0);
            domainScores[row.Domain] = new DomainScoreResponse(current.Correct + (graded.Correct ? 1 : 0), current.Total + 1);
        }

        Guid? examAttemptId = null;
        var userId = GetUserId();
        if (userId is not null)
        {
            var exam = new ExamAttemptRecord
            {
                UserId = userId.Value,
                CertificationId = certification.Id,
                Status = "completed",
                FinishedAt = DateTimeOffset.UtcNow,
                Score = results.Count(result => result.Correct),
                Total = results.Count,
                DurationSeconds = request.DurationSeconds,
            };
            db.ExamAttempts.Add(exam);

            for (var index = 0; index < request.Answers.Count; index++)
            {
                var answer = request.Answers[index];
                var result = results[index];
                var attempt = new QuestionAttempt
                {
                    UserId = userId.Value,
                    QuestionId = answer.QuestionId,
                    ExamAttemptId = exam.Id,
                    IsCorrect = result.Correct,
                    ResponseData = gradesByQuestion[answer.QuestionId].ResponseData,
                };
                db.QuestionAttempts.Add(attempt);
                db.ExamAttemptQuestions.Add(new ExamAttemptQuestion
                {
                    ExamAttemptId = exam.Id,
                    QuestionId = answer.QuestionId,
                    Position = checked((short)(index + 1)),
                    QuestionAttemptId = attempt.Id,
                });
                foreach (var option in (optionsByQuestion.GetValueOrDefault(answer.QuestionId) ?? [])
                             .Where(option => (answer.SelectedAnswers ?? []).Contains(option.OptionKey, StringComparer.OrdinalIgnoreCase)))
                    db.QuestionAttemptSelections.Add(new QuestionAttemptSelection { QuestionAttemptId = attempt.Id, QuestionOptionId = option.Id });
            }
            await db.SaveChangesAsync();
            examAttemptId = exam.Id;
        }

        return Ok(new GradeExamResponse(
            examAttemptId,
            results.Count(result => result.Correct),
            results.Count,
            domainScores,
            results));
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
