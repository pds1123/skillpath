using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Models;
using SkillPath.Api.Services;

namespace SkillPath.Api.Data;

public static class IstqbCtflSeeder
{
    private const string CertificationCode = "CTFL";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
    };

    private static readonly ModuleDefinition[] ModuleDefinitions =
    [
        new("fundamentals-of-testing", "Fundamentals of Testing", "Why testing matters, core principles, objectives, and the human factors behind effective testing.", 1),
        new("testing-throughout-the-sdlc", "Testing Throughout the Software Development Lifecycle", "How testing changes across development approaches, test levels, test types, and maintenance.", 2),
        new("static-testing", "Static Testing", "Reviews, static analysis, feedback practices, roles, and review techniques.", 3),
        new("test-analysis-and-design", "Test Analysis and Design", "Test conditions, test cases, black-box, white-box, and experience-based techniques.", 4),
        new("managing-test-activities", "Managing the Test Activities", "Planning, estimation, risk, monitoring, configuration, and defect management.", 5),
        new("test-tools", "Test Tools", "Tool support, automation benefits and risks, selection, rollout, and maintenance.", 6),
    ];

    public static async Task SeedAsync(SkillPathDbContext db, IWebHostEnvironment environment, ILogger logger)
    {
        var area = await db.LearningAreas.SingleOrDefaultAsync(item => item.Slug == "qa-testing");
        if (area is null)
        {
            area = new LearningArea
            {
                Slug = "qa-testing",
                Name = "QA & Testing",
                Description = "Software quality, testing principles, test design, and evidence-based delivery.",
                SortOrder = 4,
                Status = "published",
            };
            db.LearningAreas.Add(area);
            await db.SaveChangesAsync();
        }

        var learningPath = await db.LearningPaths.SingleOrDefaultAsync(item => item.Slug == "istqb-ctfl");
        if (learningPath is null)
        {
            learningPath = new LearningPath
            {
                LearningAreaId = area.Id,
                Slug = "istqb-ctfl",
                Name = "ISTQB CTFL",
                Description = "A concept-led foundation in software testing with optional certification preparation.",
                Level = "beginner",
                SortOrder = 1,
                Status = "published",
            };
            db.LearningPaths.Add(learningPath);
            await db.SaveChangesAsync();
        }

        var certification = await db.Certifications.SingleOrDefaultAsync(item => item.Code == CertificationCode);
        if (certification is null)
        {
            certification = new Certification
            {
                Code = CertificationCode,
                Name = "ISTQB Certified Tester Foundation Level",
                Provider = "ISTQB",
                MockQuestionCount = 40,
                Status = "active",
            };
            db.Certifications.Add(certification);
            await db.SaveChangesAsync();
        }

        var modulesByName = new Dictionary<string, LearningModule>(StringComparer.OrdinalIgnoreCase);
        var modulesBySlug = new Dictionary<string, LearningModule>(StringComparer.OrdinalIgnoreCase);
        foreach (var definition in ModuleDefinitions)
        {
            var module = await db.Modules.SingleOrDefaultAsync(item =>
                item.LearningPathId == learningPath.Id && item.Slug == definition.Slug);
            if (module is null)
            {
                module = new LearningModule
                {
                    LearningPathId = learningPath.Id,
                    Slug = definition.Slug,
                    Name = definition.Name,
                    Description = definition.Description,
                    SortOrder = definition.SortOrder,
                    Status = "published",
                };
                db.Modules.Add(module);
                await db.SaveChangesAsync();
            }

            modulesByName[definition.Name] = module;
            modulesBySlug[definition.Slug] = module;
            if (!await db.CertificationModules.AnyAsync(item =>
                    item.CertificationId == certification.Id && item.ModuleId == module.Id))
            {
                db.CertificationModules.Add(new CertificationModule
                {
                    CertificationId = certification.Id,
                    ModuleId = module.Id,
                    SortOrder = definition.SortOrder,
                });
            }
        }
        await db.SaveChangesAsync();
        await SeedLessonsAsync(db, modulesBySlug, logger);

        var path = Path.Combine(environment.ContentRootPath, "App_Data", "istqb-ctfl.seed.json");
        if (!File.Exists(path))
        {
            logger.LogInformation("CTFL structure is ready. No private CTFL question seed was found at {Path}.", path);
            return;
        }

        await using var stream = File.OpenRead(path);
        var seed = await JsonSerializer.DeserializeAsync<CtflSeed>(stream, JsonOptions)
            ?? throw new InvalidOperationException("CTFL question seed file is empty or invalid.");
        var existingQuestions = await db.Questions
            .Where(item => item.SourceKey.StartsWith("CTFL"))
            .ToDictionaryAsync(item => item.SourceKey, StringComparer.OrdinalIgnoreCase);
        var existingQuestionIds = existingQuestions.Values.Select(item => item.Id).ToList();
        var existingCertificationMappings = await db.CertificationQuestions
            .Where(item => item.CertificationId == certification.Id && existingQuestionIds.Contains(item.QuestionId))
            .ToDictionaryAsync(item => item.QuestionId);
        var existingModuleMappings = await db.QuestionModules
            .Where(item => existingQuestionIds.Contains(item.QuestionId))
            .ToDictionaryAsync(item => item.QuestionId);
        var imported = 0;
        var synchronized = 0;
        var pendingImports = new List<(Question Question, CtflQuestionSeed Seed, LearningModule Module)>();

        foreach (var questionSeed in seed.Questions)
        {
            if (!modulesByName.TryGetValue(questionSeed.Domain, out var module))
                throw new InvalidOperationException($"Unknown CTFL module mapping: {questionSeed.Domain}");

            if (existingQuestions.TryGetValue(questionSeed.SourceKey, out var existingQuestion))
            {
                existingQuestion.Prompt = questionSeed.Prompt;
                existingQuestion.SourceAttribution = questionSeed.SourceAttribution ?? "ctfl_278";
                existingQuestion.SourceReference = questionSeed.SourceReference;
                existingQuestion.Status = questionSeed.Status ?? "published";
                existingQuestion.QuestionType = "multiple_choice";
                existingQuestion.InteractionType = questionSeed.Options.Count(option => option.IsCorrect) > 1
                    ? QuestionInteractionTypes.MultipleChoice
                    : QuestionInteractionTypes.SingleChoice;
                if (string.IsNullOrWhiteSpace(existingQuestion.Explanation))
                    existingQuestion.Explanation = questionSeed.Explanation;
                existingQuestion.TableData = SerializeOptional(questionSeed.TableData);
                if (existingCertificationMappings.TryGetValue(existingQuestion.Id, out var certificationMapping))
                    certificationMapping.DomainName = questionSeed.Domain;
                if (existingModuleMappings.TryGetValue(existingQuestion.Id, out var moduleMapping) &&
                    moduleMapping.ModuleId != module.Id)
                {
                    db.QuestionModules.Remove(moduleMapping);
                    db.QuestionModules.Add(new QuestionModule
                    {
                        QuestionId = existingQuestion.Id,
                        ModuleId = module.Id,
                        IsPrimary = true,
                    });
                }
                synchronized += 1;
                continue;
            }

            var question = new Question
            {
                SourceKey = questionSeed.SourceKey,
                SourceAttribution = questionSeed.SourceAttribution ?? "ctfl_278",
                SourceReference = questionSeed.SourceReference,
                LegacyId = questionSeed.LegacyId,
                QuestionType = "multiple_choice",
                InteractionType = questionSeed.Options.Count(option => option.IsCorrect) > 1
                    ? QuestionInteractionTypes.MultipleChoice
                    : QuestionInteractionTypes.SingleChoice,
                ContentType = "mock_question",
                Prompt = questionSeed.Prompt,
                Explanation = questionSeed.Explanation,
                TableData = SerializeOptional(questionSeed.TableData),
                Mode = "quiz",
                Difficulty = "beginner",
                Status = questionSeed.Status ?? "published",
            };
            db.Questions.Add(question);
            pendingImports.Add((question, questionSeed, module));
            imported += 1;
        }

        await db.SaveChangesAsync();
        foreach (var (question, questionSeed, module) in pendingImports)
        {
            db.QuestionOptions.AddRange(questionSeed.Options.Select((option, index) => new QuestionOption
            {
                QuestionId = question.Id,
                OptionKey = option.Key,
                OptionText = option.Text,
                SortOrder = (short)(index + 1),
                IsCorrect = option.IsCorrect,
            }));
            db.CertificationQuestions.Add(new CertificationQuestion
            {
                CertificationId = certification.Id,
                QuestionId = question.Id,
                DomainName = questionSeed.Domain,
            });
            db.QuestionModules.Add(new QuestionModule
            {
                QuestionId = question.Id,
                ModuleId = module.Id,
                IsPrimary = true,
            });
        }
        await db.SaveChangesAsync();
        logger.LogInformation(
            "Imported {ImportedCount} CTFL questions; {ExistingCount} were synchronized; {SkippedCount} image-dependent questions stayed excluded.",
            imported,
            synchronized,
            seed.SkippedImageQuestions.Count);
    }

    private static string? SerializeOptional(JsonElement? value) =>
        value is { ValueKind: not JsonValueKind.Null and not JsonValueKind.Undefined } element
            ? element.GetRawText()
            : null;

    private static async Task SeedLessonsAsync(
        SkillPathDbContext db,
        IReadOnlyDictionary<string, LearningModule> modulesBySlug,
        ILogger logger)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Content", "ctfl-lessons.json");
        if (!File.Exists(path))
            throw new FileNotFoundException("The shared CTFL lesson catalog was not copied to the application output.", path);

        await using var stream = File.OpenRead(path);
        var curriculum = await JsonSerializer.DeserializeAsync<CtflCurriculum>(stream, JsonOptions)
            ?? throw new InvalidOperationException("The shared CTFL lesson catalog is empty or invalid.");
        var moduleIds = modulesBySlug.Values.Select(item => item.Id).ToList();
        var existingLessons = await db.Lessons
            .Where(item => moduleIds.Contains(item.ModuleId))
            .ToDictionaryAsync(item => $"{item.ModuleId}:{item.Slug}", StringComparer.OrdinalIgnoreCase);
        var added = 0;

        foreach (var moduleContent in curriculum.Modules)
        {
            if (!modulesBySlug.TryGetValue(moduleContent.Slug, out var module))
                throw new InvalidOperationException($"Unknown CTFL lesson module: {moduleContent.Slug}");

            foreach (var lessonContent in moduleContent.Lessons.OrderBy(item => item.SortOrder))
            {
                var key = $"{module.Id}:{lessonContent.Slug}";
                if (existingLessons.ContainsKey(key)) continue;

                db.Lessons.Add(new Lesson
                {
                    ModuleId = module.Id,
                    Slug = lessonContent.Slug,
                    Title = lessonContent.Title,
                    Summary = lessonContent.Summary,
                    Content = lessonContent.Content,
                    EstimatedMinutes = lessonContent.EstimatedMinutes,
                    SortOrder = lessonContent.SortOrder,
                    Status = "published",
                });
                added += 1;
            }
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {AddedCount} missing CTFL lessons. Existing admin-managed lessons were preserved.", added);
    }

    private sealed record ModuleDefinition(string Slug, string Name, string Description, int SortOrder);
    private sealed record CtflCurriculum(List<CtflModuleContent> Modules);
    private sealed record CtflModuleContent(string Slug, List<CtflLessonContent> Lessons);
    private sealed record CtflLessonContent(
        string Slug,
        string Title,
        string Summary,
        short EstimatedMinutes,
        int SortOrder,
        string Content);
    private sealed record CtflSeed(List<int> SkippedImageQuestions, List<CtflQuestionSeed> Questions);
    private sealed record CtflQuestionSeed(
        int LegacyId,
        string SourceKey,
        string? SourceAttribution,
        string? SourceReference,
        string Prompt,
        string Domain,
        List<CtflOptionSeed> Options,
        JsonElement? TableData,
        string? Explanation,
        string? Status);
    private sealed record CtflOptionSeed(string Key, string Text, bool IsCorrect);
}
