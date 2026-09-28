# Architecture - VocalisAi

Snapshot: 28 Sep 2026. Everything here was read from the code, not assumed.

VocalisAi (the npm package is still called `proacting`, its old name) helps people prepare for English exams, workplace assessments and job interviews. It offers:
- practice questions;
- short skill drills;
- timed, camera-checked mock exams;
- AI speech analysis of recorded answers;
- AI voice role-play conversations;
- an AI coach.

It also has an admin area for questions, exams, candidates and settings.

- **Live site:** https://vocalisai.vercel.app
- **Code:** https://github.com/lakshaydutttyagi2300/vocalisai. This repository is **PUBLIC**, so never commit secrets.

## 1. Stack

| Layer | What | Version / notes |
|---|---|---|
| Framework | Next.js App Router, full-stack (pages and API routes in one app) | `next ^16.3.5`. **Not the Next.js you know:** read `AGENTS.md` and `node_modules/next/dist/docs/`. The old `middleware.ts` is now `src/proxy.ts`. `after()` from `next/server` runs work after the response is sent. |
| UI | React 19, Tailwind CSS 4 (`@tailwindcss/postcss`), `lucide-react` icons wrapped in `src/components/ui/Icon.tsx` | Design reference: `design/vocalisai-design-system.html`. |
| Language | TypeScript 7 (`typescript ^7.0.2`) | `npm run lint` does not work (see KNOWN_ISSUES). The type gate is `npx tsc --noEmit`. |
| Database | PostgreSQL on **Neon**, through **Prisma 6.12** (`prisma/schema.prisma`) | 12 migrations in `prisma/migrations/`. |
| Auth | NextAuth v4, email and password (bcryptjs), JWT sessions | `src/lib/auth.ts`, `src/proxy.ts`. |
| File storage | Cloudflare **R2** through the AWS S3 SDK (presigned uploads) | Falls back to the local `uploads/` folder when the R2 variables are missing (dev only). |
| AI | **Groq** Whisper (speech-to-text) and **Google Gemini** (analysis, coach, conversation, reports, rewrites, scenarios) | `src/lib/providers/*`. |
| TTS | Browser/device voices (free mode, current). **ElevenLabs** is built in but off (no key). | `src/lib/tts/*`, `src/components/speech/*`. |
| Email | **Resend** (password-reset email) | `src/lib/email.ts`. |
| Billing | **Paddle**: webhook plus a billing page | Not fully configured in production (see SERVICES_AND_SECRETS). |
| Hosting | **Vercel**, project `vocalis-ai/vocalisai` | Every push to `main` auto-deploys to production. `vercel.json` only sets `framework: nextjs`. |
| Tests | Vitest (unit tests, against a Neon test branch) and Playwright (browser tests) | `tests/`. |

There are no cron jobs, no queues and no GitHub Actions. Background work uses Next's `after()`, for example saving skill mastery after an answer. See the `after()` helper in `src/app/api/practice/attempts/route.ts`, which calls `src/lib/skills/mastery-store.ts`.

## 2. Folder map

```
src/
  app/                      pages (App Router) and API routes (app/api/**/route.ts)
    (auth)/                 login, signup, forgot-password, reset-password
    admin/                  admin area (role ADMIN)
    api/                    ~70 route handlers (listed below)
    dashboard, practice, skills, goal, mock-tests, exam, speech-analysis,
    progress, coach, billing, profile, privacy, terms, refund-policy
  components/               admin, exam, exam-runner-v2, goals, mock-test, practice,
                            questions, skills, speech, system-check, ui
  hooks/                    useLiveProctoring (camera/tab checks), useMicLevel
  lib/                      all business logic (listed below)
  proxy.ts                  request guard: login required, suspended users, admin role
prisma/
  schema.prisma             35 models
  migrations/               12 migrations (Postgres). migrations-sqlite-archive/ is history only
  seed*.mjs                 seeds (admin, templates, skills, question bank, demo exams)
  skills-content/           the big question bank as code (generators and hand-written items)
  exam-demo/                3 IELTS-style practice tests: content, seed, asset generation
  question-audio/           shared helpers: script hash, speaker-label parsing
  generate-question-audio.mjs     makes listening audio with Windows voices
  generate-listening-voices.mjs   makes listening audio with ElevenLabs (paid, off)
  fix-speaker-labels.mjs    one-off repair: S1/S2 dialogue labels
tests/unit/                 Vitest (23 files, 296 tests)
tests/e2e/                  Playwright (39 tests), including walkthrough.spec.ts
scripts/dev-staging.mjs     runs the app locally against the Neon *staging* branch
benchmark/                  old provider benchmarks and ad-hoc phase test scripts (not part of the app)
design/                     design-system reference page
.claude/                    Claude Code: launch.json (dev servers) and Neon skills
```

## 3. Main parts

### Candidate (learner) side
| Area | Pages | Key logic |
|---|---|---|
| Dashboard | `/dashboard` | readiness, goal card, recent results; `src/app/dashboard/page.tsx` |
| Goal Tracks (Phase 4) | `/goal/choose`, `/goal` | `src/lib/goal-tracks.ts`, `api/goal` |
| Practice library | `/practice`, `/practice/[slug]` (17 modes), `/practice/quick` | `src/lib/practice-taxonomy.ts`, `api/practice/*` |
| Skills (Phase 2) | `/skills`, `/skills/drill/[skillId]`, `/skills/diagnostic/[category]` | `src/lib/skills/*`, `api/skills/*` |
| Mock exams | `/mock-tests`, `/mock-tests/history`, `/mock-tests/results/[id]`, `/exam/results/[id]` (v2) | `api/mock-tests/*`, `src/lib/exam-runner.ts`, `api/exam-sessions/*` |
| Speech analysis | `/speech-analysis`, `/practice/results/[attemptId]` | `src/lib/analyze-attempt.ts`, `src/lib/speech-metrics.ts` |
| AI conversation | `/practice/conversation`, `/practice/conversation/[id]` | `api/conversations/*`, `src/lib/conversation-roles.ts` |
| Coach | `/coach` | `api/coach/*`, `src/lib/coach-profile.ts` |
| Progress | `/progress` | `src/lib/progress.ts` |
| Billing / plan | `/billing` | `src/lib/entitlements.ts`, `src/lib/paddle.ts` |
| Listen buttons / TTS | results page, voice practice, conversation | `api/tts`, `src/components/speech/*` |

### Admin side (`/admin/*`, role `ADMIN`)
- Overview
- Candidates (list, detail, role/plan change, suspend)
- Question Bank (browse, edit, duplicate, enable/disable, bulk import/export XLSX, CSV, JSON)
- Item groups (shared passages/audio/images)
- Exam catalogue (family, variant, paper, part)
- Mock test templates
- Features (flags)
- Scoring weights
- Activity (audit) log

Guarded by `src/proxy.ts` and `src/lib/admin-guard.ts`. Every change is written to `AdminAuditLog`.

### Scoring
- `src/lib/scoring-engine.ts` builds each mock exam's category scores and overall readiness. It is a pure function with admin weights from `scoring-config.ts`.
- Scores are recalculated on every visit to `GET /api/mock-tests/sessions/[id]/score`.
- `src/lib/score-scales/*` holds band/level converters (IELTS-style, CEFR, and others).
- `src/lib/question-types/*` has 16 question types, each with its own grader.
- Skill mastery (`src/lib/skills/mastery.ts`):
  - scores run 0-100;
  - older answers count less (14-day half-life), and harder questions count more;
  - bands: Weak <50 (after at least 5 answers), Developing, Proficient, Mastered >=90.

### Two exam engines
- **v1 (default in production):** the section-by-section mock test (`components/mock-test`).
- **v2 (`exam_runner_v2` flag, currently ON in production):**
  - server-timed papers, autosave, resume and review (`src/lib/exam-runner.ts`, `components/exam-runner-v2`);
  - used only for templates linked to an exam format (IELTS-style practice tests).

## 4. API routes (src/app/api)

- **admin:** audit-log, candidates, exam-catalogue, features, item-groups (with asset presign/complete), overview, questions (CRUD, duplicate, bulk, export, template, validate), scoring-weights, templates, users.
- **auth:** `[...nextauth]`, signup, forgot-password, reset-password.
- **candidate:**
  - billing/usage;
  - coach;
  - conversations;
  - exam-sessions (start, advance, response, submit-paper, audio-play, assets);
  - goal;
  - mock-tests (options, sessions, events, report, score, summary);
  - practice (attempts, analyze, improve, questions, generate, recordings, presign);
  - profile;
  - questions/[id]/audio;
  - skills (drill, diagnostic);
  - system-check/ping;
  - tts and tts/audio/[id].
- **public:** `health` (database check), `webhooks/paddle` (signature-checked).

## 5. Database models (prisma/schema.prisma)

- **People and access:** User, Profile, Subscription, UsageEvent, PasswordResetToken, RateLimitHit.
- **Skills:** Skill, Rubric, UserSkillMastery, GoalTrack, GoalTrackSkill, ExamBlueprint.
- **Questions:** PracticeQuestion, ItemGroup.
- **Practice:** PracticeAttempt, PracticeRecording, SpeechAnalysis.
- **Mock exams:**
  - sessions: MockTestSession, ExamSessionState, ItemResponse, ProctoringEvent;
  - reports: ScoreReport, ResultsReport;
  - templates: MockTestTemplate, MockTestTemplateSection.
- **Exam catalogue:** ExamFamily, ExamVariant, ExamPaper, ExamPart.
- **Conversation and coach:** ConversationSession, ConversationTurn, CoachMessage.
- **Admin:** FeatureFlag, AdminAuditLog, ScoringCategoryWeight.

Database changes are **additive only**: new nullable columns and new tables, never drops.

## 6. Feature flags (`src/lib/feature-flags.ts`, admin "Features" page)

A missing row means **ON**, except for keys in `DEFAULT_OFF_FEATURES`.

| Key | Default | Production (26 Sep audit) | Controls |
|---|---|---|---|
| MOCK_TEST | on | on | starting mock exams |
| INTERVIEW_SIMULATION | on | on | AI conversations |
| AI_SPEECH_ANALYSIS | on | on | analysing recordings |
| PROGRESS_DASHBOARD | on | on | /progress |
| exam_runner_v2 | **off** | **on** | the v2 exam screen for linked templates |
| NATURAL_VOICES | on | on | ElevenLabs generation. It has no effect without a key. |
| skills_all_categories | **off** | off | shows the 4 hidden skill categories |
| one per practice category (GRAMMAR, ...) | on | on | blocks that category everywhere |

## 7. Plans (`src/lib/entitlements.ts`)

- FREE, STARTER, PROFESSIONAL, PREMIUM, with monthly limits per feature (`PLAN_LIMITS`).
- FREE only gets the Beginner and Intermediate difficulties.
- Admins can set a plan by hand. The Paddle webhook would do the same once billing is configured.
