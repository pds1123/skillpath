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
    public long PublishedModuleId { get; private set; }
    public string CurriculumPathSlug { get; } = "automated-test-path";

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

        var area = new LearningArea
        {
            Slug = "automated-testing",
            Name = "Automated Testing",
            Description = "Fixture curriculum area",
            SortOrder = 1,
            Status = "published",
        };
        db.LearningAreas.Add(area);
        await db.SaveChangesAsync();
        var path = new LearningPath
        {
            LearningAreaId = area.Id,
            Slug = CurriculumPathSlug,
            Name = "Automated Test Path",
            Description = "Fixture curriculum path",
            Level = "beginner",
            SortOrder = 1,
            Status = "published",
        };
        db.LearningPaths.Add(path);
        await db.SaveChangesAsync();
        var publishedModule = new LearningModule
        {
            LearningPathId = path.Id,
            Slug = "published-module",
            Name = "Published module",
            Description = "Visible module",
            SortOrder = 1,
            Status = "published",
        };
        var draftModule = new LearningModule
        {
            LearningPathId = path.Id,
            Slug = "draft-module",
            Name = "Draft module",
            Description = "Hidden module",
            SortOrder = 2,
            Status = "draft",
        };
        db.Modules.AddRange(publishedModule, draftModule);
        await db.SaveChangesAsync();
        db.CertificationModules.AddRange(
            new CertificationModule { CertificationId = certification.Id, ModuleId = publishedModule.Id, SortOrder = 1 },
            new CertificationModule { CertificationId = certification.Id, ModuleId = draftModule.Id, SortOrder = 2 });
        db.Lessons.AddRange(
            new Lesson { ModuleId = publishedModule.Id, Slug = "published-lesson", Title = "Published lesson", Content = "Visible content", EstimatedMinutes = 5, SortOrder = 1, Status = "published" },
            new Lesson { ModuleId = publishedModule.Id, Slug = "draft-lesson", Title = "Draft lesson", Content = "Hidden content", EstimatedMinutes = 5, SortOrder = 2, Status = "draft" },
            new Lesson { ModuleId = draftModule.Id, Slug = "nested-draft-lesson", Title = "Nested draft lesson", Content = "Hidden content", EstimatedMinutes = 5, SortOrder = 1, Status = "published" });
        db.QuestionModules.Add(new QuestionModule { ModuleId = publishedModule.Id, QuestionId = choice.Id, IsPrimary = true });
        await db.SaveChangesAsync();

        var revisions = scope.ServiceProvider.GetRequiredService<CurriculumRevisionService>();
        await revisions.EnsureInitialRevisions();

        ChoiceQuestionId = choice.Id;
        MatchQuestionId = match.Id;
        PublishedModuleId = publishedModule.Id;
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
