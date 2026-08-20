using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SkillPath.Api.Contracts;
using SkillPath.Api.Data;
using SkillPath.Api.Models;

namespace SkillPath.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    DatabaseDataStore dataStore,
    IPasswordHasher<AppUser> passwordHasher) : ControllerBase
{
    private static readonly EmailAddressAttribute EmailValidator = new();

    [HttpPost("register")]
    public async Task<ActionResult<UserResponse>> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();
        var normalizedEmail = email.ToUpperInvariant();
        var displayName = request.DisplayName.Trim();

        if (!EmailValidator.IsValid(email))
            return BadRequest(new ApiError("Enter a valid email address."));
        if (request.Password.Length < 8)
            return BadRequest(new ApiError("Password must be at least 8 characters."));
        if (displayName.Length is < 2 or > 80)
            return BadRequest(new ApiError("Display name must be between 2 and 80 characters."));
        var user = new AppUser
        {
            Email = email,
            NormalizedEmail = normalizedEmail,
            DisplayName = displayName,
            PasswordHash = string.Empty,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        if (!await dataStore.AddUser(user))
            return Conflict(new ApiError("An account with this email already exists."));
        await SignIn(user);

        return Created("/api/auth/me", ToResponse(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<UserResponse>> Login(LoginRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var user = await dataStore.FindUserByEmail(normalizedEmail);

        if (user is null || passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
            return Unauthorized(new ApiError("Email or password is incorrect."));

        await SignIn(user);
        return Ok(ToResponse(user));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var id)) return Unauthorized();

        var user = await dataStore.FindUserById(id);
        if (user is null) return Unauthorized();
        if (!User.IsInRole(user.Role)) await SignIn(user);
        return Ok(ToResponse(user));
    }

    private async Task SignIn(AppUser user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true });
    }

    private static UserResponse ToResponse(AppUser user) =>
        new(user.Id, user.Email, user.DisplayName, user.Role);
}
