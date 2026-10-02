using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SkillPath.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgreSql : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Certifications",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Provider = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MockQuestionCount = table.Column<short>(type: "smallint", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Certifications", x => x.Id);
                    table.CheckConstraint("CK_Certifications_MockQuestionCount", "\"MockQuestionCount\" > 0");
                    table.CheckConstraint("CK_Certifications_Status", "\"Status\" IN ('active', 'retired', 'archived')");
                });

            migrationBuilder.CreateTable(
                name: "LearningAreas",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LearningAreas", x => x.Id);
                    table.CheckConstraint("CK_LearningAreas_Status", "\"Status\" IN ('planned', 'published', 'archived')");
                });

            migrationBuilder.CreateTable(
                name: "Questions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SourceAttribution = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    SourceReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LegacyId = table.Column<int>(type: "integer", nullable: false),
                    QuestionType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    InteractionType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Prompt = table.Column<string>(type: "text", nullable: false),
                    Explanation = table.Column<string>(type: "text", nullable: true),
                    InteractionData = table.Column<string>(type: "jsonb", nullable: true),
                    TableData = table.Column<string>(type: "jsonb", nullable: true),
                    Mode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Difficulty = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Questions", x => x.Id);
                    table.CheckConstraint("CK_Questions_ContentType", "\"ContentType\" IN ('knowledge_check', 'practice_question', 'mock_question')");
                    table.CheckConstraint("CK_Questions_Difficulty", "\"Difficulty\" IN ('beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("CK_Questions_InteractionType", "\"InteractionType\" IN ('single_choice', 'multiple_choice', 'yes_no', 'unordered_selection', 'fixed_match', 'ordering', 'dropdown', 'yes_no_matrix', 'image_self_grade', 'image_hotspot')");
                    table.CheckConstraint("CK_Questions_Mode", "\"Mode\" IN ('quiz', 'reveal', 'read')");
                    table.CheckConstraint("CK_Questions_Status", "\"Status\" IN ('draft', 'published', 'archived')");
                    table.CheckConstraint("CK_Questions_Type", "\"QuestionType\" IN ('multiple_choice', 'yes_no', 'drag_drop', 'hotspot', 'self_grade')");
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    NormalizedEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.CheckConstraint("CK_Users_Role", "\"Role\" IN ('learner', 'admin')");
                    table.CheckConstraint("CK_Users_Status", "\"Status\" IN ('active', 'disabled', 'deleted')");
                });

            migrationBuilder.CreateTable(
                name: "LearningPaths",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LearningAreaId = table.Column<long>(type: "bigint", nullable: false),
                    Slug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LearningPaths", x => x.Id);
                    table.CheckConstraint("CK_LearningPaths_Level", "\"Level\" IN ('beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("CK_LearningPaths_Status", "\"Status\" IN ('draft', 'published', 'archived')");
                    table.ForeignKey(
                        name: "FK_LearningPaths_LearningAreas_LearningAreaId",
                        column: x => x.LearningAreaId,
                        principalTable: "LearningAreas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CertificationQuestions",
                columns: table => new
                {
                    CertificationId = table.Column<long>(type: "bigint", nullable: false),
                    QuestionId = table.Column<long>(type: "bigint", nullable: false),
                    DomainName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CertificationQuestions", x => new { x.CertificationId, x.QuestionId });
                    table.ForeignKey(
                        name: "FK_CertificationQuestions_Certifications_CertificationId",
                        column: x => x.CertificationId,
                        principalTable: "Certifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CertificationQuestions_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuestionOptions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionId = table.Column<long>(type: "bigint", nullable: false),
                    OptionKey = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    OptionText = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<short>(type: "smallint", nullable: false),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionOptions_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ContentRevisions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EntityType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    EntityId = table.Column<long>(type: "bigint", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    ChangeType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SnapshotJson = table.Column<string>(type: "jsonb", nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ChangedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentRevisions", x => x.Id);
                    table.CheckConstraint("CK_ContentRevisions_ChangeType", "\"ChangeType\" IN ('seeded', 'created', 'updated', 'published', 'unpublished', 'reordered', 'archived')");
                    table.CheckConstraint("CK_ContentRevisions_EntityType", "\"EntityType\" IN ('module', 'lesson')");
                    table.CheckConstraint("CK_ContentRevisions_Version", "\"Version\" > 0");
                    table.ForeignKey(
                        name: "FK_ContentRevisions_Users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ExamAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CertificationId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    FinishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Score = table.Column<int>(type: "integer", nullable: true),
                    Total = table.Column<int>(type: "integer", nullable: true),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamAttempts", x => x.Id);
                    table.CheckConstraint("CK_ExamAttempts_Duration", "\"DurationSeconds\" IS NULL OR \"DurationSeconds\" >= 0");
                    table.CheckConstraint("CK_ExamAttempts_Score", "\"Score\" IS NULL OR \"Score\" >= 0");
                    table.CheckConstraint("CK_ExamAttempts_Status", "\"Status\" IN ('in_progress', 'completed', 'abandoned')");
                    table.CheckConstraint("CK_ExamAttempts_Total", "\"Total\" IS NULL OR \"Total\" > 0");
                    table.ForeignKey(
                        name: "FK_ExamAttempts_Certifications_CertificationId",
                        column: x => x.CertificationId,
                        principalTable: "Certifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ExamAttempts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserPreferences",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TimeZone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Theme = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPreferences", x => x.UserId);
                    table.CheckConstraint("CK_UserPreferences_Theme", "\"Theme\" IN ('light', 'dark', 'system')");
                    table.ForeignKey(
                        name: "FK_UserPreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserProgressDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Json = table.Column<string>(type: "jsonb", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserProgressDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserProgressDocuments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Modules",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LearningPathId = table.Column<long>(type: "bigint", nullable: false),
                    Slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Modules", x => x.Id);
                    table.CheckConstraint("CK_Modules_Status", "\"Status\" IN ('draft', 'published', 'archived')");
                    table.ForeignKey(
                        name: "FK_Modules_LearningPaths_LearningPathId",
                        column: x => x.LearningPathId,
                        principalTable: "LearningPaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PracticeSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CertificationId = table.Column<long>(type: "bigint", nullable: true),
                    LearningPathId = table.Column<long>(type: "bigint", nullable: true),
                    Mode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    FinishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PracticeSessions", x => x.Id);
                    table.CheckConstraint("CK_PracticeSessions_Mode", "\"Mode\" IN ('quick', 'weak_areas', 'mistakes', 'module')");
                    table.ForeignKey(
                        name: "FK_PracticeSessions_Certifications_CertificationId",
                        column: x => x.CertificationId,
                        principalTable: "Certifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PracticeSessions_LearningPaths_LearningPathId",
                        column: x => x.LearningPathId,
                        principalTable: "LearningPaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PracticeSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CertificationModules",
                columns: table => new
                {
                    CertificationId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleId = table.Column<long>(type: "bigint", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Weight = table.Column<decimal>(type: "numeric", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CertificationModules", x => new { x.CertificationId, x.ModuleId });
                    table.CheckConstraint("CK_CertificationModules_Weight", "\"Weight\" IS NULL OR (\"Weight\" >= 0 AND \"Weight\" <= 100)");
                    table.ForeignKey(
                        name: "FK_CertificationModules_Certifications_CertificationId",
                        column: x => x.CertificationId,
                        principalTable: "Certifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CertificationModules_Modules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "Modules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Lessons",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ModuleId = table.Column<long>(type: "bigint", nullable: false),
                    Slug = table.Column<string>(type: "character varying(140)", maxLength: 140, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Summary = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Content = table.Column<string>(type: "text", nullable: false),
                    EstimatedMinutes = table.Column<short>(type: "smallint", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Lessons", x => x.Id);
                    table.CheckConstraint("CK_Lessons_EstimatedMinutes", "\"EstimatedMinutes\" IS NULL OR \"EstimatedMinutes\" > 0");
                    table.CheckConstraint("CK_Lessons_Status", "\"Status\" IN ('draft', 'published', 'archived')");
                    table.ForeignKey(
                        name: "FK_Lessons_Modules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "Modules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuestionModules",
                columns: table => new
                {
                    QuestionId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleId = table.Column<long>(type: "bigint", nullable: false),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionModules", x => new { x.QuestionId, x.ModuleId });
                    table.ForeignKey(
                        name: "FK_QuestionModules_Modules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "Modules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuestionModules_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuestionAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<long>(type: "bigint", nullable: false),
                    PracticeSessionId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExamAttemptId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: true),
                    ResponseData = table.Column<string>(type: "jsonb", nullable: true),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionAttempts", x => x.Id);
                    table.CheckConstraint("CK_QuestionAttempts_Duration", "\"DurationSeconds\" IS NULL OR \"DurationSeconds\" >= 0");
                    table.CheckConstraint("CK_QuestionAttempts_OneSession", "NOT (\"PracticeSessionId\" IS NOT NULL AND \"ExamAttemptId\" IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_QuestionAttempts_ExamAttempts_ExamAttemptId",
                        column: x => x.ExamAttemptId,
                        principalTable: "ExamAttempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuestionAttempts_PracticeSessions_PracticeSessionId",
                        column: x => x.PracticeSessionId,
                        principalTable: "PracticeSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuestionAttempts_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuestionAttempts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LessonCompletions",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LessonId = table.Column<long>(type: "bigint", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonCompletions", x => new { x.UserId, x.LessonId });
                    table.ForeignKey(
                        name: "FK_LessonCompletions_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LessonCompletions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserPathEnrollments",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LearningPathId = table.Column<long>(type: "bigint", nullable: false),
                    CurrentLessonId = table.Column<long>(type: "bigint", nullable: true),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastActivityAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPathEnrollments", x => new { x.UserId, x.LearningPathId });
                    table.ForeignKey(
                        name: "FK_UserPathEnrollments_LearningPaths_LearningPathId",
                        column: x => x.LearningPathId,
                        principalTable: "LearningPaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserPathEnrollments_Lessons_CurrentLessonId",
                        column: x => x.CurrentLessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserPathEnrollments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ExamAttemptQuestions",
                columns: table => new
                {
                    ExamAttemptId = table.Column<Guid>(type: "uuid", nullable: false),
                    Position = table.Column<short>(type: "smallint", nullable: false),
                    QuestionId = table.Column<long>(type: "bigint", nullable: false),
                    QuestionAttemptId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamAttemptQuestions", x => new { x.ExamAttemptId, x.Position });
                    table.CheckConstraint("CK_ExamAttemptQuestions_Position", "\"Position\" > 0");
                    table.ForeignKey(
                        name: "FK_ExamAttemptQuestions_ExamAttempts_ExamAttemptId",
                        column: x => x.ExamAttemptId,
                        principalTable: "ExamAttempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ExamAttemptQuestions_QuestionAttempts_QuestionAttemptId",
                        column: x => x.QuestionAttemptId,
                        principalTable: "QuestionAttempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ExamAttemptQuestions_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuestionAttemptSelections",
                columns: table => new
                {
                    QuestionAttemptId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionOptionId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionAttemptSelections", x => new { x.QuestionAttemptId, x.QuestionOptionId });
                    table.ForeignKey(
                        name: "FK_QuestionAttemptSelections_QuestionAttempts_QuestionAttemptId",
                        column: x => x.QuestionAttemptId,
                        principalTable: "QuestionAttempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuestionAttemptSelections_QuestionOptions_QuestionOptionId",
                        column: x => x.QuestionOptionId,
                        principalTable: "QuestionOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CertificationModules_ModuleId",
                table: "CertificationModules",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_CertificationQuestions_QuestionId",
                table: "CertificationQuestions",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_Certifications_Code",
                table: "Certifications",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContentRevisions_ChangedByUserId",
                table: "ContentRevisions",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentRevisions_EntityType_EntityId_ChangedAt",
                table: "ContentRevisions",
                columns: new[] { "EntityType", "EntityId", "ChangedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentRevisions_EntityType_EntityId_Version",
                table: "ContentRevisions",
                columns: new[] { "EntityType", "EntityId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExamAttemptQuestions_ExamAttemptId_QuestionId",
                table: "ExamAttemptQuestions",
                columns: new[] { "ExamAttemptId", "QuestionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExamAttemptQuestions_QuestionAttemptId",
                table: "ExamAttemptQuestions",
                column: "QuestionAttemptId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExamAttemptQuestions_QuestionId",
                table: "ExamAttemptQuestions",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamAttempts_CertificationId",
                table: "ExamAttempts",
                column: "CertificationId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamAttempts_UserId_StartedAt",
                table: "ExamAttempts",
                columns: new[] { "UserId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_LearningAreas_Slug",
                table: "LearningAreas",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LearningPaths_LearningAreaId_SortOrder",
                table: "LearningPaths",
                columns: new[] { "LearningAreaId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_LearningPaths_Slug",
                table: "LearningPaths",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LessonCompletions_LessonId",
                table: "LessonCompletions",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_LessonCompletions_UserId_CompletedAt",
                table: "LessonCompletions",
                columns: new[] { "UserId", "CompletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_ModuleId_Slug",
                table: "Lessons",
                columns: new[] { "ModuleId", "Slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_ModuleId_SortOrder",
                table: "Lessons",
                columns: new[] { "ModuleId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Modules_LearningPathId_Slug",
                table: "Modules",
                columns: new[] { "LearningPathId", "Slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Modules_LearningPathId_SortOrder",
                table: "Modules",
                columns: new[] { "LearningPathId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PracticeSessions_CertificationId",
                table: "PracticeSessions",
                column: "CertificationId");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeSessions_LearningPathId",
                table: "PracticeSessions",
                column: "LearningPathId");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeSessions_UserId_StartedAt",
                table: "PracticeSessions",
                columns: new[] { "UserId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_QuestionAttempts_ExamAttemptId_SubmittedAt",
                table: "QuestionAttempts",
                columns: new[] { "ExamAttemptId", "SubmittedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_QuestionAttempts_PracticeSessionId_SubmittedAt",
                table: "QuestionAttempts",
                columns: new[] { "PracticeSessionId", "SubmittedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_QuestionAttempts_QuestionId",
                table: "QuestionAttempts",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionAttempts_UserId_QuestionId_SubmittedAt",
                table: "QuestionAttempts",
                columns: new[] { "UserId", "QuestionId", "SubmittedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_QuestionAttemptSelections_QuestionOptionId",
                table: "QuestionAttemptSelections",
                column: "QuestionOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionModules_ModuleId_QuestionId",
                table: "QuestionModules",
                columns: new[] { "ModuleId", "QuestionId" });

            migrationBuilder.CreateIndex(
                name: "IX_QuestionModules_QuestionId",
                table: "QuestionModules",
                column: "QuestionId",
                unique: true,
                filter: "\"IsPrimary\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionOptions_QuestionId_OptionKey",
                table: "QuestionOptions",
                columns: new[] { "QuestionId", "OptionKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuestionOptions_QuestionId_SortOrder",
                table: "QuestionOptions",
                columns: new[] { "QuestionId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Questions_SourceKey",
                table: "Questions",
                column: "SourceKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserPathEnrollments_CurrentLessonId",
                table: "UserPathEnrollments",
                column: "CurrentLessonId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPathEnrollments_LearningPathId",
                table: "UserPathEnrollments",
                column: "LearningPathId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPathEnrollments_UserId_LastActivityAt",
                table: "UserPathEnrollments",
                columns: new[] { "UserId", "LastActivityAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UserProgressDocuments_UserId",
                table: "UserProgressDocuments",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_NormalizedEmail",
                table: "Users",
                column: "NormalizedEmail",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CertificationModules");

            migrationBuilder.DropTable(
                name: "CertificationQuestions");

            migrationBuilder.DropTable(
                name: "ContentRevisions");

            migrationBuilder.DropTable(
                name: "ExamAttemptQuestions");

            migrationBuilder.DropTable(
                name: "LessonCompletions");

            migrationBuilder.DropTable(
                name: "QuestionAttemptSelections");

            migrationBuilder.DropTable(
                name: "QuestionModules");

            migrationBuilder.DropTable(
                name: "UserPathEnrollments");

            migrationBuilder.DropTable(
                name: "UserPreferences");

            migrationBuilder.DropTable(
                name: "UserProgressDocuments");

            migrationBuilder.DropTable(
                name: "QuestionAttempts");

            migrationBuilder.DropTable(
                name: "QuestionOptions");

            migrationBuilder.DropTable(
                name: "Lessons");

            migrationBuilder.DropTable(
                name: "ExamAttempts");

            migrationBuilder.DropTable(
                name: "PracticeSessions");

            migrationBuilder.DropTable(
                name: "Questions");

            migrationBuilder.DropTable(
                name: "Modules");

            migrationBuilder.DropTable(
                name: "Certifications");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "LearningPaths");

            migrationBuilder.DropTable(
                name: "LearningAreas");
        }
    }
}
