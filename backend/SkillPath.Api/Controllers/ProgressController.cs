using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillPath.Api.Contracts;
using SkillPath.Api.Data;
using SkillPath.Api.Models;

namespace SkillPath.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/progress")]
public sealed class ProgressController(DatabaseDataStore dataStore) : ControllerBase
{
    private const int MaxProgressBytes = 2 * 1024 * 1024;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var progress = await dataStore.GetProgress(userId.Value);

        return progress is null
            ? NoContent()
            : Content(progress.Json, "application/json");
    }

    [HttpPut]
    public async Task<IActionResult> Put([FromBody] JsonElement document)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        if (document.ValueKind != JsonValueKind.Object)
            return BadRequest(new ApiError("Progress must be a JSON object."));

        var json = document.GetRawText();
        if (System.Text.Encoding.UTF8.GetByteCount(json) > MaxProgressBytes)
            return BadRequest(new ApiError("Progress data is too large."));

        await dataStore.SaveProgress(userId.Value, json);
        return NoContent();
    }

    private Guid? GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
