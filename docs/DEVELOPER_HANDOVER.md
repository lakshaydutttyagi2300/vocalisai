# Developer handover

**"I've just joined the VocalisAi project. What do I need to know?"** Start here. Allow about an hour to read this and [ARCHITECTURE.md](ARCHITECTURE.md), then get the app running.

## 1. The project in one paragraph

VocalisAi (https://vocalisai.vercel.app) is a subscription web app for English, workplace and interview preparation: practice questions in 17 modes, skill drills with mastery tracking, goal tracks, camera-checked mock exams (including IELTS-style timed papers), AI speech analysis of recorded answers, AI role-play conversations and an AI coach, plus a full admin area. It's one Next.js 16 app (pages and API together) on Vercel, with Postgres on Neon via Prisma, files on Cloudflare R2, and Groq + Gemini for AI.

## 2. Things that will surprise you

- **This is not the Next.js you know.** Next.js 16 has breaking changes: read `AGENTS.md` and `node_modules/next/dist/docs/` before writing Next-specific code. Middleware is `src/proxy.ts`.
- **Pushing `main` deploys to production immediately.** Work on a branch (currently `feat/skills-platform`); see [DEPLOYMENT.md](DEPLOYMENT.md).
- **The Vercel build doesn't run database migrations.** Apply them to production first.
- **The repository is public.** Never commit a secret, even in a test.
- **`npm run lint` is broken** (typescript-eslint vs TypeScript 7). Use `npx tsc --noEmit`.
- **Unit tests hit a real (shared) Neon test database**, not mocks. Create your own rows with unique names and delete them.
- **Candidates must never see internal data** (raw JSON, speaker labels like `S1:`, provider errors). Passages go through `src/lib/question-stimulus.ts`; errors are logged, not shown.

## 3. Local setup

Tested on Windows 11 with Node **24**, npm 11 and Git. In PowerShell, use `npm.cmd` / `npx.cmd` if script execution is blocked.

```bash
git clone https://github.com/lakshaydutttyagi2300/vocalisai.git
cd vocalisai
git checkout feat/skills-platform
npm install                      # also runs prisma generate; downloads xlsx from cdn.sheetjs.com
npx playwright install chromium  # only for browser tests
cp .env.example .env             # then fill it in (see below)
cp .env.test.example .env.test
npm run dev                      # http://localhost:3000
```

- **`.env`**: `DATABASE_URL` / `DATABASE_URL_UNPOOLED` = the Neon **development** branch; any long random `NEXTAUTH_SECRET`; `GROQ_API_KEY` and `GEMINI_API_KEY` for AI features. R2 and email are optional locally (files go to `uploads/`, and emails, including sign-up codes, are printed in the server console).
- **`.env.test`**: `DATABASE_URL` = the Neon **test** branch. Never development or production.
- **`.env.staging`** (optional): one line, `DATABASE_URL=` the **staging** branch, used by `node scripts/dev-staging.mjs`.

Every variable is described in `.env.example` and [SERVICES_AND_SECRETS.md](SERVICES_AND_SECRETS.md). Connection strings: Neon dashboard → project VoiceisAI → branch → **Connect**.

To get an admin login locally, sign up normally, then set your `role` to `ADMIN` in the development database (Neon SQL editor), or run `ADMIN_SEED_PASSWORD="<12+ characters>" node prisma/seed-admin.mjs` (it refuses production).

Check it works: http://localhost:3000/api/health returns `{"ok":true,"database":"reachable"}`.

## 4. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npx tsc --noEmit` | Type check (the main static gate) |
| `npm test` | Vitest unit tests (~100 s; uses `.env.test`) |
| `npx vitest run tests/unit/<file>.test.ts` | One unit test file |
| `npm run build` | Production build |
| `npm run build` then `E2E_SERVER=start npx playwright test` | Browser tests against a production build (on an 8 GB PC the dev server can run out of memory) |
| `npx playwright test tests/e2e/<file>.spec.ts` | One browser spec |
| `npx prisma migrate dev --name <what>` | Create a migration (development database) |
| `npm run seed:skills`, `seed:skills-content`, `seed:exam-library`, `seed:exam-demo` | Content loaders (idempotent; add `-- --production` only during a release) |

## 5. Where do I change this?

### Frontend (pages in `src/app`, components in `src/components`)
| Feature | Where |
|---|---|
| Landing page and pricing cards | `src/app/page.tsx` |
| Top navigation | `src/components/Navbar.tsx` |
| Sign-up (with email code), login, password reset | `src/app/(auth)/*/page.tsx`, shared layout `src/components/AuthShell.tsx` |
| Candidate dashboard | `src/app/dashboard/page.tsx` |
| Goal chooser and goal plan | `src/app/goal/choose/page.tsx`, `src/components/goals/GoalChooser.tsx`, `src/app/goal/page.tsx` |
| Practice library and a practice mode | `src/app/practice/page.tsx`, `src/app/practice/[slug]/page.tsx` |
| Typed / multiple-choice practice session | `src/components/practice/PracticeSession.tsx` |
| Spoken practice (record, upload, analyse) | `src/components/practice/VoicePracticeSession.tsx` |
| How a question's passage, audio or chart is shown | `src/components/questions/StimulusView.tsx` (data from `src/lib/question-stimulus.ts`) |
| Speech-analysis results | `src/app/practice/results/[attemptId]/page.tsx`, `src/app/speech-analysis/page.tsx`, `src/components/practice/SyncedTranscript.tsx` |
| Skills dashboard, drills, diagnostics | `src/app/skills/page.tsx`, `src/app/skills/drill/[skillId]/page.tsx`, `src/app/skills/diagnostic/[category]/page.tsx`, `src/components/skills/SkillQuiz.tsx` |
| Mock exam chooser | `src/app/mock-tests/page.tsx`, `src/components/mock-test/MockTestEntry.tsx` |
| Mock exam (v1) screens | `src/components/mock-test/MockTestSessionShell.tsx` (flow, camera warning), `MockTestQuestionRunner.tsx` (questions), `MockTestSystemCheck.tsx`, `CandidateRules.tsx` |
| Timed exam (v2) screens | `src/components/exam-runner-v2/ExamRunnerV2.tsx`, `AudioPlayer.tsx` (listening, play limits), `TimedSpeaking.tsx` (speaking), `QuestionInput.tsx`, `PassageView.tsx`, `Countdown.tsx` |
| Exam results | `src/app/mock-tests/results/[sessionId]/page.tsx` (v1), `src/app/exam/results/[sessionId]/page.tsx` (v2), history `src/app/mock-tests/history/page.tsx` |
| Camera / microphone check and live proctoring | `src/components/system-check/SystemCheck.tsx`, `src/hooks/useLiveProctoring.ts`, `src/hooks/useMicLevel.ts` |
| AI conversation | `src/app/practice/conversation/page.tsx`, `src/app/practice/conversation/[sessionId]/page.tsx` |
| AI coach | `src/app/coach/page.tsx` |
| Progress | `src/app/progress/page.tsx` |
| Plan and usage | `src/app/billing/page.tsx` |
| Profile | `src/app/profile/page.tsx` |
| "Listen" buttons | `src/components/speech/ListenButton.tsx` |
| Admin area | `src/app/admin/*/page.tsx` (overview, candidates, questions, item-groups, exams, templates, features, scoring, audit-log); bulk import `src/components/admin/BulkFileImport.tsx` |
| Shared UI | `src/components/ui/Icon.tsx` (the only icon wrapper), `ScoreRing.tsx`; button and card classes (`btn-primary`, `btn-secondary`, `card`, `badge`) in `src/app/globals.css` |

**Frontend conventions:**
- Pages call the API with plain `fetch()`, handle `{ error }` responses, and keep state in `useState`; there's no global store or data library.
- The session comes from NextAuth's `useSession()` (`src/components/Providers.tsx`).
- The upload helpers are `src/lib/upload-recording-client.ts` and `upload-item-asset-client.ts`.
- Use `Icon` and the shared button classes; every page must work at phone width (390 px) with no sideways scrolling.

### Backend (routes in `src/app/api`, logic in `src/lib`)
| Concern | Where |
|---|---|
| Users, sign-up, login | `src/lib/auth.ts`, `src/lib/email-verification.ts`, `src/app/api/auth/*` |
| Who can reach what | `src/proxy.ts` (every request), `src/lib/admin-guard.ts`, ownership checks in each `[id]` route, `src/lib/exam-runner-guard.ts` |
| Plan limits and refunds | `src/lib/entitlements.ts`; plan and role names `src/lib/plans-and-roles.ts` |
| Questions: selection without repeats | `src/lib/question-freshness.ts`, `src/app/api/practice/questions/route.ts` |
| Questions: types and grading | `src/lib/question-types.ts`, `src/lib/question-types/` |
| Questions: validation, import, duplicates | `src/lib/question-validation.ts`, `question-import.ts`, `question-file-format.ts`, `question-dedup.ts` |
| Saving answers | `src/app/api/practice/attempts/route.ts` |
| Scoring | `src/lib/scoring-engine.ts`, `scoring-config.ts`, `score-scales/`, `src/app/api/mock-tests/sessions/[id]/score/route.ts` |
| AI analysis | `src/lib/analyze-attempt.ts`, `src/lib/providers/`, `src/lib/speech-metrics.ts` |
| Mock exam catalogue and chooser | `src/lib/mock-test-options.ts`, `src/lib/exam-catalogue.ts`, `src/app/api/mock-tests/*` |
| Timed exams | `src/lib/exam-runner.ts`, `src/app/api/exam-sessions/*` |
| Skills and goals | `src/lib/skills/`, `src/lib/goal-tracks.ts` |
| Proctoring data | `src/lib/proctoring-events.ts`, `src/app/api/mock-tests/sessions/[id]/events/route.ts` |
| Files | `src/lib/storage.ts` (R2 or local disk) |
| Email | `src/lib/email.ts` |
| Voices | `src/lib/tts/`, `src/app/api/tts/*` |
| Billing | `src/lib/paddle.ts`, `src/app/api/webhooks/paddle/route.ts` |
| Admin stats and audit | `src/lib/admin-stats.ts`, `src/lib/audit-log.ts` |
| Database client | `src/lib/db.ts`; schema `prisma/schema.prisma` |
| Configuration | `.env.example` (variables), `src/lib/feature-flags.ts` (switches), `next.config.mjs`, `vercel.json` |

## 6. Common changes

- **A new API route:** put it under `src/app/api/...`. Read the user with `getServerSession(authOptions)`, or start with `requireAdmin()` for admin routes. Parse the body with a zod schema. Check ownership of any `[id]`. Call `checkAndRecordUsage()` before paid work, and `refundUsage()` if that work fails on our side. Return `{ error }` with a plain sentence. If it's a candidate route, make sure its path is covered by `config.matcher` in `src/proxy.ts`.
- **A new AI feature:** add a provider in `src/lib/providers/` with a zod schema for the reply, parsed by `parseGeminiJson()`. Never show `err.message` to a candidate. Store `estimatedCostUsd`.
- **A new question type:** add its definition and grader in `src/lib/question-types/` and register it in `src/lib/question-types.ts`. Make validation (`question-validation.ts`), display (`StimulusView` / `QuestionInput`) and marking agree. Add tests.
- **New questions:** use the admin import (Excel/CSV/JSON) for one-offs, or add them to `prisma/skills-content/` and run `npm run seed:skills-content`. New questions are skill-tagged automatically (`src/lib/skills/question-tags.ts`).
- **A new exam or exam type:** add it to `prisma/exam-library/content.mjs` and run `npm run seed:exam-library`, or create it in Admin → Exams.
- **A new plan limit:** add the feature to `FEATURES` and `PLAN_LIMITS` in `src/lib/entitlements.ts`, with labels.
- **A database change:** add fields or tables in `prisma/schema.prisma` (new columns nullable), run `npx prisma migrate dev --name <what>`, and plan the production migration ([DATABASE.md](DATABASE.md#migrations)).

## 7. Workflow

1. Understand the feature: read the relevant section above, the code, and its tests.
2. Check [DO_NOT_BREAK.md](DO_NOT_BREAK.md) for anything nearby.
3. Make the smallest change that does the job. Don't reformat or refactor unrelated code in the same change.
4. Run the tests that cover it, then `npx tsc --noEmit`.
5. For UI changes, open the page (desktop and phone width) and use the feature.
6. Before a release: the full gate (`npx tsc --noEmit`, `npm test`, `npm run build`, Playwright).
7. Review your own diff (`git diff`), commit in logical steps, and push the branch.
8. Deploy only through the runbook in [DEPLOYMENT.md](DEPLOYMENT.md).

## 8. Common problems

| Symptom | Cause and fix |
|---|---|
| `npm` fails in PowerShell with "running scripts is disabled" | Use `npm.cmd` / `npx.cmd`, or run `Set-ExecutionPolicy -Scope Process Bypass` in that window. |
| Browser tests fail at random, or tests flip each other's data | Two test runs at once share one database and port 3000. Run one at a time; check that no other `node` process is running (`Get-Process node`). |
| The dev server crashes during a full Playwright run ("Zone Allocation failed") | Out of memory: `npm run build`, then `E2E_SERVER=start npx playwright test`. |
| Every signed-in page shows "Internal Server Error" after a deploy | A missing database variable in Vercel. Check `/api/health` and `vercel env ls production`. |
| "The table ... does not exist" locally | Your `.env` points at a branch that lacks a migration. Run `npx prisma migrate deploy` against that branch, or check which server config you started (`staging-test` uses `.env.staging`, not `.env`). |
| Sign-up says the email couldn't be sent | SMTP isn't configured. Locally the code is printed in the server console; on Vercel the `SMTP_*` variables must be set. |
| Everyone is logged out | `NEXTAUTH_SECRET` changed. Never change it in production. |

## 9. Important warnings

- **Never point `.env` at production**, and never run the unguarded old seeds (`prisma/seed.mjs`, `seed-phase4.mjs`, ...) against it ([DATABASE.md](DATABASE.md#seeds-and-data-scripts)).
- **Before any production data change**, take a Neon backup branch.
- **Candidate-facing text** must be plain language: no raw JSON, internal ids or technical errors.
- **AI replies are untrusted**: validate before storing or showing.
- **Plan limits protect real money** (each AI call is paid): don't add a path to paid work that skips `checkAndRecordUsage()`.

## 10. Technical debt

The known issues, with priorities and recommended fixes, are in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md). The biggest: paid checkout isn't live, lint doesn't run, and there's no CI.

## 11. Tools used on this project

- **Vercel CLI** (`npm i -g vercel`, `vercel login`, `vercel link` → team `vocalis-ai`, project `vocalisai`): `vercel ls --prod`, `vercel logs`, `vercel env ls`.
- **GitHub CLI** (`gh auth login`).
- **Claude Code** has been used for development. Its project rules are in `CLAUDE.md`. `.claude/launch.json` defines the local servers (`proacting-dev`, `proacting-prod`, `staging-test`). A Neon MCP server lets it query the databases: `claude mcp add --transport http --scope user Neon https://mcp.neon.tech/mcp --header "Authorization: Bearer <NEON_API_KEY>"`. None of this is needed to work on the code.
