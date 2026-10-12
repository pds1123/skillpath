using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillPath.Api.Contracts;
using SkillPath.Api.Services;

namespace SkillPath.Api.Controllers;

[ApiController, Authorize, Route("api/dashboard")]
public sealed class DashboardController(PracticeDashboard dashboard) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string certification = "AZ-900", CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        var result = await dashboard.Get(userId, certification.Trim().ToUpperInvariant(), cancellationToken);
        return result is null ? NotFound(new ApiError("Learning path was not found.")) : Ok(result);
    }
}
