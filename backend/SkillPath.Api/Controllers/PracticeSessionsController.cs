using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Contracts;
using SkillPath.Api.Data;
using SkillPath.Api.Models;

namespace SkillPath.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/practice-sessions")]
public sealed class PracticeSessionsController(SkillPathDbContext db) : ControllerBase
{
    public sealed record CreatePracticeSessionRequest(string Certification, string Mode);
    public sealed record PracticeSessionResponse(Guid Id, string Certification, string Mode, DateTimeOffset StartedAt);

    [HttpPost]
    public async Task<ActionResult<PracticeSessionResponse>> Create(CreatePracticeSessionRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        var mode = request.Mode.Trim().ToLowerInvariant() switch
        {
            "weak" => "weak_areas",
            var value => value,
        };
        if (mode is not ("quick" or "weak_areas" or "mistakes" or "module"))
            return BadRequest(new ApiError("Practice mode is invalid."));

        var certificationCode = request.Certification.Trim().ToUpperInvariant();
        var certification = await db.Certifications.SingleOrDefaultAsync(item => item.Code == certificationCode);
        if (certification is null) return NotFound(new ApiError("Certification was not found."));

        var session = new PracticeSession
        {
            UserId = userId.Value,
            CertificationId = certification.Id,
            Mode = mode,
        };
        db.PracticeSessions.Add(session);
        await db.SaveChangesAsync();
        return Created($"/api/practice-sessions/{session.Id}", new PracticeSessionResponse(session.Id, certification.Code, session.Mode, session.StartedAt));
    }

    [HttpPost("{id:guid}/finish")]
    public async Task<IActionResult> Finish(Guid id)
    {
        var userId = GetUserId();
        var session = await db.PracticeSessions.SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId);
        if (session is null) return NotFound(new ApiError("Practice session was not found."));
        session.FinishedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
