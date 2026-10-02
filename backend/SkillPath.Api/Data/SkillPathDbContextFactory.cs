using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SkillPath.Api.Data;

public sealed class SkillPathDbContextFactory : IDesignTimeDbContextFactory<SkillPathDbContext>
{
    public SkillPathDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__SkillPath")
            ?? "Host=localhost;Port=5432;Database=skillpath;Username=skillpath;Password=skillpath-dev-password";
        var options = new DbContextOptionsBuilder<SkillPathDbContext>()
            .UseNpgsql(connectionString)
            .Options;
        return new SkillPathDbContext(options);
    }
}
