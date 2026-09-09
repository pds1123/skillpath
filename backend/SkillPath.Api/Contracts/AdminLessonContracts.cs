namespace SkillPath.Api.Contracts;

public sealed record AdminLessonStatsResponse(
    int Total,
    int Published,
    int Draft,
    int Archived);

public sealed record AdminLessonModuleOptionResponse(
    long Id,
    long LearningPathId,
    string LearningPath,
    string Certification,
    string Name,
    int SortOrder);

public sealed record AdminLessonListItemResponse(
    long Id,
    long ModuleId,
    string Module,
    string LearningPath,
    string Certification,
    string Slug,
    string Title,
    string? Summary,
    short? EstimatedMinutes,
    int SortOrder,
    string Status,
    DateTimeOffset UpdatedAt);

public sealed record AdminLessonPageResponse(
    IReadOnlyList<AdminLessonListItemResponse> Items,
    AdminLessonStatsResponse Stats,
    IReadOnlyList<AdminLessonModuleOptionResponse> Modules);

public sealed record AdminLessonDetailResponse(
    long Id,
    long ModuleId,
    string Module,
    string LearningPath,
    string Certification,
    string Slug,
    string Title,
    string? Summary,
    string Content,
    short? EstimatedMinutes,
    int SortOrder,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record AdminLessonUpsertRequest(
    long ModuleId,
    string Slug,
    string Title,
    string? Summary,
    string Content,
    short? EstimatedMinutes,
    int SortOrder,
    string Status);
