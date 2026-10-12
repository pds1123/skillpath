using System.Net;
using SkillPath.Api.Services;

namespace SkillPath.Api.Tests;

public sealed class AiProviderErrorTests
{
    [Fact]
    public void UnscopedKeyError_ExplainsWorkspaceConfigurationWithoutEchoingSecrets()
    {
        var message = AiProviderErrors.Describe(HttpStatusCode.BadRequest,
            """{"error":{"message":"secret-value: This API key is not scoped to a workspace. Include anthropic-workspace-id."}}""");
        Assert.Contains("Anthropic:WorkspaceId", message);
        Assert.DoesNotContain("secret-value", message);
    }

    [Fact]
    public void CreditError_ExplainsBillingWithoutReturningRawProviderText()
    {
        var message = AiProviderErrors.Describe(HttpStatusCode.BadRequest,
            """{"error":{"message":"secret-value: Your credit balance is too low."}}""");
        Assert.Contains("add API credits", message);
        Assert.DoesNotContain("secret-value", message);
    }

    [Theory]
    [InlineData("not-json")]
    [InlineData("{\"error\":\"secret-value\"}")]
    [InlineData("{\"error\":{\"message\":\"secret-value\"}}")]
    public void UnknownErrors_NeverEchoProviderBody(string body)
    {
        Assert.Equal("AI feedback is temporarily unavailable. Please try again later.",
            AiProviderErrors.Describe(HttpStatusCode.BadRequest, body));
    }
}
