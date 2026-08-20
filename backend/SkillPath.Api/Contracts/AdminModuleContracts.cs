namespace SkillPath.Api.Contracts;

public sealed record AdminModuleStatsResponse(
    int Total,
    int Published,
    int Draft,
    int Archived);

public sealed record AdminLearningPathOptionResponse(
    long Id,
    string Name,
    string Certification);

public sealed record AdminModuleListItemResponse(
    long Id,
    long LearningPathId,
    string LearningPath,
    string Certification,
    string Slug,
    string Name,
    string? Description,
    int SortOrder,
    string Status,
    int LessonCount,
    int QuestionCount,
    DateTimeOffset UpdatedAt);

public sealed record AdminModulePageResponse(
    IReadOnlyList<AdminModuleListItemResponse> Items,
    AdminModuleStatsResponse Stats,
    IReadOnlyList<AdminLearningPathOptionResponse> Paths);

public sealed record AdminModuleDetailResponse(
    long Id,
    long LearningPathId,
    string LearningPath,
    string Certification,
    string Slug,
    string Name,
    string? Description,
    int SortOrder,
    string Status,
    int LessonCount,
    int QuestionCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record AdminModuleUpsertRequest(
    long LearningPathId,
    string Certification,
    string Slug,
    string Name,
    string? Description,
    int SortOrder,
    string Status);
