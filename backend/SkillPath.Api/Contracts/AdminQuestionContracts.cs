namespace SkillPath.Api.Contracts;

public sealed record AdminQuestionStatsResponse(int Total, int Published, int Draft, int Archived);

public sealed record AdminQuestionListItemResponse(
    long Id,
    int LegacyId,
    string Certification,
    string Domain,
    string Type,
    string ContentType,
    string Prompt,
    string Difficulty,
    string Status,
    DateTimeOffset UpdatedAt);

public sealed record AdminQuestionPageResponse(
    IReadOnlyList<AdminQuestionListItemResponse> Items,
    int Total,
    int Offset,
    int Limit,
    AdminQuestionStatsResponse Stats,
    IReadOnlyList<string> Certifications,
    IReadOnlyList<string> Domains);

public sealed record AdminQuestionOptionResponse(string Key, string Text, bool IsCorrect);

public sealed record AdminQuestionDetailResponse(
    long Id,
    int LegacyId,
    string Certification,
    string Domain,
    string Type,
    string ContentType,
    string Prompt,
    string? Explanation,
    string Mode,
    string Difficulty,
    string Status,
    IReadOnlyList<AdminQuestionOptionResponse> Options,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record AdminQuestionOptionRequest(string Key, string Text, bool IsCorrect);

public sealed record AdminQuestionUpsertRequest(
    string Certification,
    string Domain,
    string Type,
    string ContentType,
    string Prompt,
    string? Explanation,
    string Mode,
    string Difficulty,
    string Status,
    IReadOnlyList<AdminQuestionOptionRequest> Options);
