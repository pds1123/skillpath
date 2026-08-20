using Microsoft.EntityFrameworkCore;
using SkillPath.Api.Models;

namespace SkillPath.Api.Data;

public sealed class SkillPathDbContext(DbContextOptions<SkillPathDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<UserProgress> UserProgressDocuments => Set<UserProgress>();
    public DbSet<LearningArea> LearningAreas => Set<LearningArea>();
    public DbSet<LearningPath> LearningPaths => Set<LearningPath>();
    public DbSet<LearningModule> Modules => Set<LearningModule>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Certification> Certifications => Set<Certification>();
    public DbSet<CertificationModule> CertificationModules => Set<CertificationModule>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<QuestionModule> QuestionModules => Set<QuestionModule>();
    public DbSet<CertificationQuestion> CertificationQuestions => Set<CertificationQuestion>();
    public DbSet<UserPathEnrollment> UserPathEnrollments => Set<UserPathEnrollment>();
    public DbSet<LessonCompletion> LessonCompletions => Set<LessonCompletion>();
    public DbSet<PracticeSession> PracticeSessions => Set<PracticeSession>();
    public DbSet<ExamAttemptRecord> ExamAttempts => Set<ExamAttemptRecord>();
    public DbSet<QuestionAttempt> QuestionAttempts => Set<QuestionAttempt>();
    public DbSet<QuestionAttemptSelection> QuestionAttemptSelections => Set<QuestionAttemptSelection>();
    public DbSet<ExamAttemptQuestion> ExamAttemptQuestions => Set<ExamAttemptQuestion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var users = modelBuilder.Entity<AppUser>();
        users.ToTable("Users", table =>
        {
            table.HasCheckConstraint("CK_Users_Status", "Status IN ('active', 'disabled', 'deleted')");
            table.HasCheckConstraint("CK_Users_Role", "Role IN ('learner', 'admin')");
        });
        users.HasKey(x => x.Id);
        users.Property(x => x.Email).HasMaxLength(320);
        users.Property(x => x.NormalizedEmail).HasMaxLength(320);
        users.Property(x => x.DisplayName).HasMaxLength(100);
        users.Property(x => x.PasswordHash).HasMaxLength(500);
        users.Property(x => x.Role).HasMaxLength(20);
        users.Property(x => x.Status).HasMaxLength(20);
        users.HasIndex(x => x.NormalizedEmail).IsUnique();

        var preferences = modelBuilder.Entity<UserPreference>();
        preferences.ToTable("UserPreferences", table => table.HasCheckConstraint("CK_UserPreferences_Theme", "Theme IN ('light', 'dark', 'system')"));
        preferences.HasKey(x => x.UserId);
        preferences.Property(x => x.TimeZone).HasMaxLength(100);
        preferences.Property(x => x.Theme).HasMaxLength(20);
        preferences.HasOne<AppUser>().WithOne().HasForeignKey<UserPreference>(x => x.UserId);

        var progress = modelBuilder.Entity<UserProgress>();
        progress.ToTable("UserProgressDocuments");
        progress.HasKey(x => x.Id);
        progress.HasIndex(x => x.UserId).IsUnique();
        progress.HasOne<AppUser>().WithOne().HasForeignKey<UserProgress>(x => x.UserId);

        var areas = modelBuilder.Entity<LearningArea>();
        areas.ToTable("LearningAreas", table => table.HasCheckConstraint("CK_LearningAreas_Status", "Status IN ('planned', 'published', 'archived')"));
        areas.HasKey(x => x.Id);
        areas.Property(x => x.Slug).HasMaxLength(80);
        areas.Property(x => x.Name).HasMaxLength(120);
        areas.Property(x => x.Description).HasMaxLength(500);
        areas.Property(x => x.Status).HasMaxLength(20);
        areas.HasIndex(x => x.Slug).IsUnique();

        var paths = modelBuilder.Entity<LearningPath>();
        paths.ToTable("LearningPaths", table =>
        {
            table.HasCheckConstraint("CK_LearningPaths_Level", "Level IN ('beginner', 'intermediate', 'advanced')");
            table.HasCheckConstraint("CK_LearningPaths_Status", "Status IN ('draft', 'published', 'archived')");
        });
        paths.HasKey(x => x.Id);
        paths.Property(x => x.Slug).HasMaxLength(100);
        paths.Property(x => x.Name).HasMaxLength(160);
        paths.Property(x => x.Description).HasMaxLength(1000);
        paths.Property(x => x.Level).HasMaxLength(20);
        paths.Property(x => x.Status).HasMaxLength(20);
        paths.HasIndex(x => x.Slug).IsUnique();
        paths.HasIndex(x => new { x.LearningAreaId, x.SortOrder });
        paths.HasOne<LearningArea>().WithMany().HasForeignKey(x => x.LearningAreaId);

        var modules = modelBuilder.Entity<LearningModule>();
        modules.ToTable("Modules", table => table.HasCheckConstraint("CK_Modules_Status", "Status IN ('draft', 'published', 'archived')"));
        modules.HasKey(x => x.Id);
        modules.Property(x => x.Slug).HasMaxLength(120);
        modules.Property(x => x.Name).HasMaxLength(160);
        modules.Property(x => x.Description).HasMaxLength(1000);
        modules.Property(x => x.Status).HasMaxLength(20);
        modules.HasIndex(x => new { x.LearningPathId, x.Slug }).IsUnique();
        modules.HasIndex(x => new { x.LearningPathId, x.SortOrder }).IsUnique();
        modules.HasOne<LearningPath>().WithMany().HasForeignKey(x => x.LearningPathId);

        var lessons = modelBuilder.Entity<Lesson>();
        lessons.ToTable("Lessons", table =>
        {
            table.HasCheckConstraint("CK_Lessons_EstimatedMinutes", "EstimatedMinutes IS NULL OR EstimatedMinutes > 0");
            table.HasCheckConstraint("CK_Lessons_Status", "Status IN ('draft', 'published', 'archived')");
        });
        lessons.HasKey(x => x.Id);
        lessons.Property(x => x.Slug).HasMaxLength(140);
        lessons.Property(x => x.Title).HasMaxLength(200);
        lessons.Property(x => x.Summary).HasMaxLength(1000);
        lessons.Property(x => x.Status).HasMaxLength(20);
        lessons.HasIndex(x => new { x.ModuleId, x.Slug }).IsUnique();
        lessons.HasIndex(x => new { x.ModuleId, x.SortOrder }).IsUnique();
        lessons.HasOne<LearningModule>().WithMany().HasForeignKey(x => x.ModuleId);

        var certifications = modelBuilder.Entity<Certification>();
        certifications.ToTable("Certifications", table =>
        {
            table.HasCheckConstraint("CK_Certifications_MockQuestionCount", "MockQuestionCount > 0");
            table.HasCheckConstraint("CK_Certifications_Status", "Status IN ('active', 'retired', 'archived')");
        });
        certifications.HasKey(x => x.Id);
        certifications.Property(x => x.Code).HasMaxLength(40);
        certifications.Property(x => x.Name).HasMaxLength(200);
        certifications.Property(x => x.Provider).HasMaxLength(100);
        certifications.Property(x => x.Status).HasMaxLength(20);
        certifications.HasIndex(x => x.Code).IsUnique();

        var certificationModules = modelBuilder.Entity<CertificationModule>();
        certificationModules.ToTable("CertificationModules", table => table.HasCheckConstraint("CK_CertificationModules_Weight", "Weight IS NULL OR (Weight >= 0 AND Weight <= 100)"));
        certificationModules.HasKey(x => new { x.CertificationId, x.ModuleId });
        certificationModules.HasOne<Certification>().WithMany().HasForeignKey(x => x.CertificationId);
        certificationModules.HasOne<LearningModule>().WithMany().HasForeignKey(x => x.ModuleId);

        var questions = modelBuilder.Entity<Question>();
        questions.ToTable("Questions", table =>
        {
            table.HasCheckConstraint("CK_Questions_Type", "QuestionType IN ('multiple_choice', 'yes_no', 'drag_drop', 'hotspot', 'self_grade')");
            table.HasCheckConstraint("CK_Questions_ContentType", "ContentType IN ('knowledge_check', 'practice_question', 'mock_question')");
            table.HasCheckConstraint("CK_Questions_Mode", "Mode IN ('quiz', 'reveal', 'read')");
            table.HasCheckConstraint("CK_Questions_Difficulty", "Difficulty IN ('beginner', 'intermediate', 'advanced')");
            table.HasCheckConstraint("CK_Questions_Status", "Status IN ('draft', 'published', 'archived')");
            table.HasCheckConstraint("CK_Questions_InteractionData", "InteractionData IS NULL OR json_valid(InteractionData)");
            table.HasCheckConstraint("CK_Questions_TableData", "TableData IS NULL OR json_valid(TableData)");
        });
        questions.HasKey(x => x.Id);
        questions.Property(x => x.SourceKey).HasMaxLength(100);
        questions.Property(x => x.QuestionType).HasMaxLength(30);
        questions.Property(x => x.ContentType).HasMaxLength(30);
        questions.Property(x => x.Mode).HasMaxLength(20);
        questions.Property(x => x.Difficulty).HasMaxLength(20);
        questions.Property(x => x.Status).HasMaxLength(20);
        questions.HasIndex(x => x.SourceKey).IsUnique();

        var options = modelBuilder.Entity<QuestionOption>();
        options.ToTable("QuestionOptions");
        options.HasKey(x => x.Id);
        options.Property(x => x.OptionKey).HasMaxLength(20);
        options.HasIndex(x => new { x.QuestionId, x.OptionKey }).IsUnique();
        options.HasIndex(x => new { x.QuestionId, x.SortOrder }).IsUnique();
        options.HasOne<Question>().WithMany().HasForeignKey(x => x.QuestionId);

        var questionModules = modelBuilder.Entity<QuestionModule>();
        questionModules.ToTable("QuestionModules");
        questionModules.HasKey(x => new { x.QuestionId, x.ModuleId });
        questionModules.HasIndex(x => x.QuestionId).IsUnique().HasFilter("IsPrimary = 1");
        questionModules.HasIndex(x => new { x.ModuleId, x.QuestionId });
        questionModules.HasOne<Question>().WithMany().HasForeignKey(x => x.QuestionId);
        questionModules.HasOne<LearningModule>().WithMany().HasForeignKey(x => x.ModuleId);

        var certificationQuestions = modelBuilder.Entity<CertificationQuestion>();
        certificationQuestions.ToTable("CertificationQuestions");
        certificationQuestions.HasKey(x => new { x.CertificationId, x.QuestionId });
        certificationQuestions.Property(x => x.DomainName).HasMaxLength(160);
        certificationQuestions.HasIndex(x => x.QuestionId);
        certificationQuestions.HasOne<Certification>().WithMany().HasForeignKey(x => x.CertificationId);
        certificationQuestions.HasOne<Question>().WithMany().HasForeignKey(x => x.QuestionId);

        var enrollments = modelBuilder.Entity<UserPathEnrollment>();
        enrollments.ToTable("UserPathEnrollments");
        enrollments.HasKey(x => new { x.UserId, x.LearningPathId });
        enrollments.HasIndex(x => new { x.UserId, x.LastActivityAt });
        enrollments.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId);
        enrollments.HasOne<LearningPath>().WithMany().HasForeignKey(x => x.LearningPathId);
        enrollments.HasOne<Lesson>().WithMany().HasForeignKey(x => x.CurrentLessonId);

        var completions = modelBuilder.Entity<LessonCompletion>();
        completions.ToTable("LessonCompletions");
        completions.HasKey(x => new { x.UserId, x.LessonId });
        completions.HasIndex(x => new { x.UserId, x.CompletedAt });
        completions.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId);
        completions.HasOne<Lesson>().WithMany().HasForeignKey(x => x.LessonId);

        var practiceSessions = modelBuilder.Entity<PracticeSession>();
        practiceSessions.ToTable("PracticeSessions", table => table.HasCheckConstraint("CK_PracticeSessions_Mode", "Mode IN ('quick', 'weak_areas', 'mistakes', 'module')"));
        practiceSessions.HasKey(x => x.Id);
        practiceSessions.Property(x => x.Mode).HasMaxLength(20);
        practiceSessions.HasIndex(x => new { x.UserId, x.StartedAt });
        practiceSessions.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId);
        practiceSessions.HasOne<Certification>().WithMany().HasForeignKey(x => x.CertificationId);
        practiceSessions.HasOne<LearningPath>().WithMany().HasForeignKey(x => x.LearningPathId);

        var examAttempts = modelBuilder.Entity<ExamAttemptRecord>();
        examAttempts.ToTable("ExamAttempts", table =>
        {
            table.HasCheckConstraint("CK_ExamAttempts_Status", "Status IN ('in_progress', 'completed', 'abandoned')");
            table.HasCheckConstraint("CK_ExamAttempts_Score", "Score IS NULL OR Score >= 0");
            table.HasCheckConstraint("CK_ExamAttempts_Total", "Total IS NULL OR Total > 0");
            table.HasCheckConstraint("CK_ExamAttempts_Duration", "DurationSeconds IS NULL OR DurationSeconds >= 0");
        });
        examAttempts.HasKey(x => x.Id);
        examAttempts.Property(x => x.Status).HasMaxLength(20);
        examAttempts.HasIndex(x => new { x.UserId, x.StartedAt });
        examAttempts.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId);
        examAttempts.HasOne<Certification>().WithMany().HasForeignKey(x => x.CertificationId);

        var attempts = modelBuilder.Entity<QuestionAttempt>();
        attempts.ToTable("QuestionAttempts", table =>
        {
            table.HasCheckConstraint("CK_QuestionAttempts_ResponseData", "ResponseData IS NULL OR json_valid(ResponseData)");
            table.HasCheckConstraint("CK_QuestionAttempts_Duration", "DurationSeconds IS NULL OR DurationSeconds >= 0");
            table.HasCheckConstraint("CK_QuestionAttempts_OneSession", "NOT (PracticeSessionId IS NOT NULL AND ExamAttemptId IS NOT NULL)");
        });
        attempts.HasKey(x => x.Id);
        attempts.HasIndex(x => new { x.UserId, x.QuestionId, x.SubmittedAt });
        attempts.HasIndex(x => new { x.PracticeSessionId, x.SubmittedAt });
        attempts.HasIndex(x => new { x.ExamAttemptId, x.SubmittedAt });
        attempts.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId);
        attempts.HasOne<Question>().WithMany().HasForeignKey(x => x.QuestionId);
        attempts.HasOne<PracticeSession>().WithMany().HasForeignKey(x => x.PracticeSessionId);
        attempts.HasOne<ExamAttemptRecord>().WithMany().HasForeignKey(x => x.ExamAttemptId);

        var selections = modelBuilder.Entity<QuestionAttemptSelection>();
        selections.ToTable("QuestionAttemptSelections");
        selections.HasKey(x => new { x.QuestionAttemptId, x.QuestionOptionId });
        selections.HasIndex(x => x.QuestionOptionId);
        selections.HasOne<QuestionAttempt>().WithMany().HasForeignKey(x => x.QuestionAttemptId);
        selections.HasOne<QuestionOption>().WithMany().HasForeignKey(x => x.QuestionOptionId);

        var examQuestions = modelBuilder.Entity<ExamAttemptQuestion>();
        examQuestions.ToTable("ExamAttemptQuestions", table => table.HasCheckConstraint("CK_ExamAttemptQuestions_Position", "Position > 0"));
        examQuestions.HasKey(x => new { x.ExamAttemptId, x.Position });
        examQuestions.HasIndex(x => new { x.ExamAttemptId, x.QuestionId }).IsUnique();
        examQuestions.HasIndex(x => x.QuestionAttemptId).IsUnique();
        examQuestions.HasIndex(x => x.QuestionId);
        examQuestions.HasOne<ExamAttemptRecord>().WithMany().HasForeignKey(x => x.ExamAttemptId);
        examQuestions.HasOne<Question>().WithMany().HasForeignKey(x => x.QuestionId);
        examQuestions.HasOne<QuestionAttempt>().WithMany().HasForeignKey(x => x.QuestionAttemptId);

        foreach (var foreignKey in modelBuilder.Model.GetEntityTypes().SelectMany(entity => entity.GetForeignKeys()))
            foreignKey.DeleteBehavior = DeleteBehavior.Restrict;
    }
}
