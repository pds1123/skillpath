using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SkillPath.Api.Data;

public sealed class SkillPathDbContextFactory : IDesignTimeDbContextFactory<SkillPathDbContext>
{
    public SkillPathDbContext CreateDbContext(string[] args)
    {
        SQLitePCL.raw.SetProvider(new SQLitePCL.SQLite3Provider_sqlite3());
        var dataSource = Path.Combine(Directory.GetCurrentDirectory(), "App_Data", "skillpath.design.db");
        var options = new DbContextOptionsBuilder<SkillPathDbContext>()
            .UseSqlite($"Data Source={dataSource}")
            .Options;
        return new SkillPathDbContext(options);
    }
}
