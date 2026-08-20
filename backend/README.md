# SkillPath API

ASP.NET Core backend for SkillPath. It provides:

- Cookie-based registration, login, logout, and current-user endpoints.
- Server-side learning progress persistence.
- EF Core migrations with a local SQLite database.
- A database-backed Azure and AWS question API.
- Server-side answer grading, practice sessions, and mock-exam grading.

## Run locally

```bash
npm run db:export
dotnet tool restore
dotnet run --project backend/SkillPath.Api
```

The API listens on `http://127.0.0.1:5050`. Start the React app in a second terminal with `npm run dev`; Vite proxies `/api` requests to the API.

The local database is created automatically at `backend/SkillPath.Api/App_Data/skillpath.db` and is excluded from Git. On the first run:

1. EF Core applies migrations.
2. Existing users and progress are imported from the old `skillpath.json`, if present.
3. `question-bank.seed.json` is imported when the question tables are empty.

`npm run db:export` converts the private TypeScript question files into the local seed file. The seed file remains under `App_Data` and is not committed.

To promote an existing account to administrator during local development, set the bootstrap email before starting the API:

```bash
Admin__BootstrapEmail=you@example.com dotnet run --project backend/SkillPath.Api
```

The matching account is promoted at startup. Keep this value in local environment configuration rather than committing a personal email.

## Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/progress`
- `PUT /api/progress`
- `GET /api/questions?certification=AZ-900&offset=0&limit=50`
- `GET /api/questions/summary?certification=AZ-900`
- `GET /api/questions/{id}`
- `POST /api/questions/{id}/attempts`
- `POST /api/practice-sessions`
- `POST /api/practice-sessions/{id}/finish`
- `POST /api/exams/grade`
- `GET /api/admin/questions`
- `POST /api/admin/questions`
- `PUT /api/admin/questions/{id}`
- `DELETE /api/admin/questions/{id}`
- `GET /api/admin/modules`
- `POST /api/admin/modules`
- `PUT /api/admin/modules/{id}`
- `DELETE /api/admin/modules/{id}`

Question list responses do not contain correct answers. Correct answers and explanations are returned only after the answer is submitted for server-side grading.

SQLite is used for local development. The domain model mirrors `database/schema.sql`, so production can move to SQL Server/Azure SQL through a provider-specific EF Core migration. Before public deployment, also add CSRF protection, rate limiting, email verification, password reset, and production secrets/configuration.
