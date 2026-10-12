using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace SkillPath.Api.Tests;

public sealed class AiIntegrationTests(SkillPathWebApplicationFactory factory) : IClassFixture<SkillPathWebApplicationFactory>
{
    private sealed class ProviderStub(HttpStatusCode status) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public string LastBody { get; private set; } = "";
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            Calls++;
            Assert.Equal("server-test-secret", request.Headers.GetValues("x-api-key").Single());
            Assert.Equal("wrkspc_test", request.Headers.GetValues("anthropic-workspace-id").Single());
            LastBody = await request.Content!.ReadAsStringAsync(token);
            return new HttpResponseMessage(status)
            {
                Content = JsonContent.Create(status == HttpStatusCode.OK
                    ? (object)new { content = new[] { new { type = "text", text = "Review the topic." } } }
                    : new { error = new { message = "server-test-secret: provider details" } }),
            };
        }
    }

    [Fact]
    public async Task Feedback_RequiresAuthentication()
    {
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/ai/feedback", new { questionId = factory.ChoiceQuestionId, prompt = "Feedback" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MissingKey_IsUnavailable_AndStatusDoesNotReturnAKey()
    {
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, c) =>
            c.AddInMemoryCollection(new Dictionary<string, string?> { ["Anthropic:ApiKey"] = "" })));
        using var client = app.CreateClient();
        await Register(client);
        client.DefaultRequestHeaders.Add("X-SkillPath-Request", "ai-feedback");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await Feedback(client)).StatusCode);
        Assert.Equal("{\"configured\":false}", await client.GetStringAsync("/api/ai/status"));
    }

    [Theory]
    [InlineData(HttpStatusCode.OK)]
    [InlineData(HttpStatusCode.Unauthorized)]
    public async Task ServerKeepsCredentialsPrivate_AndLimitsRequests(HttpStatusCode providerStatus)
    {
        var stub = new ProviderStub(providerStatus);
        using var app = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(
                new Dictionary<string, string?> { ["Anthropic:ApiKey"] = "server-test-secret", ["Anthropic:WorkspaceId"] = "wrkspc_test" }));
            builder.ConfigureServices(services => services.AddHttpClient("anthropic").ConfigurePrimaryHttpMessageHandler(() => stub));
        });
        using var client = app.CreateClient();
        await Register(client);
        Assert.Equal(HttpStatusCode.BadRequest, (await Feedback(client)).StatusCode);
        client.DefaultRequestHeaders.Add("X-SkillPath-Request", "ai-feedback");
        var response = await Feedback(client);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("server-test-secret", body);
        Assert.Equal(providerStatus == HttpStatusCode.OK ? HttpStatusCode.OK : HttpStatusCode.BadGateway, response.StatusCode);
        await Feedback(client);
        Assert.Equal(providerStatus == HttpStatusCode.OK ? 1 : 2, stub.Calls);
        await Feedback(client);
        await Feedback(client);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Feedback(client)).StatusCode);
        using var otherUser = app.CreateClient();
        await Register(otherUser);
        otherUser.DefaultRequestHeaders.Add("X-SkillPath-Request", "ai-feedback");
        var before = stub.Calls;
        await Feedback(otherUser);
        Assert.Equal(before + 1, stub.Calls); // Cached feedback and quotas do not cross users.
    }

    private Task<HttpResponseMessage> Feedback(HttpClient client) => client.PostAsJsonAsync("/api/ai/feedback",
        new { questionId = factory.ChoiceQuestionId, prompt = "Explain the learner's response." });

    [Fact]
    public async Task Summary_UsesServerStatistics_AndCachesUnchangedInputs()
    {
        var stub = new ProviderStub(HttpStatusCode.OK);
        using var app = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(new Dictionary<string, string?>
            { ["Anthropic:ApiKey"] = "server-test-secret", ["Anthropic:WorkspaceId"] = "wrkspc_test" }));
            builder.ConfigureServices(services => services.AddHttpClient("anthropic").ConfigurePrimaryHttpMessageHandler(() => stub));
        });
        using var client = app.CreateClient();
        await Register(client);
        (await client.PostAsJsonAsync($"/api/questions/{factory.ChoiceQuestionId}/attempts", new { selectedAnswers = new[] { "A" } })).EnsureSuccessStatusCode();
        client.DefaultRequestHeaders.Add("X-SkillPath-Request", "ai-feedback");
        var first = await client.PostAsJsonAsync("/api/ai/summary", new { certification = "TEST" });
        first.EnsureSuccessStatusCode();
        var content = await first.Content.ReadAsStringAsync();
        Assert.Contains("generatedAt", content);
        Assert.Contains("Practiced", stub.LastBody);
        Assert.DoesNotContain("@example.test", stub.LastBody);
        Assert.DoesNotContain("Which option is the expected answer", stub.LastBody);
        (await client.PostAsJsonAsync("/api/ai/summary", new { certification = "TEST" })).EnsureSuccessStatusCode();
        Assert.Equal(1, stub.Calls);
        (await client.PostAsJsonAsync($"/api/questions/{factory.ChoiceQuestionId}/attempts", new { selectedAnswers = new[] { "B" } })).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/ai/summary", new { certification = "TEST" })).EnsureSuccessStatusCode();
        Assert.Equal(2, stub.Calls);
    }

    private static async Task Register(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = $"ai-{Guid.NewGuid():N}@example.test",
            password = "Testing-Password-123",
            displayName = "AI Test",
        });
        response.EnsureSuccessStatusCode();
    }
}
