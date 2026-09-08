# SkillPath

SkillPath is a full-stack platform for structured, self-paced learning. The current release focuses on guided learning paths, practice questions, progress tracking, and optional assessment preparation.

The product is organised around learning rather than a question catalogue: learners continue from their current lesson, move through ordered modules, check their understanding, and review previous mistakes.

## Current features

### Learning experience

- Learning-area home supporting available and planned learning paths.
- Multiple structured learning paths.
- Ordered modules with concept-focused lessons and knowledge checks.
- Continue Learning, module progress, learning streak, and completed-lesson tracking.
- Quick Practice, weak-area review, mistake review, and complete question browsing.
- Optional certification preparation with timed mock assessments and review.

### Accounts and data

- Cookie-based registration, login, logout, and current-user sessions.
- Server-side progress persistence for signed-in users.
- SQLite database managed through Entity Framework Core migrations.
- Database-backed question APIs for multiple learning paths.
- A server-graded question engine with explicit formats for choice, selection, matching, ordering, dropdown, matrix, self-grade, and image-hotspot questions.
- Public question responses omit solutions; exact submissions and solutions are returned only through grading or reveal endpoints.

### Administration

- Role-protected Admin area.
- Question search, filtering, creation, editing, publishing, and soft archival.
- Module search, ordering, editing, publishing-state management, and soft archival.
- Linked lesson and question counts for each module.

Lesson content editing is not part of the Admin UI yet. The learner curriculum currently comes from `src/data/curriculum.ts`; Module Admin changes are stored in the database and will become the learner-facing source when the curriculum API is connected.

## Architecture

```text
React application
    │
    │  /api through the Vite development proxy
    ▼
ASP.NET Core API
    │
    │  Entity Framework Core
    ▼
SQLite database
```

The database models the curriculum independently from certification material:

```text
Learning Area → Learning Path → Module → Lesson
                                  │
                                  └→ Questions

Certification → Module and Question mappings
User → Lesson completions, practice sessions, attempts, and exam history
```

See [backend/DATABASE_DESIGN.md](backend/DATABASE_DESIGN.md) for the full data model.

## Technology

### Frontend

- React 19
- TypeScript 6
- React Router
- Vite 8
- Tailwind CSS 4

### Backend

- ASP.NET Core on .NET 10
- Entity Framework Core 10
- SQLite for local development
- Cookie authentication with learner and admin roles
- Swagger/OpenAPI

## Run locally

### Requirements

- Node.js 22 or later
- npm
- .NET 10 SDK
- SQLite CLI, optional for inspecting the database

### Install

```bash
npm install
dotnet tool restore
```

If private question-bank source files are available locally, export them before the first API start:

```bash
npm run db:export
```

The exported seed and the resulting database stay under `backend/SkillPath.Api/App_Data/` and are excluded from Git.

### Start the application

Run the API:

```bash
npm run dev:api
```

Run the React application in a second terminal:

```bash
npm run dev
```

Open:

- Application: <http://127.0.0.1:5173>
- API health: <http://127.0.0.1:5050/api/health>
- Swagger UI: <http://127.0.0.1:5050/api/swagger>

The API applies pending migrations and creates the local SQLite database automatically on startup.

## Local administrator

Register an account through the application, then restart the API with its email configured as the bootstrap administrator:

```bash
Admin__BootstrapEmail=you@example.com npm run dev:api
```

The matching account receives the `admin` role. Keep the email in local environment configuration rather than committing it.

## Inspect the database

The local database is created at:

```text
backend/SkillPath.Api/App_Data/skillpath.db
```

Open it with the SQLite CLI:

```bash
sqlite3 backend/SkillPath.Api/App_Data/skillpath.db
```

Useful commands:

```sql
.tables
.headers on
.mode column

SELECT Id, Email, DisplayName, Role, Status FROM Users;
SELECT Id, LearningPathId, Name, SortOrder, Status FROM Modules ORDER BY LearningPathId, SortOrder;
SELECT Id, ModuleId, Title, SortOrder, Status FROM Lessons LIMIT 20;
SELECT Id, LegacyId, InteractionType, Status FROM Questions LIMIT 20;

.schema Modules
.quit
```

A SQLite viewer extension can also open the database as a table-based interface. Passwords are stored only as hashes, never as plain text.

## Main routes

| Route | Purpose |
|---|---|
| `/` | Learning-area home |
| `/cloud` | Azure and AWS learning paths |
| `/learning` | Continue Learning and progress |
| `/learning/modules` | Module list and lessons |
| `/questions` | Browse the complete question bank |
| `/practice/quick` | Quick practice |
| `/certification` | Optional certification preparation |
| `/login` | Registration and sign-in |
| `/admin/questions` | Question management |
| `/admin/modules` | Module management |

## Project structure

```text
src/
  auth/                 Frontend authentication state
  components/           Shared application and question components
  data/                 Curriculum and local development data
  hooks/                Certification and progress hooks
  pages/                Learner, assessment, account, and Admin pages
  services/             Typed API client
  types/                Shared frontend question-engine contracts

backend/
  SkillPath.Api/
    Contracts/          API request and response models
    Controllers/        Authentication, progress, question, exam, and Admin APIs
    Data/               EF Core context, migrations, import, and seeding
    Models/             Database entities
    Services/           Central question validation and grading engine
  SkillPath.Api.Tests/  xUnit unit and API integration tests
  database/             Provider-neutral database design and SQL reference

scripts/                Question export and source-processing utilities
tests/e2e/              Playwright browser and Axe accessibility tests
.github/workflows/      Automated CI quality gates
```

## Private development data

The following are intentionally excluded from Git:

- Full private question banks.
- Correct-answer and interactive-question source files.
- Question images and source PDFs.
- SQLite databases and generated seed files.
- Generated database diagram images.
- Local API keys, administrator email, and editor/tool state.

The committed `*.example.ts` files keep the frontend buildable without publishing the private question data.

## Checks

```bash
npm run lint
npm run build
npm run test:unit:coverage
npm run test:backend
npm run test:e2e
```

`npm test` runs the frontend unit tests and backend test suite. `npm run test:all` runs lint, production build, coverage, backend tests, and browser tests.

The GitHub Actions workflow runs on every push and pull request to `main`:

```text
Frontend lint, build, and component coverage
                    +
Backend unit tests, API integration tests, and clean migration
                    ↓
Playwright user flows and Axe accessibility checks
```

Test databases are isolated from the local development database. CI reports include frontend coverage, backend coverage/TRX results, and Playwright failure traces.

## License

MIT. See [LICENSE](LICENSE).
