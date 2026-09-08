using System.Text.Json;
using SkillPath.Api.Models;
using SkillPath.Api.Services;

namespace SkillPath.Api.Tests;

public sealed class QuestionEngineTests
{
    [Fact]
    public void PublicDefinition_RemovesSolutionsRecursively()
    {
        const string definition = """
            {
              "kind": "match",
              "pool": ["One", "Two"],
              "prompts": [
                { "text": "First", "correct": "One" },
                { "text": "Second", "correct": "Two", "nested": { "correct": "hidden" } }
              ]
            }
            """;

        var publicDefinition = QuestionEngine.PublicDefinition(definition);

        Assert.NotNull(publicDefinition);
        Assert.DoesNotContain("correct", publicDefinition.Value.GetRawText(), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("First", publicDefinition.Value.GetRawText(), StringComparison.Ordinal);
    }

    [Fact]
    public void SingleChoice_RejectsUnknownOption()
    {
        var question = ChoiceQuestion(QuestionInteractionTypes.SingleChoice);
        var options = ChoiceOptions();

        var accepted = QuestionEngine.TryGrade(
            question,
            options,
            ["Z"],
            null,
            null,
            false,
            out var result,
            out var error);

        Assert.False(accepted);
        Assert.Null(result);
        Assert.Equal("One or more selected answers are invalid.", error);
    }

    [Fact]
    public void UnorderedSelection_GradesWithoutDependingOnOrder()
    {
        var question = InteractiveQuestion(
            QuestionInteractionTypes.UnorderedSelection,
            """
            {
              "kind": "match",
              "pool": ["One", "Two", "Three"],
              "prompts": [
                { "text": "Answer", "correct": "One" },
                { "text": "Answer", "correct": "Three" }
              ]
            }
            """);
        var response = Json("""{ "answers": ["Three", "One"] }""");

        var accepted = QuestionEngine.TryGrade(
            question,
            [],
            null,
            null,
            response,
            false,
            out var result,
            out var error);

        Assert.True(accepted, error);
        Assert.True(result!.Correct);
        Assert.Equal(["One", "Three"], result.CorrectInteraction!.Value.GetProperty("answers").EnumerateArray().Select(item => item.GetString()));
    }

    [Fact]
    public void FixedMatch_RequiresEverySlot()
    {
        var question = InteractiveQuestion(
            QuestionInteractionTypes.FixedMatch,
            """
            {
              "kind": "match",
              "pool": ["One", "Two"],
              "prompts": [
                { "text": "First", "correct": "One" },
                { "text": "Second", "correct": "Two" }
              ]
            }
            """);
        var response = Json("""{ "answers": ["One"] }""");

        var accepted = QuestionEngine.TryGrade(
            question,
            [],
            null,
            null,
            response,
            false,
            out var result,
            out var error);

        Assert.False(accepted);
        Assert.Null(result);
        Assert.Equal("Submit an answer for every required field.", error);
    }

    [Fact]
    public void Ordering_RejectsRepeatedOptions()
    {
        var question = InteractiveQuestion(
            QuestionInteractionTypes.Ordering,
            """
            {
              "kind": "match",
              "pool": ["One", "Two"],
              "prompts": [
                { "text": "First", "correct": "One" },
                { "text": "Second", "correct": "Two" }
              ]
            }
            """);
        var response = Json("""{ "answers": ["One", "One"] }""");

        var accepted = QuestionEngine.TryGrade(
            question,
            [],
            null,
            null,
            response,
            false,
            out var result,
            out var error);

        Assert.False(accepted);
        Assert.Null(result);
        Assert.Equal("Every ordering option must be used exactly once.", error);
    }

    [Fact]
    public void Hotspot_GradesNormalizedCoordinates()
    {
        var question = InteractiveQuestion(
            QuestionInteractionTypes.ImageHotspot,
            """{ "kind": "click", "label": "Target", "correct": { "x": 0.2, "y": 0.3, "w": 0.2, "h": 0.2 } }""");

        var accepted = QuestionEngine.TryGrade(
            question,
            [],
            null,
            null,
            Json("""{ "x": 0.3, "y": 0.4 }"""),
            false,
            out var result,
            out var error);

        Assert.True(accepted, error);
        Assert.True(result!.Correct);
    }

    private static Question ChoiceQuestion(string type) => new()
    {
        SourceKey = "test-choice",
        LegacyId = 1,
        QuestionType = "multiple_choice",
        InteractionType = type,
        Prompt = "Which answer is correct?",
    };

    private static Question InteractiveQuestion(string type, string definition) => new()
    {
        SourceKey = $"test-{type}",
        LegacyId = 2,
        QuestionType = QuestionInteractionTypes.ToLegacyQuestionType(type),
        InteractionType = type,
        InteractionData = definition,
        Prompt = "Complete the interaction.",
    };

    private static IReadOnlyList<QuestionOption> ChoiceOptions() =>
    [
        new() { QuestionId = 1, OptionKey = "A", OptionText = "Correct", SortOrder = 1, IsCorrect = true },
        new() { QuestionId = 1, OptionKey = "B", OptionText = "Incorrect", SortOrder = 2, IsCorrect = false },
    ];

    private static JsonElement Json(string value)
    {
        using var document = JsonDocument.Parse(value);
        return document.RootElement.Clone();
    }
}
