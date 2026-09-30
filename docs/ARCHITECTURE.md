# Architecture

Last verified against the code: 29 Sep 2026.

VocalisAi helps people prepare for English exams, workplace assessments and job interviews. Candidates practise questions, run short skill drills, take timed and camera-checked mock exams, record spoken answers for AI speech analysis, hold AI voice role-play conversations and chat with an AI coach. Admins manage questions, exams, candidates, plans and settings.

- **Live site:** https://vocalisai.vercel.app
- **Code:** https://github.com/lakshaydutttyagi2300/vocalisai. **The repository is public**: never commit secrets.

## 1. Stack

| Layer | What | Notes |
|---|---|---|
| Framework | **Next.js 16** App Router, full-stack (pages and API routes in one app) | Not the Next.js in most tutorials: read `AGENTS.md` and `node_modules/next/dist/docs/`. Middleware is `src/proxy.ts`. `after()` from `next/server` runs work after the response is sent. |
| UI | React 19, Tailwind CSS 4, `lucide-react` icons through `src/components/ui/Icon.tsx` | Design reference: `design/vocalisai-design-system.html`. |
| Language | TypeScript 7 (`tsc`), with the TypeScript 6 API aliased as `typescript` for ESLint and the Next build | Gates: `npx tsc --noEmit` and `npm run lint`. |
| Validation | `zod` 4 | AI replies, question-type answers, and newer API bodies. |
| Database | PostgreSQL on **Neon**, through **Prisma 6** | 36 models, 13 additive migrations. See [DATABASE.md](DATABASE.md). |
| Auth | NextAuth v4: email + password (bcryptjs), JWT sessions, email-verified sign-up | `src/lib/auth.ts`, `src/lib/email-verification.ts`, `src/proxy.ts`. |
| Files | Cloudflare **R2** through the AWS S3 SDK (presigned uploads) | `src/lib/storage.ts`. Falls back to the local `uploads/` folder when R2 isn't configured (development only). |
| AI | **Groq** Whisper (speech-to-text), **Google Gemini** (analysis, coach, conversation, reports, rewrites, scenarios) | `src/lib/providers/*`. |
| Voices | The device's own voices (free mode). ElevenLabs is built in but off. | `src/lib/tts/*`, `src/components/speech/*`. |
| Email | **Gmail SMTP** (sign-up codes, password resets); Resend as a fallback | `src/lib/email.ts`. |
| Billing | **Paddle** webhook and billing page | Not live yet ([TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) #1). |
| Hosting | **Vercel** (`vocalis-ai/vocalisai`) | Every push to `main` deploys to production; other branches get Preview deploys (pointed at the Neon staging branch). |
| Tests | Vitest (39 unit files, ~400 tests, against a Neon test branch) and Playwright (22 browser specs) | `tests/`. |

There are no cron jobs, queues or CI workflows. Background work uses Next's `after()` (for example, saving skill mastery after an answer).

## 2. Folder map

```
src/
  app/                      pages (App Router) and API routes (app/api/**/route.ts)
    (auth)/                 login, signup (with email code), forgot-password, reset-password
    admin/                  admin area (role ADMIN)
    api/                    70 route handlers - see docs/API.md
    dashboard, practice, skills, goal, mock-tests, exam, speech-analysis,
    progress, coach, billing, profile, privacy, terms, refund-policy
  components/               admin, exam, exam-runner-v2, goals, mock-test, practice,
                            questions, skills, speech, system-check, ui (shared)
  hooks/                    useLiveProctoring (camera, faces, tab switches), useMicLevel
  lib/                      business logic, one module per concern (below)
  proxy.ts                  request guard: sign-in, suspension, admin role
prisma/
  schema.prisma             the data model
  migrations/               additive Postgres migrations
  seed*.mjs                 seeds (skills, question bank, exam library, demo exams, admin, ...)
  skills-content/           the large question bank, as code
  exam-library/, exam-demo/ exam definitions and their loaders
  question-audio/           listening-audio helpers (script hash, speaker labels)
tests/unit/                 Vitest
tests/e2e/                  Playwright
scripts/dev-staging.mjs     runs the app locally against the Neon staging branch
docs/                       this documentation
design/                     design-system reference page
```

### `src/lib` at a glance

| Concern | Modules |
|---|---|
| Access | `auth.ts` (NextAuth config, login rate limits), `admin-guard.ts` (`requireAdmin()`), `rate-limit.ts`, `email-verification.ts` |
| Plans and usage | `plans-and-roles.ts` (plan and role names, browser-safe), `entitlements.ts` (limits, `checkAndRecordUsage`, `refundUsage`), `paddle.ts` |
| Questions | `practice-taxonomy.ts` (17 practice modes), `question-types.ts` + `question-types/` (16 types, each with a grader), `question-freshness.ts` (no repeats), `question-stimulus.ts` (the only way passages reach candidates), `question-validation.ts`, `question-dedup.ts`, `question-import.ts`, `question-file-format.ts`, `item-groups.ts` |
| Skills and goals | `skills/` (taxonomy, mastery, drills, diagnostics, tags), `goal-tracks.ts` |
| Exams | `mock-test-options.ts` (the exam chooser), `exam-catalogue.ts` (families, variants, papers, parts), `exam-runner.ts` + `exam-runner-guard.ts` (timed runner v2), `template-exam-link.ts` |
| Scoring and results | `scoring-engine.ts`, `scoring-config.ts` (admin weights), `score-scales/` (bands, CEFR), `progress.ts`, `candidate-history.ts`, `coach-profile.ts` |
| AI | `providers/` (one module per Gemini/Groq use; `gemini-json.ts` validates replies; `pricing.ts` estimates cost), `analyze-attempt.ts`, `speech-metrics.ts`, `conversation-roles.ts` |
| Proctoring | `proctoring/` (people monitor, MediaPipe loader), `proctoring-events.ts` |
| Audio and files | `tts/`, `storage.ts`, `uploads.ts`, `upload-*-client.ts`, `audio-script-hash.ts`, `media-errors.ts` |
| Admin | `admin-stats.ts`, `audit-log.ts`, `exam-catalogue-admin.ts`, `item-groups-admin.ts`, `feature-flags.ts` |
| Infrastructure | `db.ts` (Prisma client and the `DATABASE_URL` fallback), `email.ts` |

## 3. How a request is protected

1. **`src/proxy.ts`** runs before every candidate page and candidate API (its `config.matcher`). It requires a valid session, then reads the user's `isActive` **and** `role` from the database on every request (never trusting the login token), so a suspension or demotion takes effect on the next request. Admin pages and `/api/admin/*` also need the ADMIN role. The path is decoded first, so an encoded path like `/api/%61dmin` can't skip the check.
2. **Each API route** checks again: `requireAdmin()` in all 24 admin route files; `getServerSession()` plus an **ownership** check in every candidate route that takes an id (for example, `exam-runner-guard.ts` for the v2 exam routes). A candidate can only read or change their own rows.
3. **Rate limits** (`RateLimitHit`): logins per IP and per email, sign-up code sends and guesses.
4. **Plan limits**: every AI-costing action calls `checkAndRecordUsage()` first, under a per-user-and-feature database lock so parallel requests can't overspend. If the work then fails on our side, `refundUsage()` gives the use back.

Public routes (no session): `/api/auth/*`, `/api/health`, `/api/system-check/ping`, `/api/webhooks/paddle` (checks Paddle's signature).

## 4. Main data flows

### Sign-up and login
`/signup` → `POST /api/auth/signup` → `startSignup()` stores a hashed 6-digit code (`EmailVerification`) and emails it (Gmail SMTP) → `POST /api/auth/signup/verify` checks the code (expiry, attempt limit) and only then creates the `User` → NextAuth credentials login → JWT cookie. The user then chooses a goal (`/goal/choose`).

### Practice question (typed or multiple choice)
`/practice/[slug]` → `GET /api/practice/questions` (picks unseen questions first via `question-freshness.ts`; never sends correct answers) → candidate answers → `POST /api/practice/attempts` (plan check, server-side grading) → `PracticeAttempt` saved → skill mastery updated after the response (`after()`).

### Spoken answer and AI speech analysis
Browser records audio → `POST /api/practice/recordings/presign` → upload straight to R2 → `.../complete` → `POST /api/practice/attempts` with the `recordingId` → on the results page, `POST /api/practice/attempts/[id]/analyze` → plan check (`SPEECH_ANALYSIS`) → `analyzeAttempt()`: Groq transcribes → deterministic pace/filler metrics → Gemini rates six dimensions from the audio and transcript → the reply is validated (`voiceAnalysisResultSchema`; a bad reply retries on the fallback model) → `SpeechAnalysis` saved. Failures show a plain message and refund the use.

### Mock exam (v1, section by section)
`/mock-tests` → `POST /api/mock-tests/sessions` (charges one `MOCK_ASSESSMENT`, picks the template) → system check (camera, microphone) → each section loads its questions → each answer `POST /api/practice/attempts` with the session id (no per-answer charge; capped at the template's question count) → proctoring events `POST .../events` → end → `GET .../score` analyses any unanalysed recordings and computes the category scores (`scoring-engine.ts`, recomputed on every view) → optional AI narrative `POST .../report`.

### Timed exam (v2)
Templates linked to an exam variant, with the `exam_runner_v2` flag on, run through `src/lib/exam-runner.ts`: the server owns the timer (`ExamSessionState`), answers autosave (`PUT .../response`, `ItemResponse`), papers are submitted and graded per question type, and listening audio has play limits.

### AI conversation
`POST /api/conversations` (charges one `INTERVIEW_SIMULATION`) → each turn: record → `POST .../turns` (Groq transcribes; Gemini writes the other character's reply; 3 turns on FREE, 4 on paid plans) → `POST .../complete` → Gemini summary, validated, saved on the session.

### Plans and payment
Plans (FREE, STARTER, PROFESSIONAL, PREMIUM) live in `Subscription`; limits are in `PLAN_LIMITS` (`entitlements.ts`). FREE limits are lifetime; paid limits reset each period. Today admins set plans by hand; the Paddle webhook (`/api/webhooks/paddle`) will set them once billing is configured.

## 5. Scoring

- `computeScoreReport()` (`scoring-engine.ts`) is a pure function. AI calls only ever return **ratings** (strong / adequate / weak); every number is computed in code from those ratings plus deterministic counts, with admin-set category weights (`scoring-config.ts`).
- Proctoring integrity never scores on its own, so an exam with no answers is unscored, not "100".
- `score-scales/` converts scores to bands (IELTS-style, CEFR and others).
- Skill mastery (`skills/mastery.ts`): 0-100, 14-day half-life, harder questions count more; bands Weak (<50, after at least 5 answers), Developing, Proficient, Mastered (90+).

## 6. AI integration

| Use | Provider module | Validated shape | Plan feature |
|---|---|---|---|
| Transcription | `groq-whisper-provider.ts` | plain text | (part of the caller's) |
| Speech analysis | `gemini-analysis-provider.ts` | `voiceAnalysisResultSchema` | `SPEECH_ANALYSIS` |
| Improve my answer | `gemini-improve-provider.ts` | `improvedAnswerResultSchema` | `IMPROVE_ANSWER` |
| Practice scenario | `gemini-scenario-provider.ts` | `scenarioResultSchema` | `AI_SCENARIO` |
| Coach reply | `gemini-coach-provider.ts` | `coachReplySchema` | `COACH_MESSAGE` |
| Conversation reply, summary, customer-service analysis | `gemini-conversation-provider.ts` | summary and analysis schemas | `INTERVIEW_SIMULATION` (per conversation) |
| Mock-exam narrative report | `gemini-report-provider.ts` | `resultsReportResultSchema` | (part of the mock exam) |

Rules every AI call follows:
- the API key stays on the server;
- the reply is checked with zod (`parseGeminiJson`) before it is stored or shown;
- a pinned model with one fallback model;
- on failure, the details go to the server log and the candidate sees a plain sentence;
- the estimated cost is stored per row (`estimatedCostUsd`) for the admin overview;
- the scenario provider is told to ignore instructions hidden in the candidate's topic.

## 7. Proctoring

The exam camera check runs **on the candidate's device** (`src/lib/proctoring/`, `src/hooks/useLiveProctoring.ts`): MediaPipe face detection (loaded from a CDN) watches for more than one person, and the page watches for tab switches. It shows a warning banner and records one `ProctoringEvent` per episode through `POST /api/mock-tests/sessions/[id]/events`. The scoring engine deducts for events. No video is uploaded. Because detection is client-side, a modified browser could suppress events ([TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) #9).

## 8. Two exam engines

- **v1** (`components/mock-test`): section by section, questions chosen at runtime by category and difficulty.
- **v2** (`components/exam-runner-v2`, `src/lib/exam-runner.ts`): IELTS-style timed papers with parts, autosave, resume, review and audio play limits. Used only for templates linked to an exam variant, and only while the `exam_runner_v2` flag is on (it is on in production).

## 9. Feature flags (`src/lib/feature-flags.ts`, admin "Features" page)

A missing row means **on**, except keys in `DEFAULT_OFF_FEATURES`.

| Key | Default | Controls |
|---|---|---|
| `MOCK_TEST` | on | starting mock exams |
| `INTERVIEW_SIMULATION` | on | AI conversations |
| `AI_SPEECH_ANALYSIS` | on | analysing recordings |
| `PROGRESS_DASHBOARD` | on | `/progress` |
| `exam_runner_v2` | **off** (on in production) | the v2 timed-exam screen for linked templates |
| `NATURAL_VOICES` | on | ElevenLabs generation (no effect without a key) |
| `skills_all_categories` | **off** | shows the four hidden skill categories |
| one per practice category (`GRAMMAR`, ...) | on | blocks that category everywhere |

## 10. Related documents

- [DEVELOPER_HANDOVER.md](DEVELOPER_HANDOVER.md): start here if you're new; includes "where do I change this?".
- [API.md](API.md) and [DATABASE.md](DATABASE.md): endpoints and data model.
- [DO_NOT_BREAK.md](DO_NOT_BREAK.md): working features and the tests that protect them.
- [DEPLOYMENT.md](DEPLOYMENT.md): releasing to production.
- [SERVICES_AND_SECRETS.md](SERVICES_AND_SECRETS.md): external services and environment variables.
- [QUESTION_BANK.md](QUESTION_BANK.md), [LISTENING_SYSTEM.md](LISTENING_SYSTEM.md): the two most complex content systems.
- [DECISION_LOG.md](DECISION_LOG.md): why things are the way they are.
- [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md): known issues and what to improve next.
