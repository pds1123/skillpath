-- SkillPath relational schema
-- Target: SQL Server 2022 / Azure SQL

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE dbo.Users
(
    Id uniqueidentifier NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    Email nvarchar(320) NOT NULL,
    NormalizedEmail nvarchar(320) NOT NULL,
    DisplayName nvarchar(100) NOT NULL,
    PasswordHash nvarchar(500) NOT NULL,
    Status varchar(20) NOT NULL CONSTRAINT DF_Users_Status DEFAULT ('active'),
    CreatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Users_NormalizedEmail UNIQUE (NormalizedEmail),
    CONSTRAINT CK_Users_Status CHECK (Status IN ('active', 'disabled', 'deleted'))
);
GO

CREATE TABLE dbo.UserPreferences
(
    UserId uniqueidentifier NOT NULL CONSTRAINT PK_UserPreferences PRIMARY KEY,
    TimeZone nvarchar(100) NOT NULL CONSTRAINT DF_UserPreferences_TimeZone DEFAULT ('Pacific/Auckland'),
    Theme varchar(20) NOT NULL CONSTRAINT DF_UserPreferences_Theme DEFAULT ('system'),
    UpdatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_UserPreferences_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_UserPreferences_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT CK_UserPreferences_Theme CHECK (Theme IN ('light', 'dark', 'system'))
);
GO

CREATE TABLE dbo.LearningAreas
(
    Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_LearningAreas PRIMARY KEY,
    Slug varchar(80) NOT NULL,
    Name nvarchar(120) NOT NULL,
    Description nvarchar(500) NULL,
    SortOrder int NOT NULL CONSTRAINT DF_LearningAreas_SortOrder DEFAULT (0),
    Status varchar(20) NOT NULL CONSTRAINT DF_LearningAreas_Status DEFAULT ('planned'),
    CreatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_LearningAreas_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_LearningAreas_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_LearningAreas_Slug UNIQUE (Slug),
    CONSTRAINT CK_LearningAreas_Status CHECK (Status IN ('planned', 'published', 'archived'))
);
GO

CREATE TABLE dbo.LearningPaths
(
    Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_LearningPaths PRIMARY KEY,
    LearningAreaId bigint NOT NULL,
    Slug varchar(100) NOT NULL,
    Name nvarchar(160) NOT NULL,
    Description nvarchar(1000) NULL,
    Level varchar(20) NOT NULL CONSTRAINT DF_LearningPaths_Level DEFAULT ('beginner'),
    SortOrder int NOT NULL CONSTRAINT DF_LearningPaths_SortOrder DEFAULT (0),
    Status varchar(20) NOT NULL CONSTRAINT DF_LearningPaths_Status DEFAULT ('draft'),
    CreatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_LearningPaths_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_LearningPaths_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_LearningPaths_LearningAreas FOREIGN KEY (LearningAreaId) REFERENCES dbo.LearningAreas (Id),
    CONSTRAINT UQ_LearningPaths_Slug UNIQUE (Slug),
    CONSTRAINT CK_LearningPaths_Level CHECK (Level IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT CK_LearningPaths_Status CHECK (Status IN ('draft', 'published', 'archived'))
);
GO

CREATE INDEX IX_LearningPaths_Area_Order ON dbo.LearningPaths (LearningAreaId, SortOrder);
GO

CREATE TABLE dbo.Modules
(
    Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Modules PRIMARY KEY,
    LearningPathId bigint NOT NULL,
    Slug varchar(120) NOT NULL,
    Name nvarchar(160) NOT NULL,
    Description nvarchar(1000) NULL,
    SortOrder int NOT NULL,
    Status varchar(20) NOT NULL CONSTRAINT DF_Modules_Status DEFAULT ('draft'),
    CreatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_Modules_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_Modules_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Modules_LearningPaths FOREIGN KEY (LearningPathId) REFERENCES dbo.LearningPaths (Id),
    CONSTRAINT UQ_Modules_Path_Slug UNIQUE (LearningPathId, Slug),
    CONSTRAINT UQ_Modules_Path_Order UNIQUE (LearningPathId, SortOrder),
    CONSTRAINT CK_Modules_Status CHECK (Status IN ('draft', 'published', 'archived'))
);
GO

CREATE TABLE dbo.Lessons
(
    Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Lessons PRIMARY KEY,
    ModuleId bigint NOT NULL,
    Slug varchar(140) NOT NULL,
    Title nvarchar(200) NOT NULL,
    Summary nvarchar(1000) NULL,
    Content nvarchar(max) NOT NULL,
    EstimatedMinutes smallint NULL,
    SortOrder int NOT NULL,
    Status varchar(20) NOT NULL CONSTRAINT DF_Lessons_Status DEFAULT ('draft'),
    CreatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_Lessons_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_Lessons_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Lessons_Modules FOREIGN KEY (ModuleId) REFERENCES dbo.Modules (Id),
    CONSTRAINT UQ_Lessons_Module_Slug UNIQUE (ModuleId, Slug),
    CONSTRAINT UQ_Lessons_Module_Order UNIQUE (ModuleId, SortOrder),
    CONSTRAINT CK_Lessons_EstimatedMinutes CHECK (EstimatedMinutes IS NULL OR EstimatedMinutes > 0),
    CONSTRAINT CK_Lessons_Status CHECK (Status IN ('draft', 'published', 'archived'))
);
GO

CREATE TABLE dbo.Certifications
(
    Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Certifications PRIMARY KEY,
    Code varchar(40) NOT NULL,
    Name nvarchar(200) NOT NULL,
    Provider nvarchar(100) NOT NULL,
    MockQuestionCount smallint NOT NULL,
    Status varchar(20) NOT NULL CONSTRAINT DF_Certifications_Status DEFAULT ('active'),
    CreatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_Certifications_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_Certifications_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Certifications_Code UNIQUE (Code),
    CONSTRAINT CK_Certifications_MockQuestionCount CHECK (MockQuestionCount > 0),
    CONSTRAINT CK_Certifications_Status CHECK (Status IN ('active', 'retired', 'archived'))
);
GO

CREATE TABLE dbo.CertificationModules
(
    CertificationId bigint NOT NULL,
    ModuleId bigint NOT NULL,
    SortOrder int NOT NULL CONSTRAINT DF_CertificationModules_SortOrder DEFAULT (0),
    Weight decimal(5,2) NULL,
    CONSTRAINT PK_CertificationModules PRIMARY KEY (CertificationId, ModuleId),
    CONSTRAINT FK_CertificationModules_Certifications FOREIGN KEY (CertificationId) REFERENCES dbo.Certifications (Id),
    CONSTRAINT FK_CertificationModules_Modules FOREIGN KEY (ModuleId) REFERENCES dbo.Modules (Id),
    CONSTRAINT CK_CertificationModules_Weight CHECK (Weight IS NULL OR (Weight >= 0 AND Weight <= 100))
);
GO

CREATE TABLE dbo.Questions
(
    Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Questions PRIMARY KEY,
    SourceKey varchar(100) NULL,
    QuestionType varchar(30) NOT NULL,
    ContentType varchar(30) NOT NULL CONSTRAINT DF_Questions_ContentType DEFAULT ('practice_question'),
    Prompt nvarchar(max) NOT NULL,
    Explanation nvarchar(max) NULL,
    InteractionData nvarchar(max) NULL,
    Difficulty varchar(20) NOT NULL CONSTRAINT DF_Questions_Difficulty DEFAULT ('beginner'),
    Status varchar(20) NOT NULL CONSTRAINT DF_Questions_Status DEFAULT ('draft'),
    CreatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_Questions_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_Questions_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_Questions_Type CHECK (QuestionType IN ('multiple_choice', 'yes_no', 'drag_drop', 'hotspot', 'self_grade')),
    CONSTRAINT CK_Questions_ContentType CHECK (ContentType IN ('knowledge_check', 'practice_question', 'mock_question')),
    CONSTRAINT CK_Questions_Difficulty CHECK (Difficulty IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT CK_Questions_Status CHECK (Status IN ('draft', 'published', 'archived')),
    CONSTRAINT CK_Questions_InteractionData CHECK (InteractionData IS NULL OR ISJSON(InteractionData) = 1)
);
GO

CREATE UNIQUE INDEX UX_Questions_SourceKey
    ON dbo.Questions (SourceKey)
    WHERE SourceKey IS NOT NULL;
GO

CREATE TABLE dbo.QuestionOptions
(
    Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_QuestionOptions PRIMARY KEY,
    QuestionId bigint NOT NULL,
    OptionKey varchar(20) NOT NULL,
    OptionText nvarchar(max) NOT NULL,
    SortOrder smallint NOT NULL,
    IsCorrect bit NOT NULL CONSTRAINT DF_QuestionOptions_IsCorrect DEFAULT (0),
    CONSTRAINT FK_QuestionOptions_Questions FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id),
    CONSTRAINT UQ_QuestionOptions_Question_Key UNIQUE (QuestionId, OptionKey),
    CONSTRAINT UQ_QuestionOptions_Question_Order UNIQUE (QuestionId, SortOrder)
);
GO

CREATE INDEX IX_QuestionOptions_QuestionId ON dbo.QuestionOptions (QuestionId);
GO

CREATE TABLE dbo.QuestionModules
(
    QuestionId bigint NOT NULL,
    ModuleId bigint NOT NULL,
    IsPrimary bit NOT NULL CONSTRAINT DF_QuestionModules_IsPrimary DEFAULT (0),
    CONSTRAINT PK_QuestionModules PRIMARY KEY (QuestionId, ModuleId),
    CONSTRAINT FK_QuestionModules_Questions FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id),
    CONSTRAINT FK_QuestionModules_Modules FOREIGN KEY (ModuleId) REFERENCES dbo.Modules (Id)
);
GO

CREATE UNIQUE INDEX UX_QuestionModules_OnePrimary
    ON dbo.QuestionModules (QuestionId)
    WHERE IsPrimary = 1;
GO

CREATE INDEX IX_QuestionModules_ModuleId ON dbo.QuestionModules (ModuleId, QuestionId);
GO

CREATE TABLE dbo.CertificationQuestions
(
    CertificationId bigint NOT NULL,
    QuestionId bigint NOT NULL,
    DomainName nvarchar(160) NULL,
    CONSTRAINT PK_CertificationQuestions PRIMARY KEY (CertificationId, QuestionId),
    CONSTRAINT FK_CertificationQuestions_Certifications FOREIGN KEY (CertificationId) REFERENCES dbo.Certifications (Id),
    CONSTRAINT FK_CertificationQuestions_Questions FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id)
);
GO

CREATE INDEX IX_CertificationQuestions_QuestionId ON dbo.CertificationQuestions (QuestionId);
GO

CREATE TABLE dbo.UserPathEnrollments
(
    UserId uniqueidentifier NOT NULL,
    LearningPathId bigint NOT NULL,
    CurrentLessonId bigint NULL,
    StartedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_UserPathEnrollments_StartedAt DEFAULT (SYSUTCDATETIME()),
    LastActivityAt datetimeoffset(0) NOT NULL CONSTRAINT DF_UserPathEnrollments_LastActivityAt DEFAULT (SYSUTCDATETIME()),
    CompletedAt datetimeoffset(0) NULL,
    CONSTRAINT PK_UserPathEnrollments PRIMARY KEY (UserId, LearningPathId),
    CONSTRAINT FK_UserPathEnrollments_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_UserPathEnrollments_LearningPaths FOREIGN KEY (LearningPathId) REFERENCES dbo.LearningPaths (Id),
    CONSTRAINT FK_UserPathEnrollments_CurrentLesson FOREIGN KEY (CurrentLessonId) REFERENCES dbo.Lessons (Id)
);
GO

CREATE INDEX IX_UserPathEnrollments_Recent ON dbo.UserPathEnrollments (UserId, LastActivityAt DESC);
GO

CREATE TABLE dbo.LessonCompletions
(
    UserId uniqueidentifier NOT NULL,
    LessonId bigint NOT NULL,
    CompletedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_LessonCompletions_CompletedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_LessonCompletions PRIMARY KEY (UserId, LessonId),
    CONSTRAINT FK_LessonCompletions_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_LessonCompletions_Lessons FOREIGN KEY (LessonId) REFERENCES dbo.Lessons (Id)
);
GO

CREATE INDEX IX_LessonCompletions_User_Date ON dbo.LessonCompletions (UserId, CompletedAt DESC);
GO

CREATE TABLE dbo.PracticeSessions
(
    Id uniqueidentifier NOT NULL CONSTRAINT PK_PracticeSessions PRIMARY KEY,
    UserId uniqueidentifier NOT NULL,
    CertificationId bigint NULL,
    LearningPathId bigint NULL,
    Mode varchar(20) NOT NULL,
    StartedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_PracticeSessions_StartedAt DEFAULT (SYSUTCDATETIME()),
    FinishedAt datetimeoffset(0) NULL,
    CONSTRAINT FK_PracticeSessions_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_PracticeSessions_Certifications FOREIGN KEY (CertificationId) REFERENCES dbo.Certifications (Id),
    CONSTRAINT FK_PracticeSessions_LearningPaths FOREIGN KEY (LearningPathId) REFERENCES dbo.LearningPaths (Id),
    CONSTRAINT CK_PracticeSessions_Mode CHECK (Mode IN ('quick', 'weak_areas', 'mistakes', 'module'))
);
GO

CREATE INDEX IX_PracticeSessions_User_Date ON dbo.PracticeSessions (UserId, StartedAt DESC);
GO

CREATE TABLE dbo.ExamAttempts
(
    Id uniqueidentifier NOT NULL CONSTRAINT PK_ExamAttempts PRIMARY KEY,
    UserId uniqueidentifier NOT NULL,
    CertificationId bigint NOT NULL,
    Status varchar(20) NOT NULL CONSTRAINT DF_ExamAttempts_Status DEFAULT ('in_progress'),
    StartedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_ExamAttempts_StartedAt DEFAULT (SYSUTCDATETIME()),
    FinishedAt datetimeoffset(0) NULL,
    Score int NULL,
    Total int NULL,
    DurationSeconds int NULL,
    CONSTRAINT FK_ExamAttempts_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_ExamAttempts_Certifications FOREIGN KEY (CertificationId) REFERENCES dbo.Certifications (Id),
    CONSTRAINT CK_ExamAttempts_Status CHECK (Status IN ('in_progress', 'completed', 'abandoned')),
    CONSTRAINT CK_ExamAttempts_Score CHECK (Score IS NULL OR Score >= 0),
    CONSTRAINT CK_ExamAttempts_Total CHECK (Total IS NULL OR Total > 0),
    CONSTRAINT CK_ExamAttempts_Duration CHECK (DurationSeconds IS NULL OR DurationSeconds >= 0)
);
GO

CREATE INDEX IX_ExamAttempts_User_Date ON dbo.ExamAttempts (UserId, StartedAt DESC);
GO

CREATE TABLE dbo.QuestionAttempts
(
    Id uniqueidentifier NOT NULL CONSTRAINT PK_QuestionAttempts PRIMARY KEY,
    UserId uniqueidentifier NOT NULL,
    QuestionId bigint NOT NULL,
    PracticeSessionId uniqueidentifier NULL,
    ExamAttemptId uniqueidentifier NULL,
    IsCorrect bit NULL,
    ResponseData nvarchar(max) NULL,
    SubmittedAt datetimeoffset(0) NOT NULL CONSTRAINT DF_QuestionAttempts_SubmittedAt DEFAULT (SYSUTCDATETIME()),
    DurationSeconds int NULL,
    CONSTRAINT FK_QuestionAttempts_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
    CONSTRAINT FK_QuestionAttempts_Questions FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id),
    CONSTRAINT FK_QuestionAttempts_PracticeSessions FOREIGN KEY (PracticeSessionId) REFERENCES dbo.PracticeSessions (Id),
    CONSTRAINT FK_QuestionAttempts_ExamAttempts FOREIGN KEY (ExamAttemptId) REFERENCES dbo.ExamAttempts (Id),
    CONSTRAINT CK_QuestionAttempts_ResponseData CHECK (ResponseData IS NULL OR ISJSON(ResponseData) = 1),
    CONSTRAINT CK_QuestionAttempts_Duration CHECK (DurationSeconds IS NULL OR DurationSeconds >= 0),
    CONSTRAINT CK_QuestionAttempts_OneSession CHECK (
        NOT (PracticeSessionId IS NOT NULL AND ExamAttemptId IS NOT NULL)
    )
);
GO

CREATE INDEX IX_QuestionAttempts_User_Question_Date
    ON dbo.QuestionAttempts (UserId, QuestionId, SubmittedAt DESC)
    INCLUDE (IsCorrect);
GO

CREATE INDEX IX_QuestionAttempts_PracticeSession ON dbo.QuestionAttempts (PracticeSessionId, SubmittedAt);
GO

CREATE INDEX IX_QuestionAttempts_ExamAttempt ON dbo.QuestionAttempts (ExamAttemptId, SubmittedAt);
GO

CREATE TABLE dbo.QuestionAttemptSelections
(
    QuestionAttemptId uniqueidentifier NOT NULL,
    QuestionOptionId bigint NOT NULL,
    CONSTRAINT PK_QuestionAttemptSelections PRIMARY KEY (QuestionAttemptId, QuestionOptionId),
    CONSTRAINT FK_QuestionAttemptSelections_Attempts FOREIGN KEY (QuestionAttemptId) REFERENCES dbo.QuestionAttempts (Id),
    CONSTRAINT FK_QuestionAttemptSelections_Options FOREIGN KEY (QuestionOptionId) REFERENCES dbo.QuestionOptions (Id)
);
GO

CREATE INDEX IX_QuestionAttemptSelections_OptionId ON dbo.QuestionAttemptSelections (QuestionOptionId);
GO

CREATE TABLE dbo.ExamAttemptQuestions
(
    ExamAttemptId uniqueidentifier NOT NULL,
    QuestionId bigint NOT NULL,
    Position smallint NOT NULL,
    QuestionAttemptId uniqueidentifier NULL,
    CONSTRAINT PK_ExamAttemptQuestions PRIMARY KEY (ExamAttemptId, Position),
    CONSTRAINT FK_ExamAttemptQuestions_ExamAttempts FOREIGN KEY (ExamAttemptId) REFERENCES dbo.ExamAttempts (Id),
    CONSTRAINT FK_ExamAttemptQuestions_Questions FOREIGN KEY (QuestionId) REFERENCES dbo.Questions (Id),
    CONSTRAINT FK_ExamAttemptQuestions_QuestionAttempts FOREIGN KEY (QuestionAttemptId) REFERENCES dbo.QuestionAttempts (Id),
    CONSTRAINT UQ_ExamAttemptQuestions_Attempt_Question UNIQUE (ExamAttemptId, QuestionId),
    CONSTRAINT CK_ExamAttemptQuestions_Position CHECK (Position > 0)
);
GO

CREATE UNIQUE INDEX UX_ExamAttemptQuestions_QuestionAttempt
    ON dbo.ExamAttemptQuestions (QuestionAttemptId)
    WHERE QuestionAttemptId IS NOT NULL;
GO

CREATE INDEX IX_ExamAttemptQuestions_QuestionId ON dbo.ExamAttemptQuestions (QuestionId);
GO
