using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SkillPath.Api.Data;
using SkillPath.Api.Models;
using SkillPath.Api.Services;

namespace SkillPath.Api.Tests;

public sealed class SkillPathWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string databasePath = Path.Combine(Path.GetTempPath(), $"skillpath-tests-{Guid.NewGuid():N}.db");

    public long ChoiceQuestionId { get; private set; }
    public long MatchQuestionId { get; private set; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:SkillPath"] = $"Data Source={databasePath}",
                ["Testing:SkipSeed"] = "true",
            });
        });
    }

    public async Task InitializeAsync()
    {
        _ = CreateClient();
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SkillPathDbContext>();

        var certification = new Certification
        {
            Code = "TEST",
            Name = "Automated Test Path",
            Provider = "SkillPath",
            MockQuestionCount = 2,
        };
        var choice = new Question
        {
            SourceKey = "tests:choice:1",
            SourceAttribution = "test-suite",
            SourceReference = "fixture.1",
            LegacyId = 1,
            QuestionType = "multiple_choice",
            InteractionType = QuestionInteractionTypes.SingleChoice,
            Prompt = "Which option is the expected answer?",
            Explanation = "Option A is the fixture answer.",
            Status = "published",
        };
        var match = new Question
        {
            SourceKey = "tests:match:2",
            SourceAttribution = "test-suite",
            SourceReference = "fixture.2",
            LegacyId = 2,
            QuestionType = "drag_drop",
            InteractionType = QuestionInteractionTypes.FixedMatch,
            Prompt = "Match each fixture prompt to its expected answer.",
            InteractionData = """
                {
                  "kind": "match",
                  "pool": ["Alpha", "Beta"],
                  "prompts": [
                    { "text": "First", "correct": "Alpha" },
                    { "text": "Second", "correct": "Beta" }
                  ]
                }
                """,
            Status = "published",
        };
        db.AddRange(certification, choice, match);
        await db.SaveChangesAsync();

        db.QuestionOptions.AddRange(
            new QuestionOption { QuestionId = choice.Id, OptionKey = "A", OptionText = "Expected", SortOrder = 1, IsCorrect = true },
            new QuestionOption { QuestionId = choice.Id, OptionKey = "B", OptionText = "Unexpected", SortOrder = 2, IsCorrect = false });
        db.CertificationQuestions.AddRange(
            new CertificationQuestion { CertificationId = certification.Id, QuestionId = choice.Id, DomainName = "Engine" },
            new CertificationQuestion { CertificationId = certification.Id, QuestionId = match.Id, DomainName = "Engine" });
        await db.SaveChangesAsync();

        ChoiceQuestionId = choice.Id;
        MatchQuestionId = match.Id;
    }

    public async Task PromoteToAdmin(string email)
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SkillPathDbContext>();
        var normalized = email.Trim().ToUpperInvariant();
        var user = await db.Users.SingleAsync(item => item.NormalizedEmail == normalized);
        user.Role = "admin";
        await db.SaveChangesAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await DisposeAsync();
        if (File.Exists(databasePath)) File.Delete(databasePath);
    }
}
