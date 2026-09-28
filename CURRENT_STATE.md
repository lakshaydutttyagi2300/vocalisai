# Current state: 28 Sep 2026

| | |
|---|---|
| Date | 28 Sep 2026 (IST) |
| Branch | `feat/skills-platform` (the working branch). `main` is the live site. |
| Last commit before handover | `e477b8c` Phase 4: Goal Tracks and onboarding. `main` and the branch were both at this commit. |
| Handover commit | Phase 5 QA fixes plus this handover package, committed on `feat/skills-platform` and pushed. Check with `git log -1`. **Not on `main`, so not live.** |
| App version | `package.json` 0.1.0 (not used for releases; phases are tracked in `CHANGES.md`) |
| Live site | https://vocalisai.vercel.app, deployed from `main` @ `e477b8c` (Phases 1-4, question bank, free-mode voices, DB hotfix, `/api/health`) |

## Completed (live)
- **Core platform:**
  - practice library (17 modes);
  - AI speech analysis;
  - AI voice conversations;
  - AI coach;
  - progress;
  - plans and usage limits;
  - full admin area;
  - proctored mock exams (v1);
  - IELTS-style exam runner v2 with 3 practice tests;
  - exam catalogue and item groups.
- **Phase 1:** skill taxonomy (12 categories, 302 skills), every question mapped to a skill and level, goal tracks, blueprints.
- **Phase 2:** skill mastery, Quick Drills, "I'm weak in" diagnostics, My Skills dashboard.
- **Question bank:** 5,772 active questions, and fresh-first selection (no repeats until a pool is used up) in every activity.
- **Phase 3:** Listen buttons with accents. ElevenLabs is built but **off**, so device voices are used (free mode).
- **Phase 4:** Goal Tracks and onboarding (General English, BPO / Customer Support, Interview Prep), My goal plan, track exams.
- **Listening:** no raw JSON or S1/S2 labels ever shown; two-voice playback.

## SHIPPED TO PRODUCTION 28 Sep 2026, 21:22 IST (main @ `086fe44`)

Everything below, Phase 5 plus the exam library and email-verified sign-up, is **live**.
- Backup branch: `backup-production-before-exam-library-otp` (`br-little-sky-b426mvzt`).
- Migration applied; `seed:exam-library --production` loaded 12 types and 25 exams (28 exams offered, `exam_runner_v2` on).
- Gmail SMTP is set in Vercel (`SMTP_HOST/PORT/USER/PASSWORD`, `EMAIL_FROM`).
- Checks: `/api/health` ok, pages ok, `vercel logs` clean, live sign-up sent a code (HTTP 202), fake domain rejected (400).

## Phase 5 QA (now live)
- New or edited questions are auto-tagged with skill and level (import, duplicate, AI scenarios, admin edit).
- An exam ended with no answers is unscored. It used to show "100 - interview ready".
- Phone fixes: admin Templates buttons, Coach page jump, conversation difficulty buttons.
- A clear message when the speech-analysis page is opened for a typed answer or an unknown link.
- `tests/e2e/walkthrough.spec.ts`: opens 43 pages at laptop and phone size. Final review: **no errors, no server failures, no sideways scrolling**.
- Test fix: the v2 exam UI test now retries the camera step after a reload.

## Exam library and email-verified sign-up (28 Sep; now live)
- **Sign-up needs an emailed 6-digit code.** The account is created only after the right code; there's expiry, resend, attempt limits and rate limits. The code is never stored in plain form or sent to the browser (`src/lib/email-verification.ts`).
- **Email is sent by Gmail (free, owner's choice).** SMTP settings are needed in Vercel **before** shipping, or nobody can sign up (`src/lib/email.ts`).
- **Mock Exams:**
  - 25 exams in 12 types (Business, Customer Service, Speaking, Listening, Reading, Writing, Grammar, Vocabulary, Interview, Academic, Placement, Aptitude), 10-135 minutes;
  - one card per exam (versions grouped), type filters;
  - spoken and written questions work in timed exams;
  - admins can create new exam types.
- **DB migration** `20260928120000_email_verification_exam_descriptions` (additive): applied to **development and test only**.
- Details: `CHANGES.md` (last section).

## Test results (28 Sep)
- `npx tsc --noEmit`: clean.
- `npm test`: **296 / 296 passed** (23 files) at the handover commit. **316 / 316 (25 files)** after the exam library and email verification.
- `npm run build`: clean.
- **Playwright, full run against the production build: 34 passed, 5 failed.**
  - The 5 failures: `exam-demo` (Practice Test 2), `exam-runner-v2` (flag off), `exam-runner-v2-ui`, `buttons`, `walkthrough`.
  - **Cause: a second, leftover test run** from the interrupted previous session was still running at the same time, against the same test database. It flipped the `exam_runner_v2` flag, changed the default exam template and deleted its own test exams mid-run. File timestamps prove the overlap; see KNOWN_ISSUES.md.
  - Before any e2e run, make sure no other `node`/Playwright process is running (Task Manager, or `Get-Process node` in PowerShell).
- **Re-run of those 5 specs alone** (no other runner active): **8 / 8 tests PASSED** (12.5 min):
  - `buttons`;
  - `exam-demo` (both tests);
  - `exam-runner-v2` (all 3);
  - `exam-runner-v2-ui`;
  - `walkthrough` ("No problems found").
- **Effective result: all 39 browser tests pass.** The earlier failures were test interference, not app bugs.
- **After the exam library and email verification (43 browser tests):** the full run had 39 passed. The 4 failures were a brief "can't reach database server" outage of the Neon test branch. Re-run alone: **8 / 8 passed**, so **all 43 pass**.

## Known bugs / gaps (top items; the full list is in `docs/handover/KNOWN_ISSUES.md`)
0. **Live password-reset emails only reach the owner's own inbox** (Resend without a domain). Fixed when the Gmail SMTP settings are added and this work ships.
1. **Vercel Production has no `DATABASE_URL`.** The site runs on the `DATABASE_URL_UNPOOLED` fallback. Re-add it.
2. Phase 5 fixes aren't live until "ship to production".
3. Paddle checkout isn't configured (plans are set by admins).
4. An unplayable listening spec can be imported; candidates see no audio (safe, but unanswerable).
5. Small question pools in some areas (listening, writing, fluency, interview, conversation roles) repeat sooner.
6. `npm run lint` is broken (typescript-eslint vs TypeScript 7).

## Pending tasks
See `NEXT_STEPS.md`. The first is to ask the owner whether to ship Phase 5; the second is to re-add `DATABASE_URL`.

## Required integrations
- **Neon Postgres:** `DATABASE_URL`, `DATABASE_URL_UNPOOLED`.
- **NextAuth:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (local).
- **Groq** (`GROQ_API_KEY`) and **Gemini** (`GEMINI_API_KEY`).
- **Cloudflare R2:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
- **Email (Gmail SMTP; needed for sign-up):** `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASSWORD` (Gmail app password), optional `EMAIL_FROM`.
- **Resend:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (fallback; sandbox only).
- **Paddle** (not live): `NEXT_PUBLIC_PADDLE_*`, `PADDLE_WEBHOOK_SECRET`.
- **ElevenLabs** (off): `ELEVENLABS_API_KEY`.

Details and where to set each: `docs/handover/SERVICES_AND_SECRETS.md`.

## Deployment status
- **Vercel:** team `vocalis-ai`, project `vocalisai`. Auto-deploys from `main`, last at `e477b8c`. Health check: `GET /api/health`.
- **Neon project `plain-art-88027021`:** 8 branches.
  - production, development, staging, test;
  - backups before-phase4-goals, before-question-bank, before-skills-platform, before-speaker-label-fix.
  - The free-plan limit is 10.
- **No migrations pending.** `20260928120000_email_verification_exam_descriptions` is applied everywhere, including production (28 Sep).
- **Neon branches: 9** (a new backup added). The limit is 10, so delete an old backup, with the owner's OK, before the next release.

## Immediate next steps
1. The new Claude session reads `CLAUDE_NEW_ACCOUNT_START.md`.
2. Run the test gate, including the 5 exam/UI specs, with no other test run active.
3. Before shipping, the owner creates a Gmail app password, and the 4 SMTP settings are added to Vercel Production.
4. Ask the owner: "ship to production"? Then run the runbook: backup, `prisma migrate deploy`, `seed:exam-library --production`, push `main`, health and logs, and **a real sign-up with a real inbox**.
5. Help the owner re-add `DATABASE_URL` in Vercel Production.
