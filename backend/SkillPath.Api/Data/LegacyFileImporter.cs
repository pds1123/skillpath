using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Models;

namespace SkillPath.Api.Data;

public static class LegacyFileImporter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
    };

    public static async Task ImportAsync(SkillPathDbContext db, IWebHostEnvironment environment, ILogger logger)
    {
        var path = Path.Combine(environment.ContentRootPath, "App_Data", "skillpath.json");
        if (!File.Exists(path) || await db.Users.AnyAsync()) return;

        await using var stream = File.OpenRead(path);
        var document = await JsonSerializer.DeserializeAsync<LegacyStoreDocument>(stream, JsonOptions);
        if (document is null) return;

        db.Users.AddRange(document.Users);
        db.UserProgressDocuments.AddRange(document.Progress);
        foreach (var user in document.Users)
            db.UserPreferences.Add(new UserPreference { UserId = user.Id });

        await db.SaveChangesAsync();
        logger.LogInformation(
            "Imported {UserCount} users and {ProgressCount} progress documents from the legacy JSON store.",
            document.Users.Count,
            document.Progress.Count);
    }

    private sealed class LegacyStoreDocument
    {
        public List<AppUser> Users { get; init; } = [];
        public List<UserProgress> Progress { get; init; } = [];
    }
}
