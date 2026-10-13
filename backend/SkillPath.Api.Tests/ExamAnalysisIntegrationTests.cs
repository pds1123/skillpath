using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace SkillPath.Api.Tests;

public sealed class ExamAnalysisIntegrationTests(SkillPathWebApplicationFactory factory) : IClassFixture<SkillPathWebApplicationFactory>
{
    [Fact]
    public async Task Analysis_IsBoundToExamAndOwner_NotLaterAnswers()
    {
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/auth/register", new
        { email = $"exam-{Guid.NewGuid():N}@example.test", password = "Testing-Password-123", displayName = "Exam Test" })).EnsureSuccessStatusCode();
        var ids = new List<Guid>();
        foreach (var answer in new[] { "A", "B" })
        {
            var response = await client.PostAsJsonAsync("/api/exams/grade", new
            { certification = "TEST", durationSeconds = 60, answers = new[] { new { questionId = factory.ChoiceQuestionId, selectedAnswers = new[] { answer } } } });
            response.EnsureSuccessStatusCode();
            ids.Add((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("attemptId").GetGuid());
        }
        (await client.PostAsJsonAsync($"/api/questions/{factory.ChoiceQuestionId}/attempts", new { selectedAnswers = new[] { "B" } })).EnsureSuccessStatusCode();
        var first = await client.GetFromJsonAsync<JsonElement>($"/api/exams/{ids[0]}/analysis");
        var second = await client.GetFromJsonAsync<JsonElement>($"/api/exams/{ids[1]}/analysis");
        Assert.Equal(1, first.GetProperty("score").GetInt32());
        Assert.Equal(100, first.GetProperty("modules")[0].GetProperty("accuracy").GetInt32());
        Assert.Equal(0, second.GetProperty("modules")[0].GetProperty("accuracy").GetInt32());
        Assert.True(first.GetProperty("modules")[0].GetProperty("smallSample").GetBoolean());
        using var other = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await other.GetAsync($"/api/exams/{ids[0]}/analysis")).StatusCode);
        (await other.PostAsJsonAsync("/api/auth/register", new
        { email = $"other-{Guid.NewGuid():N}@example.test", password = "Testing-Password-123", displayName = "Other Test" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/exams/{ids[0]}/analysis")).StatusCode);
        other.DefaultRequestHeaders.Add("X-SkillPath-Request", "ai-feedback");
        Assert.Equal(HttpStatusCode.NotFound, (await other.PostAsJsonAsync("/api/ai/exam-summary", new { attemptId = ids[0] })).StatusCode);
    }
}
