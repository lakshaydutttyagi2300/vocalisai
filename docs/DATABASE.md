# Database

PostgreSQL on **Neon**, accessed only through **Prisma 6**. The schema is `prisma/schema.prisma` (36 models); every change goes through a migration in `prisma/migrations/`.

## Connection

- `src/lib/db.ts` exports the one Prisma client (`db`). `resolveDatabaseUrl()` uses `DATABASE_URL` (Neon's **pooled** address) and, if it's missing, falls back to `DATABASE_URL_UNPOOLED` rewritten to the pooler host, then to Vercel-Neon integration names. This fallback kept the live site up during the 26 Sep 2026 incident; keep it (`tests/unit/db-url.test.ts`).
- Neon project `plain-art-88027021` has these branches (each is a full copy of the database):

| Branch | Used by | Notes |
|---|---|---|
| `production` | the live site | Never point `.env` at it. Scripts refuse it unless run with `--production`. |
| `development` | `.env` (`npm run dev`) | Copied from production on 15 Sep; its question bank is older than live. |
| `test` | `.env.test` (Vitest and Playwright) | Tests create run-scoped rows and delete them. |
| `staging` | `.env.staging` (`scripts/dev-staging.mjs`) and Vercel **Preview** deploys | A copy of live for manual testing. |
| `backup-production-before-*` | nothing | Restore points taken before risky releases. The free plan allows 10 branches in total. |

## Entities

### People, access and plans
| Model | Purpose | Key relations and rules |
|---|---|---|
| `User` | An account (candidate or admin) | `email` unique. `role` is `"CANDIDATE"` or `"ADMIN"`; `isActive=false` suspends. Deleting a user **cascades** to all their data. |
| `Profile` | Optional candidate details and chosen goal | 1:1 with `User`; `goalTrackId` → `GoalTrack`. |
| `EmailVerification` | A sign-up waiting for its emailed code | No `User` exists yet. Holds the hashed code and hashed password; expires. |
| `PasswordResetToken` | Password-reset links | Stores only a hash of the token. |
| `Subscription` | The user's plan | 1:1 with `User`; `plan` is FREE/STARTER/PROFESSIONAL/PREMIUM; `currentPeriodStart/End`; Paddle ids. |
| `UsageEvent` | One row per use of a limited feature | Counted by `checkAndRecordUsage()`; indexed on `(userId, feature, createdAt)`. |
| `RateLimitHit` | Fixed-window counters for logins and sign-up codes | Unique on `(key, windowStart)`. |

### Skills and goals
| Model | Purpose | Key relations and rules |
|---|---|---|
| `Skill` | The skills taxonomy: 12 categories → subcategories → skills (302 nodes) | Self-relation (`parentId`); ids are dotted codes like `ENG.GRM.TENSES`. |
| `UserSkillMastery` | A user's 0-100 mastery per skill | Unique `(userId, skillId)`. |
| `GoalTrack` | A preparation goal (General English, BPO, Interview, Campus, Study Abroad) | `slug` unique; `enabled` controls visibility. |
| `GoalTrackSkill` | Weighted skills in a goal | Composite key `(goalTrackId, skillId)`. |
| `ExamBlueprint` | A goal's exams: a diagnostic recipe or a pointer to a mock template | `slug` unique. `mockTestTemplateId` is a **plain text reference, not a foreign key**; the seed looks templates up by name. |
| `Rubric` | Scoring dimensions for open-ended question types | `key` unique. |

### Questions
| Model | Purpose | Key relations and rules |
|---|---|---|
| `PracticeQuestion` | Every question in the bank (~6,000 live) | `category`, `difficulty`, `type` (question type), `skillId`/`level` tags, `source` (seeded, admin, AI-generated). **Never hard-delete: set `isActive=false`** (old attempts reference it). Optional `itemGroupId` (shared passage/audio) and `examPartId` (pinned to a timed-exam part). |
| `ItemGroup` | A shared stimulus (reading passage, listening audio, chart) used by several questions | `type`; audio/image files live in R2. |

### Practice and analysis
| Model | Purpose | Key relations and rules |
|---|---|---|
| `PracticeAttempt` | One answer to one question | → `User`, `PracticeQuestion`; optional `recordingId`, `mockTestSessionId` (when part of a mock exam), `skillId`/`level` copied at answer time. |
| `PracticeRecording` | An uploaded audio file | `filePath` is the R2 key (or local path in development). |
| `SpeechAnalysis` | The analysis of one recorded attempt | 1:1 with `PracticeAttempt`; `aiAnalysisJson` holds the validated Gemini result; deterministic metrics in columns. |

### Mock exams and timed exams
| Model | Purpose | Key relations and rules |
|---|---|---|
| `MockTestTemplate` | A mock exam definition | Has ordered `MockTestTemplateSection`s (category, difficulty, `questionCount`). Optional `examVariantId` links it to the exam catalogue (runs on the v2 runner). |
| `MockTestSession` | One sitting of a mock exam by one user | → `User`, `MockTestTemplate`; `endedAt`. Has attempts (v1) or item responses (v2), proctoring events and reports. |
| `ExamSessionState` | Server-side state for a v2 timed exam: the plan, current paper, deadlines, audio plays | 1:1 with the session. |
| `ItemResponse` | A v2 answer | Unique `(mockTestSessionId, questionId)`. |
| `ScoreReport` | Computed category scores and readiness | 1:1 with the session; recomputed on view. |
| `ResultsReport` | The AI-written narrative report | 1:1 with the session; generated only on request. |
| `ProctoringEvent` | A camera or tab-switch flag during an exam | → session; indexed by time. |
| `ExamFamily` → `ExamVariant` → `ExamPaper` → `ExamPart` | The exam catalogue (e.g. IELTS-style → Academic → Listening → Part 1) | Deletes cascade down the chain; variant slug unique within a family. |

**How the two exam systems connect:** the older `MockTestTemplate`/`MockTestTemplateSection` system is linked to the newer catalogue by `MockTestTemplate.examVariantId` and `MockTestTemplateSection.examPartId` (both nullable). A template with no link runs on the v1 runner exactly as before.

### Conversation and coach
| Model | Purpose | Key relations and rules |
|---|---|---|
| `ConversationSession` | One AI role-play conversation | → `User`, optional scenario question; `overallAnalysisJson` once finished. |
| `ConversationTurn` | One line of the conversation | → session; optional recording. |
| `CoachMessage` | One message in the coach chat | → `User`; `role` is `"user"` or `"coach"`. |

### Admin
| Model | Purpose | Key relations and rules |
|---|---|---|
| `FeatureFlag` | On/off switches | A missing row means on, except `DEFAULT_OFF_FEATURES`. |
| `ScoringCategoryWeight` | Admin weights for each score category | `category` unique. |
| `AdminAuditLog` | Every admin change, with before/after JSON | Stores `adminId`/`adminEmail` as plain values (**no foreign key**), so the log survives the admin account being deleted. |

## Conventions

- **Ids** are `cuid()` strings, except `Skill` (dotted codes) and composite keys.
- **Enums are text columns** (`role`, `plan`, `category`, `difficulty`, `type`, ...): the project started on SQLite, which has no enums. Valid values are enforced in code (`src/lib/plans-and-roles.ts`, `practice-taxonomy.ts`, `question-types.ts`).
- **JSON is stored in text columns** named `*Json` (e.g. `aiAnalysisJson`, `planJson`, `categoryScoresJson`, `beforeJson`). Parse and validate on the way in; never assume an old row has a newer shape (old results must still render).
- **Deletes:** deleting a `User` cascades to everything they own. Questions are soft-deleted with `isActive`.
- **Timestamps** are stored in UTC.

## Migrations

- **Additive only**: new tables and new nullable columns. Never drop or rename a column that live code or data uses; never edit a migration that has been applied.
- Create one locally against the **development** branch: `npx prisma migrate dev --name <what>`.
- The Vercel build does **not** migrate. Before shipping code that needs a new migration, apply it to production first (with a backup branch): see [DEPLOYMENT.md](DEPLOYMENT.md).
- History: 13 migrations, from `20260915120900_init` to `20260928120000_email_verification_exam_descriptions`. `prisma/migrations-sqlite-archive/` is history only.

## Seeds and data scripts

| Script | What it does | Production |
|---|---|---|
| `npm run seed:skills` (`prisma/seed-skills.mjs`) | Skills taxonomy, goal tracks, blueprints; tags existing questions and attempts. Idempotent. | `-- --production` |
| `npm run seed:skills-content` | The large question bank (`prisma/skills-content/`). Idempotent; changing a generator's order or random seed re-creates items. | `-- --production` |
| `npm run seed:exam-library` | Exam types and exams (`prisma/exam-library/content.mjs`). Creates new ones; refreshes wording only. | `-- --production` |
| `npm run seed:exam-demo` | Three IELTS-style practice tests. | `-- --production` |
| `npm run generate:question-audio` | Records listening audio with Windows voices and uploads it to R2. | `-- --production` |
| `prisma/seed.mjs`, `seed-phase4.mjs`, `seed-fluency.mjs`, `seed-writing.mjs`, `seed-conversation-roles.mjs`, `seed-mock-test-template*.mjs` | The original hand-written content and templates, from before the guarded loaders. | **No guard: they run against whatever `DATABASE_URL` points to.** Only run them on a fresh development database. |
| `prisma/seed-admin.mjs` | Creates a development admin account; the password comes from `ADMIN_SEED_PASSWORD`. | refuses production |
| `prisma/check-*.mjs` | Read-only counts and checks. | read-only |

Before any production write: take a Neon backup branch (`backup-production-before-<what>`).
