using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Data;
using SkillPath.Api.Models;

var builder = WebApplication.CreateBuilder(args);
SQLitePCL.raw.SetProvider(new SQLitePCL.SQLite3Provider_sqlite3());
var configuredConnection = builder.Configuration.GetConnectionString("SkillPath")
    ?? throw new InvalidOperationException("Connection string 'SkillPath' is missing.");
var sqliteConnection = new SqliteConnectionStringBuilder(configuredConnection);
if (!Path.IsPathRooted(sqliteConnection.DataSource))
    sqliteConnection.DataSource = Path.Combine(builder.Environment.ContentRootPath, sqliteConnection.DataSource);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "SkillPath API",
        Version = "v1",
        Description = "Authentication, learning progress, question bank, practice, and exam APIs."
    });
});
builder.Services.AddDbContext<SkillPathDbContext>(options =>
    options.UseSqlite(sqliteConnection.ConnectionString));
builder.Services.AddScoped<DatabaseDataStore>();
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "skillpath.session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromDays(14);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var app = builder.Build();

Directory.CreateDirectory(Path.Combine(app.Environment.ContentRootPath, "App_Data"));

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SkillPathDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseStartup");
    await db.Database.MigrateAsync();
    var bootstrapAdminEmail = builder.Configuration["Admin:BootstrapEmail"]?.Trim().ToUpperInvariant();
    if (!string.IsNullOrWhiteSpace(bootstrapAdminEmail))
    {
        var admin = await db.Users.SingleOrDefaultAsync(user => user.NormalizedEmail == bootstrapAdminEmail);
        if (admin is not null && admin.Role != "admin")
        {
            admin.Role = "admin";
            admin.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            logger.LogInformation("Granted the admin role to the configured bootstrap account.");
        }
    }
    await LegacyFileImporter.ImportAsync(db, app.Environment, logger);
    await QuestionBankSeeder.SeedAsync(db, app.Environment, logger);
}

app.UseCors();
app.UseSwagger(options =>
    options.RouteTemplate = "api/swagger/{documentName}/swagger.json");
app.UseSwaggerUI(options =>
{
    options.RoutePrefix = "api/swagger";
    options.SwaggerEndpoint("/api/swagger/v1/swagger.json", "SkillPath API v1");
    options.DocumentTitle = "SkillPath API";
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.Run();

public partial class Program;
