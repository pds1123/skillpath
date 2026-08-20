using System.Text.Json;

namespace SkillPath.Api.Contracts;

public sealed record QuestionPageResponse(IReadOnlyList<QuestionResponse> Items, int Total, int Offset, int Limit);

public sealed record QuestionResponse(
    long Id,
    int LegacyId,
    string Certification,
    string Type,
    string Question,
    IReadOnlyDictionary<string, string> Options,
    string Domain,
    string Mode,
    bool MultipleSelect,
    JsonElement? Table);

public sealed record QuestionBankSummaryResponse(
    string Certification,
    int Total,
    IReadOnlyList<string> Domains);

public sealed record SubmitAnswerRequest(
    IReadOnlyList<string>? SelectedAnswers,
    bool? SelfGrade,
    Guid? PracticeSessionId,
    int? DurationSeconds);

public sealed record SubmitAnswerResponse(
    Guid? AttemptId,
    bool Correct,
    IReadOnlyList<string> CorrectAnswer,
    string? Explanation);

public sealed record RevealAnswerResponse(
    IReadOnlyList<string> CorrectAnswer,
    string? Explanation);

public sealed record GradeExamRequest(
    string Certification,
    int DurationSeconds,
    IReadOnlyList<ExamAnswerRequest> Answers);

public sealed record ExamAnswerRequest(long QuestionId, IReadOnlyList<string> SelectedAnswers, bool? SelfGrade);

public sealed record GradeExamResponse(
    Guid? AttemptId,
    int Score,
    int Total,
    IReadOnlyDictionary<string, DomainScoreResponse> DomainScores,
    IReadOnlyList<ExamQuestionResultResponse> Results);

public sealed record DomainScoreResponse(int Correct, int Total);

public sealed record ExamQuestionResultResponse(
    long QuestionId,
    bool Correct,
    IReadOnlyList<string> CorrectAnswer,
    string? Explanation);
