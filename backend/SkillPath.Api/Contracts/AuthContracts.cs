namespace SkillPath.Api.Contracts;

public sealed record RegisterRequest(string Email, string Password, string DisplayName);
public sealed record LoginRequest(string Email, string Password);
public sealed record UserResponse(Guid Id, string Email, string DisplayName, string Role);
public sealed record ApiError(string Message);
