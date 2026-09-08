using System.Text.Json;
using System.Text.Json.Nodes;
using SkillPath.Api.Models;

namespace SkillPath.Api.Services;

public static class QuestionInteractionTypes
{
    public const string SingleChoice = "single_choice";
    public const string MultipleChoice = "multiple_choice";
    public const string YesNo = "yes_no";
    public const string UnorderedSelection = "unordered_selection";
    public const string FixedMatch = "fixed_match";
    public const string Ordering = "ordering";
    public const string Dropdown = "dropdown";
    public const string YesNoMatrix = "yes_no_matrix";
    public const string ImageSelfGrade = "image_self_grade";
    public const string ImageHotspot = "image_hotspot";

    public static readonly HashSet<string> All =
    [
        SingleChoice,
        MultipleChoice,
        YesNo,
        UnorderedSelection,
        FixedMatch,
        Ordering,
        Dropdown,
        YesNoMatrix,
        ImageSelfGrade,
        ImageHotspot,
    ];

    public static bool UsesChoiceOptions(string type) =>
        type is SingleChoice or MultipleChoice or YesNo;

    public static bool UsesInteractionData(string type) =>
        type is UnorderedSelection or FixedMatch or Ordering or Dropdown or YesNoMatrix or ImageSelfGrade or ImageHotspot;

    public static string ToLegacyQuestionType(string type) => type switch
    {
        SingleChoice or MultipleChoice => "multiple_choice",
        YesNo => "yes_no",
        UnorderedSelection or FixedMatch or Ordering => "drag_drop",
        Dropdown or YesNoMatrix or ImageHotspot => "hotspot",
        ImageSelfGrade => "self_grade",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, "Unknown interaction type."),
    };

    public static string Infer(string legacyType, JsonElement? interactionData, int correctOptionCount, string prompt)
    {
        if (interactionData is { ValueKind: JsonValueKind.Object } data &&
            data.TryGetProperty("kind", out var kindElement))
        {
            var kind = kindElement.GetString();
            if (kind == "dropdown") return Dropdown;
            if (kind == "yesno") return YesNoMatrix;
            if (kind == "self_grade") return ImageSelfGrade;
            if (kind == "click") return ImageHotspot;
            if (kind == "match")
            {
                if (prompt.Contains("arrange", StringComparison.OrdinalIgnoreCase) ||
                    prompt.Contains("in which order", StringComparison.OrdinalIgnoreCase) ||
                    prompt.Contains("from the least", StringComparison.OrdinalIgnoreCase) ||
                    prompt.Contains("from the highest", StringComparison.OrdinalIgnoreCase))
                    return Ordering;

                if (data.TryGetProperty("prompts", out var prompts) && prompts.ValueKind == JsonValueKind.Array)
                {
                    var labels = prompts.EnumerateArray()
                        .Select(item => item.TryGetProperty("text", out var text) ? text.GetString() : null)
                        .ToList();
                    if (labels.Count > 1 && labels.All(label => label == labels[0]))
                        return UnorderedSelection;
                }
                return FixedMatch;
            }
        }

        return legacyType switch
        {
            "yes_no" => YesNo,
            "drag_drop" => UnorderedSelection,
            "hotspot" => YesNoMatrix,
            "self_grade" => ImageSelfGrade,
            _ when correctOptionCount > 1 => MultipleChoice,
            _ => SingleChoice,
        };
    }
}

public sealed record QuestionGradeResult(
    bool Correct,
    IReadOnlyList<string> CorrectAnswer,
    JsonElement? CorrectInteraction,
    string? ResponseData);

public static class QuestionEngine
{
    public static JsonElement? PublicDefinition(string? interactionData)
    {
        if (string.IsNullOrWhiteSpace(interactionData)) return null;
        var node = JsonNode.Parse(interactionData);
        RemoveSolutions(node);
        return ToElement(node);
    }

    public static string? ValidateDefinition(string interactionType, string? interactionData)
    {
        if (!QuestionInteractionTypes.All.Contains(interactionType)) return "Answer format is invalid.";
        if (!QuestionInteractionTypes.UsesInteractionData(interactionType))
            return string.IsNullOrWhiteSpace(interactionData) ? null : "Choice questions cannot include interaction JSON.";
        if (string.IsNullOrWhiteSpace(interactionData)) return "This answer format requires interaction JSON.";

        JsonElement root;
        try
        {
            using var document = JsonDocument.Parse(interactionData);
            root = document.RootElement.Clone();
        }
        catch (JsonException)
        {
            return "Interaction JSON is invalid.";
        }

        if (root.ValueKind != JsonValueKind.Object) return "Interaction JSON must be an object.";
        var expectedKind = interactionType switch
        {
            QuestionInteractionTypes.UnorderedSelection or QuestionInteractionTypes.FixedMatch or QuestionInteractionTypes.Ordering => "match",
            QuestionInteractionTypes.Dropdown => "dropdown",
            QuestionInteractionTypes.YesNoMatrix => "yesno",
            QuestionInteractionTypes.ImageSelfGrade => "self_grade",
            QuestionInteractionTypes.ImageHotspot => "click",
            _ => "",
        };
        if (!root.TryGetProperty("kind", out var kind) || kind.GetString() != expectedKind)
            return $"Interaction JSON kind must be '{expectedKind}'.";

        if (interactionType == QuestionInteractionTypes.ImageSelfGrade) return null;
        if (interactionType == QuestionInteractionTypes.ImageHotspot)
        {
            if (!root.TryGetProperty("correct", out var region) || !HasNumber(region, "x") || !HasNumber(region, "y") || !HasNumber(region, "w") || !HasNumber(region, "h"))
                return "Image hotspot JSON requires a numeric correct region (x, y, w, h).";
            var x = region.GetProperty("x").GetDouble();
            var y = region.GetProperty("y").GetDouble();
            var width = region.GetProperty("w").GetDouble();
            var height = region.GetProperty("h").GetDouble();
            if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1)
                return "Image hotspot coordinates must describe a positive region inside the image.";
            return null;
        }

        if (!root.TryGetProperty("prompts", out var prompts) || prompts.ValueKind != JsonValueKind.Array || prompts.GetArrayLength() == 0)
            return "Interaction JSON requires at least one prompt.";
        if (prompts.EnumerateArray().Any(prompt => !HasText(prompt, "text") || !HasText(prompt, "correct")))
            return "Every interaction prompt requires text and a correct answer.";
        if (interactionType is QuestionInteractionTypes.UnorderedSelection or QuestionInteractionTypes.FixedMatch or QuestionInteractionTypes.Ordering &&
            (!root.TryGetProperty("pool", out var pool) || pool.ValueKind != JsonValueKind.Array || pool.GetArrayLength() == 0))
            return "Selection, match, and ordering questions require a non-empty pool.";
        if (interactionType is QuestionInteractionTypes.UnorderedSelection or QuestionInteractionTypes.FixedMatch or QuestionInteractionTypes.Ordering)
        {
            var poolValues = ReadStringArray(root.GetProperty("pool"));
            if (poolValues.Any(string.IsNullOrWhiteSpace) || poolValues.Distinct(StringComparer.Ordinal).Count() != poolValues.Count)
                return "The interaction pool must contain unique, non-empty values.";
            if (prompts.EnumerateArray().Any(prompt => !poolValues.Contains(prompt.GetProperty("correct").GetString() ?? "", StringComparer.Ordinal)))
                return "Every correct answer must exist in the interaction pool.";
        }
        if (interactionType == QuestionInteractionTypes.Dropdown)
        {
            foreach (var prompt in prompts.EnumerateArray())
            {
                if (!prompt.TryGetProperty("options", out var dropdownOptions) || dropdownOptions.ValueKind != JsonValueKind.Array || dropdownOptions.GetArrayLength() < 2)
                    return "Every dropdown prompt requires at least two options.";
                var values = ReadStringArray(dropdownOptions);
                if (!values.Contains(prompt.GetProperty("correct").GetString() ?? "", StringComparer.Ordinal))
                    return "Every dropdown correct answer must exist in its options.";
            }
        }
        if (interactionType == QuestionInteractionTypes.YesNoMatrix &&
            prompts.EnumerateArray().Any(prompt => prompt.GetProperty("correct").GetString() is not ("Yes" or "No")))
            return "Every yes/no matrix answer must be either 'Yes' or 'No'.";
        return null;
    }

    public static bool TryGrade(
        Question question,
        IReadOnlyList<QuestionOption> options,
        IReadOnlyList<string>? selectedAnswers,
        bool? selfGrade,
        JsonElement? interactionResponse,
        bool allowBlank,
        out QuestionGradeResult? result,
        out string? error)
    {
        result = null;
        error = null;
        var type = question.InteractionType;
        if (QuestionInteractionTypes.UsesChoiceOptions(type))
        {
            var selected = (selectedAnswers ?? [])
                .Select(value => value.Trim().ToUpperInvariant())
                .Where(value => value.Length > 0)
                .Distinct()
                .Order()
                .ToList();
            var valid = options.Select(option => option.OptionKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (selected.Any(key => !valid.Contains(key)))
            {
                error = "One or more selected answers are invalid.";
                return false;
            }
            if (selected.Count == 0)
            {
                if (allowBlank)
                {
                    var missingCorrect = options.Where(option => option.IsCorrect).Select(option => option.OptionKey).Order().ToList();
                    result = new QuestionGradeResult(false, missingCorrect, null, JsonSerializer.Serialize(new { selectedAnswers = selected }));
                    return true;
                }
                error = "Select at least one answer.";
                return false;
            }
            if (type is QuestionInteractionTypes.SingleChoice or QuestionInteractionTypes.YesNo && selected.Count != 1)
            {
                error = "Select exactly one answer.";
                return false;
            }
            var correct = options.Where(option => option.IsCorrect).Select(option => option.OptionKey).Order().ToList();
            result = new QuestionGradeResult(
                selected.SequenceEqual(correct, StringComparer.OrdinalIgnoreCase),
                correct,
                null,
                JsonSerializer.Serialize(new { selectedAnswers = selected }));
            return true;
        }

        if (type == QuestionInteractionTypes.ImageSelfGrade)
        {
            if (selfGrade is null)
            {
                if (allowBlank)
                {
                    result = new QuestionGradeResult(false, [], null, null);
                    return true;
                }
                error = "Mark the answer as correct or incorrect.";
                return false;
            }
            result = new QuestionGradeResult(selfGrade.Value, [], null, JsonSerializer.Serialize(new { selfGrade }));
            return true;
        }

        if (string.IsNullOrWhiteSpace(question.InteractionData))
        {
            error = "Question interaction data is missing.";
            return false;
        }

        using var definitionDocument = JsonDocument.Parse(question.InteractionData);
        var definition = definitionDocument.RootElement;
        if (type == QuestionInteractionTypes.ImageHotspot)
            return TryGradeHotspot(definition, interactionResponse, out result, out error);

        if (!TryReadAnswers(interactionResponse, out var submitted))
        {
            if (allowBlank)
            {
                result = new QuestionGradeResult(false, [], CorrectInteraction(question), null);
                return true;
            }
            error = "Submit an answer for every required field.";
            return false;
        }
        var prompts = definition.GetProperty("prompts").EnumerateArray().ToList();
        var expected = prompts.Select(prompt => prompt.GetProperty("correct").GetString() ?? "").ToList();
        if (type == QuestionInteractionTypes.UnorderedSelection)
        {
            var pool = ReadStringArray(definition.GetProperty("pool"));
            if (submitted.Count == 0 || submitted.Count != submitted.Distinct(StringComparer.Ordinal).Count() || submitted.Any(answer => !pool.Contains(answer, StringComparer.Ordinal)))
            {
                error = "Submitted selections are invalid.";
                return false;
            }
            var submittedSorted = submitted.Order(StringComparer.Ordinal).ToList();
            var expectedSorted = expected.Order(StringComparer.Ordinal).ToList();
            result = new QuestionGradeResult(
                submittedSorted.SequenceEqual(expectedSorted, StringComparer.Ordinal),
                [],
                ToElement(new { answers = expected }),
                JsonSerializer.Serialize(new { answers = submitted }));
            return true;
        }

        if (submitted.Count != expected.Count)
        {
            error = "Submit an answer for every required field.";
            return false;
        }
        if (type == QuestionInteractionTypes.Ordering &&
            submitted.Distinct(StringComparer.Ordinal).Count() != submitted.Count)
        {
            error = "Every ordering option must be used exactly once.";
            return false;
        }
        for (var index = 0; index < prompts.Count; index++)
        {
            IReadOnlyList<string> allowed = type switch
            {
                QuestionInteractionTypes.YesNoMatrix => ["Yes", "No"],
                QuestionInteractionTypes.Dropdown => ReadStringArray(prompts[index].GetProperty("options")),
                _ => ReadStringArray(definition.GetProperty("pool")),
            };
            if (!allowed.Contains(submitted[index], StringComparer.Ordinal))
            {
                error = $"Answer {index + 1} is invalid.";
                return false;
            }
        }

        result = new QuestionGradeResult(
            submitted.SequenceEqual(expected, StringComparer.Ordinal),
            [],
            ToElement(new { answers = expected }),
            JsonSerializer.Serialize(new { answers = submitted }));
        return true;
    }

    public static JsonElement? CorrectInteraction(Question question)
    {
        if (string.IsNullOrWhiteSpace(question.InteractionData)) return null;
        using var document = JsonDocument.Parse(question.InteractionData);
        var root = document.RootElement;
        if (question.InteractionType == QuestionInteractionTypes.ImageHotspot)
            return ToElement(new { region = root.GetProperty("correct") });
        if (root.TryGetProperty("prompts", out var prompts))
            return ToElement(new { answers = prompts.EnumerateArray().Select(prompt => prompt.GetProperty("correct").GetString() ?? "").ToList() });
        return null;
    }

    private static bool TryGradeHotspot(JsonElement definition, JsonElement? response, out QuestionGradeResult? result, out string? error)
    {
        result = null;
        error = null;
        if (response is not { ValueKind: JsonValueKind.Object } answer || !HasNumber(answer, "x") || !HasNumber(answer, "y"))
        {
            error = "Select a point on the image.";
            return false;
        }
        var x = answer.GetProperty("x").GetDouble();
        var y = answer.GetProperty("y").GetDouble();
        if (x is < 0 or > 1 || y is < 0 or > 1)
        {
            error = "Hotspot coordinates must be between 0 and 1.";
            return false;
        }
        var region = definition.GetProperty("correct");
        var rx = region.GetProperty("x").GetDouble();
        var ry = region.GetProperty("y").GetDouble();
        var rw = region.GetProperty("w").GetDouble();
        var rh = region.GetProperty("h").GetDouble();
        var correct = x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
        result = new QuestionGradeResult(correct, [], ToElement(new { region }), JsonSerializer.Serialize(new { x, y }));
        return true;
    }

    private static bool TryReadAnswers(JsonElement? response, out List<string> answers)
    {
        answers = [];
        if (response is not { ValueKind: JsonValueKind.Object } root ||
            !root.TryGetProperty("answers", out var values) || values.ValueKind != JsonValueKind.Array)
            return false;
        foreach (var item in values.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(item.GetString())) return false;
            answers.Add(item.GetString()!);
        }
        return true;
    }

    private static List<string> ReadStringArray(JsonElement element) =>
        element.EnumerateArray().Select(item => item.GetString() ?? "").ToList();

    private static bool HasText(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value.GetString());

    private static bool HasNumber(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number;

    private static void RemoveSolutions(JsonNode? node)
    {
        if (node is JsonObject obj)
        {
            obj.Remove("correct");
            foreach (var value in obj.Select(pair => pair.Value).ToList()) RemoveSolutions(value);
        }
        else if (node is JsonArray array)
        {
            foreach (var value in array) RemoveSolutions(value);
        }
    }

    private static JsonElement? ToElement(JsonNode? node)
    {
        if (node is null) return null;
        using var document = JsonDocument.Parse(node.ToJsonString());
        return document.RootElement.Clone();
    }

    private static JsonElement ToElement<T>(T value)
    {
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(value));
        return document.RootElement.Clone();
    }
}
