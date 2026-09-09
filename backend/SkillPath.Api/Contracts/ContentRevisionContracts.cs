namespace SkillPath.Api.Contracts;

public sealed record ContentRevisionResponse(
    int Version,
    string ChangeType,
    string SnapshotJson,
    Guid? ChangedByUserId,
    string? ChangedBy,
    DateTimeOffset ChangedAt);
