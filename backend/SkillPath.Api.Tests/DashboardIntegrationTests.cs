using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace SkillPath.Api.Tests;

public sealed class DashboardIntegrationTests(SkillPathWebApplicationFactory factory) : IClassFixture<SkillPathWebApplicationFactory>
{
    [Fact]
    public async Task AnonymousUsers_CannotReadDashboardOrGenerateSummary()
    {
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/dashboard?certification=TEST")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/ai/summary", new { certification = "TEST" })).StatusCode);
    }

    [Fact]
    public async Task RepeatedQuestion_UsesFirstAndLatestAnswer_AndKeepsUsersIsolated()
    {
        using var client = factory.CreateClient();
        await Register(client);
        foreach (var answer in new[] { "A", "B", "B" })
        {
            var response = await client.PostAsJsonAsync($"/api/questions/{factory.ChoiceQuestionId}/attempts", new { selectedAnswers = new[] { answer } });
            response.EnsureSuccessStatusCode();
        }
        var snapshot = await client.GetFromJsonAsync<JsonElement>("/api/dashboard?certification=TEST");
        Assert.Equal(1, snapshot.GetProperty("practiced").GetInt32());
        Assert.Equal(100, snapshot.GetProperty("firstAccuracy").GetInt32());
        Assert.Equal(0, snapshot.GetProperty("latestAccuracy").GetInt32());
        Assert.Equal(1, snapshot.GetProperty("toReview").GetInt32());
        Assert.Single(snapshot.GetProperty("modules").EnumerateArray());
        Assert.True(snapshot.GetProperty("modules")[0].GetProperty("smallSample").GetBoolean());
        using var other = factory.CreateClient();
        await Register(other);
        var empty = await other.GetFromJsonAsync<JsonElement>("/api/dashboard?certification=TEST");
        Assert.Equal(0, empty.GetProperty("practiced").GetInt32());
        Assert.Equal(JsonValueKind.Null, empty.GetProperty("latestAccuracy").ValueKind);
        other.DefaultRequestHeaders.Add("X-SkillPath-Request", "ai-feedback");
        Assert.Equal(HttpStatusCode.BadRequest, (await other.PostAsJsonAsync("/api/ai/summary", new { certification = "TEST" })).StatusCode);
    }

    [Fact]
    public async Task MigratedHistory_IsIncluded_AndDuplicateRecordsDoNotInflateCounts()
    {
        using var client = factory.CreateClient();
        await Register(client);
        var results = new Dictionary<string, object>
        {
            [factory.ChoiceQuestionId.ToString()] = new[]
            {
                new { correct = false, attemptedAt = 1000L },
                new { correct = true, attemptedAt = 2000L },
                new { correct = true, attemptedAt = 2000L },
            },
            [long.MaxValue.ToString()] = new[] { new { correct = false, attemptedAt = 3000L } },
        };
        (await client.PutAsJsonAsync("/api/progress", new { results })).EnsureSuccessStatusCode();
        var snapshot = await client.GetFromJsonAsync<JsonElement>("/api/dashboard?certification=TEST");
        Assert.Equal(1, snapshot.GetProperty("practiced").GetInt32());
        Assert.Equal(0, snapshot.GetProperty("firstAccuracy").GetInt32());
        Assert.Equal(100, snapshot.GetProperty("latestAccuracy").GetInt32());
        Assert.Equal(0, snapshot.GetProperty("toReview").GetInt32());
    }

    private static async Task Register(HttpClient client)
    {
        (await client.PostAsJsonAsync("/api/auth/register", new { email = $"dashboard-{Guid.NewGuid():N}@example.test", password = "Testing-Password-123", displayName = "Dashboard Test" })).EnsureSuccessStatusCode();
    }
}
