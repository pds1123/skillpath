using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Data;
using SkillPath.Api.Models;
using SkillPath.Api.Services;

var builder = WebApplication.CreateBuilder(args);
SQLitePCL.raw.SetProvider(new SQLitePCL.SQLite3Provider_sqlite3());

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "SkillPath API",
        Version = "v1",
        Description = "Authentication, published curriculum, learning progress, question bank, practice, exam, and administration APIs."
    });
});
builder.Services.AddDbContext<SkillPathDbContext>((services, options) =>
{
    var configuration = services.GetRequiredService<IConfiguration>();
    var environment = services.GetRequiredService<IWebHostEnvironment>();
    var configuredConnection = configuration.GetConnectionString("SkillPath")
        ?? throw new InvalidOperationException("Connection string 'SkillPath' is missing.");
    var sqliteConnection = new SqliteConnectionStringBuilder(configuredConnection);
    if (!Path.IsPathRooted(sqliteConnection.DataSource))
        sqliteConnection.DataSource = Path.Combine(environment.ContentRootPath, sqliteConnection.DataSource);
    options.UseSqlite(sqliteConnection.ConnectionString);
});
builder.Services.AddScoped<DatabaseDataStore>();
builder.Services.AddScoped<CurriculumRevisionService>();
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
    if (!builder.Configuration.GetValue<bool>("Testing:SkipSeed"))
    {
        await LegacyFileImporter.ImportAsync(db, app.Environment, logger);
        await QuestionBankSeeder.SeedAsync(db, app.Environment, logger);
        await IstqbCtflSeeder.SeedAsync(db, app.Environment, logger);
    }
    var curriculumRevisions = scope.ServiceProvider.GetRequiredService<CurriculumRevisionService>();
    await curriculumRevisions.EnsureInitialRevisions();
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
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapFallback(async context =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    var indexPath = Path.Combine(app.Environment.WebRootPath ?? string.Empty, "index.html");
    if (!File.Exists(indexPath))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.SendFileAsync(indexPath);
});

app.Run();

public partial class Program;
