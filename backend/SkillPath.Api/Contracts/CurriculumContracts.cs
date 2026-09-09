namespace SkillPath.Api.Contracts;

public sealed record CurriculumAreaResponse(
    long Id,
    string Slug,
    string Name,
    string? Description,
    IReadOnlyList<CurriculumPathSummaryResponse> Paths);

public sealed record CurriculumPathSummaryResponse(
    long Id,
    string Slug,
    string Name,
    string? Description,
    string Level,
    int SortOrder);

public sealed record CurriculumPathResponse(
    long Id,
    string Slug,
    string Name,
    string? Description,
    string Level,
    CurriculumAreaSummaryResponse Area,
    IReadOnlyList<CurriculumModuleResponse> Modules);

public sealed record CurriculumAreaSummaryResponse(
    long Id,
    string Slug,
    string Name);

public sealed record CurriculumModuleResponse(
    long Id,
    string Slug,
    string Name,
    string? Description,
    int SortOrder,
    IReadOnlyList<CurriculumLessonResponse> Lessons,
    IReadOnlyList<long> QuestionIds);

public sealed record CurriculumLessonResponse(
    long Id,
    string Slug,
    string Title,
    string? Summary,
    string Content,
    short? EstimatedMinutes,
    int SortOrder);
