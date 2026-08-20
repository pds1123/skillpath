namespace SkillPath.Api.Models;

public sealed class UserPreference
{
    public Guid UserId { get; set; }
    public string TimeZone { get; set; } = "Pacific/Auckland";
    public string Theme { get; set; } = "system";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class LearningArea
{
    public long Id { get; set; }
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public string Status { get; set; } = "planned";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class LearningPath
{
    public long Id { get; set; }
    public long LearningAreaId { get; set; }
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string Level { get; set; } = "beginner";
    public int SortOrder { get; set; }
    public string Status { get; set; } = "draft";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class LearningModule
{
    public long Id { get; set; }
    public long LearningPathId { get; set; }
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public string Status { get; set; } = "draft";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Lesson
{
    public long Id { get; set; }
    public long ModuleId { get; set; }
    public required string Slug { get; set; }
    public required string Title { get; set; }
    public string? Summary { get; set; }
    public required string Content { get; set; }
    public short? EstimatedMinutes { get; set; }
    public int SortOrder { get; set; }
    public string Status { get; set; } = "draft";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Certification
{
    public long Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public required string Provider { get; set; }
    public short MockQuestionCount { get; set; }
    public string Status { get; set; } = "active";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class CertificationModule
{
    public long CertificationId { get; set; }
    public long ModuleId { get; set; }
    public int SortOrder { get; set; }
    public decimal? Weight { get; set; }
}

public sealed class Question
{
    public long Id { get; set; }
    public required string SourceKey { get; set; }
    public int LegacyId { get; set; }
    public required string QuestionType { get; set; }
    public string ContentType { get; set; } = "practice_question";
    public required string Prompt { get; set; }
    public string? Explanation { get; set; }
    public string? InteractionData { get; set; }
    public string? TableData { get; set; }
    public string Mode { get; set; } = "quiz";
    public string Difficulty { get; set; } = "beginner";
    public string Status { get; set; } = "published";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class QuestionOption
{
    public long Id { get; set; }
    public long QuestionId { get; set; }
    public required string OptionKey { get; set; }
    public required string OptionText { get; set; }
    public short SortOrder { get; set; }
    public bool IsCorrect { get; set; }
}

public sealed class QuestionModule
{
    public long QuestionId { get; set; }
    public long ModuleId { get; set; }
    public bool IsPrimary { get; set; }
}

public sealed class CertificationQuestion
{
    public long CertificationId { get; set; }
    public long QuestionId { get; set; }
    public string? DomainName { get; set; }
}

public sealed class UserPathEnrollment
{
    public Guid UserId { get; set; }
    public long LearningPathId { get; set; }
    public long? CurrentLessonId { get; set; }
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastActivityAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
}

public sealed class LessonCompletion
{
    public Guid UserId { get; set; }
    public long LessonId { get; set; }
    public DateTimeOffset CompletedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class PracticeSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public long? CertificationId { get; set; }
    public long? LearningPathId { get; set; }
    public required string Mode { get; set; }
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? FinishedAt { get; set; }
}

public sealed class ExamAttemptRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public long CertificationId { get; set; }
    public string Status { get; set; } = "in_progress";
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? FinishedAt { get; set; }
    public int? Score { get; set; }
    public int? Total { get; set; }
    public int? DurationSeconds { get; set; }
}

public sealed class QuestionAttempt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public long QuestionId { get; set; }
    public Guid? PracticeSessionId { get; set; }
    public Guid? ExamAttemptId { get; set; }
    public bool? IsCorrect { get; set; }
    public string? ResponseData { get; set; }
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;
    public int? DurationSeconds { get; set; }
}

public sealed class QuestionAttemptSelection
{
    public Guid QuestionAttemptId { get; set; }
    public long QuestionOptionId { get; set; }
}

public sealed class ExamAttemptQuestion
{
    public Guid ExamAttemptId { get; set; }
    public long QuestionId { get; set; }
    public short Position { get; set; }
    public Guid? QuestionAttemptId { get; set; }
}
