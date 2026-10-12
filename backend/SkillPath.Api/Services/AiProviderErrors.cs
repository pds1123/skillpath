using System.Net;
using System.Text.Json;

namespace SkillPath.Api.Services;

public static class AiProviderErrors
{
    public static string Describe(HttpStatusCode status, string body)
    {
        // Classify upstream details; never send the raw error (which can contain secrets) to the browser.
        var message = string.Empty;
        try
        {
            using var json = JsonDocument.Parse(body);
            if (json.RootElement.ValueKind == JsonValueKind.Object && json.RootElement.TryGetProperty("error", out var error) && error.ValueKind == JsonValueKind.Object
                && error.TryGetProperty("message", out var text) && text.ValueKind == JsonValueKind.String)
                message = text.GetString()?.ToLowerInvariant() ?? string.Empty;
        }
        catch (JsonException) { }
        if (status == HttpStatusCode.TooManyRequests) return "AI is busy. Please wait a minute and retry.";
        if (message.Contains("anthropic-workspace-id") || message.Contains("not scoped to a workspace"))
            return "This Claude key requires a Workspace ID. The administrator must configure Anthropic:WorkspaceId or use a workspace-scoped API key.";
        if (message.Contains("credit balance") || message.Contains("insufficient credits"))
            return "The Claude API credit balance is too low. The administrator must add API credits in Claude Console.";
        if (status == HttpStatusCode.Unauthorized)
            return "The server Claude API key was rejected. The administrator must check or replace the key.";
        if (status == HttpStatusCode.Forbidden)
            return "The Claude API key does not have permission for this request. Contact the administrator.";
        if (status is HttpStatusCode.BadRequest or HttpStatusCode.NotFound && message.Contains("model"))
            return "The configured Claude model is unavailable. The administrator must check Anthropic:Model.";
        return "AI feedback is temporarily unavailable. Please try again later.";
    }
}
