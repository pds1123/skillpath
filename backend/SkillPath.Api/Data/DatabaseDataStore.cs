using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Models;

namespace SkillPath.Api.Data;

public sealed class DatabaseDataStore(SkillPathDbContext db)
{
    public Task<AppUser?> FindUserByEmail(string normalizedEmail) =>
        db.Users.AsNoTracking().SingleOrDefaultAsync(user => user.NormalizedEmail == normalizedEmail);

    public Task<AppUser?> FindUserById(Guid id) =>
        db.Users.AsNoTracking().SingleOrDefaultAsync(user => user.Id == id);

    public async Task<bool> AddUser(AppUser user)
    {
        if (await db.Users.AnyAsync(existing => existing.NormalizedEmail == user.NormalizedEmail)) return false;

        db.Users.Add(user);
        db.UserPreferences.Add(new UserPreference { UserId = user.Id });
        try
        {
            await db.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            return false;
        }
    }

    public Task<UserProgress?> GetProgress(Guid userId) =>
        db.UserProgressDocuments.AsNoTracking().SingleOrDefaultAsync(progress => progress.UserId == userId);

    public async Task SaveProgress(Guid userId, string json)
    {
        var progress = await db.UserProgressDocuments.SingleOrDefaultAsync(item => item.UserId == userId);
        if (progress is null)
        {
            db.UserProgressDocuments.Add(new UserProgress { UserId = userId, Json = json });
        }
        else
        {
            progress.Json = json;
            progress.UpdatedAt = DateTimeOffset.UtcNow;
        }
        await db.SaveChangesAsync();
    }
}
