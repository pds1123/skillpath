using System.Net;
using System.Net.Http.Json;
using System.Diagnostics;
using System.Text.Json;

namespace SkillPath.Api.Tests;

public sealed class ApiIntegrationTests(SkillPathWebApplicationFactory factory) : IClassFixture<SkillPathWebApplicationFactory>
{
    [Fact]
    public async Task AnonymousUser_CannotReadProgress()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/progress");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Registration_CreatesAuthenticatedSessionAndPersistsProgress()
    {
        using var client = factory.CreateClient();
        await Register(client);

        var save = await client.PutAsJsonAsync("/api/progress", new { completedLessons = new { lesson_one = 1234 } });
        var load = await client.GetAsync("/api/progress");
        var json = await load.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.NoContent, save.StatusCode);
        Assert.Equal(HttpStatusCode.OK, load.StatusCode);
        Assert.Equal(1234, json.GetProperty("completedLessons").GetProperty("lesson_one").GetInt32());
    }

    [Fact]
    public async Task Learner_CannotAccessAdminQuestionApi()
    {
        using var client = factory.CreateClient();
        await Register(client);

        var response = await client.GetAsync("/api/admin/questions");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PublicQuestionResponse_HidesSolutionsAndSourceReferences()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/questions/{factory.MatchQuestionId}");
        var json = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain("correct", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("sourceReferences", json, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("fixed_match", json, StringComparison.Ordinal);
    }

    [Fact]
    public async Task QuestionAttempt_IsGradedOnServerAndRejectsInvalidInteractionValues()
    {
        using var client = factory.CreateClient();
        await Register(client);

        var correct = await client.PostAsJsonAsync(
            $"/api/questions/{factory.MatchQuestionId}/attempts",
            new { selectedAnswers = Array.Empty<string>(), interactionResponse = new { answers = new[] { "Alpha", "Beta" } } });
        var correctJson = await correct.Content.ReadFromJsonAsync<JsonElement>();
        var invalid = await client.PostAsJsonAsync(
            $"/api/questions/{factory.MatchQuestionId}/attempts",
            new { selectedAnswers = Array.Empty<string>(), interactionResponse = new { answers = new[] { "Unknown", "Beta" } } });

        Assert.Equal(HttpStatusCode.OK, correct.StatusCode);
        Assert.True(correctJson.GetProperty("correct").GetBoolean());
        Assert.Equal(2, correctJson.GetProperty("correctInteraction").GetProperty("answers").GetArrayLength());
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
    }

    [Fact]
    public async Task AdminQuestionResponse_IncludesSourceMetadata()
    {
        const string password = "Testing-Password-123";
        var email = UniqueEmail();
        using var registrationClient = factory.CreateClient();
        await Register(registrationClient, email, password);
        await factory.PromoteToAdmin(email);

        using var adminClient = factory.CreateClient();
        await Login(adminClient, email, password);
        var response = await adminClient.GetAsync($"/api/admin/questions/{factory.ChoiceQuestionId}");
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("fixture.1", json.GetProperty("sourceReference").GetString());
    }

    [Fact]
    public async Task User_CannotFinishAnotherUsersPracticeSession()
    {
        using var owner = factory.CreateClient();
        await Register(owner);
        var create = await owner.PostAsJsonAsync("/api/practice-sessions", new { certification = "TEST", mode = "quick" });
        var session = await create.Content.ReadFromJsonAsync<JsonElement>();

        using var otherUser = factory.CreateClient();
        await Register(otherUser);
        var finish = await otherUser.PostAsync($"/api/practice-sessions/{session.GetProperty("id").GetGuid()}/finish", null);

        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, finish.StatusCode);
    }

    [Fact]
    public async Task ExamGrade_ReturnsScoreAndDomainBreakdown()
    {
        using var client = factory.CreateClient();
        await Register(client);

        var response = await client.PostAsJsonAsync("/api/exams/grade", new
        {
            certification = "TEST",
            durationSeconds = 30,
            answers = new object[]
            {
                new { questionId = factory.ChoiceQuestionId, selectedAnswers = new[] { "A" } },
                new { questionId = factory.MatchQuestionId, selectedAnswers = Array.Empty<string>(), interactionResponse = new { answers = new[] { "Beta", "Alpha" } } },
            },
        });
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, json.GetProperty("score").GetInt32());
        Assert.Equal(2, json.GetProperty("total").GetInt32());
        Assert.Equal(1, json.GetProperty("domainScores").GetProperty("Engine").GetProperty("correct").GetInt32());
    }

    [Fact]
    public async Task QuestionPaging_HandlesConcurrentSmokeLoad()
    {
        using var client = factory.CreateClient();
        var stopwatch = Stopwatch.StartNew();

        var responses = await Task.WhenAll(
            Enumerable.Range(0, 50)
                .Select(_ => client.GetAsync("/api/questions?certification=TEST&offset=0&limit=2")));
        stopwatch.Stop();

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
        Assert.True(stopwatch.Elapsed < TimeSpan.FromSeconds(10), $"Concurrent paging took {stopwatch.Elapsed}.");
        foreach (var response in responses) response.Dispose();
    }

    private static async Task Register(HttpClient client, string? email = null, string password = "Testing-Password-123")
    {
        email ??= UniqueEmail();
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password,
            displayName = "Test Learner",
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        ApplySessionCookie(client, response);
    }

    private static async Task Login(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        ApplySessionCookie(client, response);
    }

    private static void ApplySessionCookie(HttpClient client, HttpResponseMessage response)
    {
        var cookie = response.Headers.GetValues("Set-Cookie").Single().Split(';')[0];
        client.DefaultRequestHeaders.Remove("Cookie");
        client.DefaultRequestHeaders.Add("Cookie", cookie);
    }

    private static string UniqueEmail() => $"test-{Guid.NewGuid():N}@example.com";
}
