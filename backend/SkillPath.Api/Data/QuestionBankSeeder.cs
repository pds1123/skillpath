using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Models;

namespace SkillPath.Api.Data;

public static class QuestionBankSeeder
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
    };

    public static async Task SeedAsync(SkillPathDbContext db, IWebHostEnvironment environment, ILogger logger)
    {
        if (await db.Questions.AnyAsync()) return;

        var path = Path.Combine(environment.ContentRootPath, "App_Data", "question-bank.seed.json");
        if (!File.Exists(path))
        {
            logger.LogWarning("Question seed file not found at {Path}. Run npm run db:export first.", path);
            return;
        }

        await using var stream = File.OpenRead(path);
        var seed = await JsonSerializer.DeserializeAsync<QuestionBankSeed>(stream, JsonOptions)
            ?? throw new InvalidOperationException("Question seed file is empty or invalid.");

        await using var transaction = await db.Database.BeginTransactionAsync();

        var area = new LearningArea
        {
            Slug = seed.LearningArea.Slug,
            Name = seed.LearningArea.Name,
            Description = seed.LearningArea.Description,
            SortOrder = 1,
            Status = "published",
        };
        db.LearningAreas.Add(area);
        await db.SaveChangesAsync();

        var certifications = seed.Certifications.ToDictionary(
            item => item.Code,
            item => new Certification
            {
                Code = item.Code,
                Name = item.Name,
                Provider = item.Provider,
                MockQuestionCount = item.MockQuestionCount,
                Status = "active",
            });
        db.Certifications.AddRange(certifications.Values);
        await db.SaveChangesAsync();

        var modulesByCertificationAndDomain = new Dictionary<(string Certification, string Domain), LearningModule>();

        foreach (var pathSeed in seed.Paths)
        {
            var learningPath = new LearningPath
            {
                LearningAreaId = area.Id,
                Slug = pathSeed.Slug,
                Name = pathSeed.Name,
                Description = pathSeed.Description,
                Level = pathSeed.Level,
                SortOrder = pathSeed.SortOrder,
                Status = "published",
            };
            db.LearningPaths.Add(learningPath);
            await db.SaveChangesAsync();

            foreach (var moduleSeed in pathSeed.Modules.OrderBy(item => item.Order))
            {
                var module = new LearningModule
                {
                    LearningPathId = learningPath.Id,
                    Slug = moduleSeed.Key,
                    Name = moduleSeed.Name,
                    Description = moduleSeed.Description,
                    SortOrder = moduleSeed.Order,
                    Status = "published",
                };
                db.Modules.Add(module);
                await db.SaveChangesAsync();

                db.CertificationModules.Add(new CertificationModule
                {
                    CertificationId = certifications[pathSeed.Certification].Id,
                    ModuleId = module.Id,
                    SortOrder = moduleSeed.Order,
                });

                foreach (var domain in moduleSeed.DomainMap)
                    modulesByCertificationAndDomain.TryAdd((pathSeed.Certification, domain), module);

                foreach (var lessonSeed in moduleSeed.Lessons.OrderBy(item => item.SortOrder))
                {
                    db.Lessons.Add(new Lesson
                    {
                        ModuleId = module.Id,
                        Slug = lessonSeed.Slug,
                        Title = lessonSeed.Title,
                        Summary = lessonSeed.Summary,
                        Content = lessonSeed.Content,
                        EstimatedMinutes = 5,
                        SortOrder = lessonSeed.SortOrder,
                        Status = "published",
                    });
                }
                await db.SaveChangesAsync();
            }
        }

        const int batchSize = 100;
        for (var offset = 0; offset < seed.Questions.Count; offset += batchSize)
        {
            foreach (var questionSeed in seed.Questions.Skip(offset).Take(batchSize))
            {
                var question = new Question
                {
                    SourceKey = questionSeed.SourceKey,
                    LegacyId = questionSeed.LegacyId,
                    QuestionType = questionSeed.QuestionType,
                    ContentType = questionSeed.ContentType,
                    Prompt = questionSeed.Prompt,
                    Explanation = questionSeed.Explanation,
                    InteractionData = SerializeOptional(questionSeed.InteractionData),
                    TableData = SerializeOptional(questionSeed.TableData),
                    Mode = questionSeed.Mode,
                    Difficulty = questionSeed.Difficulty,
                    Status = questionSeed.Status,
                };
                db.Questions.Add(question);
                await db.SaveChangesAsync();

                foreach (var option in questionSeed.Options)
                {
                    db.QuestionOptions.Add(new QuestionOption
                    {
                        QuestionId = question.Id,
                        OptionKey = option.Key,
                        OptionText = option.Text,
                        SortOrder = option.SortOrder,
                        IsCorrect = option.IsCorrect,
                    });
                }

                var certification = certifications[questionSeed.Certification];
                db.CertificationQuestions.Add(new CertificationQuestion
                {
                    CertificationId = certification.Id,
                    QuestionId = question.Id,
                    DomainName = questionSeed.Domain,
                });

                if (modulesByCertificationAndDomain.TryGetValue((questionSeed.Certification, questionSeed.Domain), out var module))
                {
                    db.QuestionModules.Add(new QuestionModule
                    {
                        QuestionId = question.Id,
                        ModuleId = module.Id,
                        IsPrimary = true,
                    });
                }
            }
            await db.SaveChangesAsync();
        }

        await transaction.CommitAsync();
        logger.LogInformation("Seeded {QuestionCount} questions and {PathCount} learning paths.", seed.Questions.Count, seed.Paths.Count);
    }

    private static string? SerializeOptional(JsonElement? value) =>
        value is null || value.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined
            ? null
            : value.Value.GetRawText();

    private sealed record QuestionBankSeed(
        LearningAreaSeed LearningArea,
        List<CertificationSeed> Certifications,
        List<PathSeed> Paths,
        List<QuestionSeed> Questions);

    private sealed record LearningAreaSeed(string Slug, string Name, string? Description);
    private sealed record CertificationSeed(string Code, string Name, string Provider, short MockQuestionCount);
    private sealed record PathSeed(
        string Slug,
        string Name,
        string? Description,
        string Level,
        string Certification,
        int SortOrder,
        List<ModuleSeed> Modules);
    private sealed record ModuleSeed(
        string Key,
        string Name,
        string? Description,
        int Order,
        List<string> DomainMap,
        List<LessonSeed> Lessons);
    private sealed record LessonSeed(string Slug, string Title, string? Summary, string Content, int SortOrder);
    private sealed record QuestionSeed(
        int LegacyId,
        string Certification,
        string SourceKey,
        string QuestionType,
        string ContentType,
        string Prompt,
        string? Explanation,
        JsonElement? InteractionData,
        JsonElement? TableData,
        string Mode,
        string Difficulty,
        string Status,
        string Domain,
        List<OptionSeed> Options);
    private sealed record OptionSeed(string Key, string Text, short SortOrder, bool IsCorrect);
}
