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

## Completed on the branch, NOT live yet (Phase 5 QA)
- New or edited questions are auto-tagged with skill and level (import, duplicate, AI scenarios, admin edit).
- An exam ended with no answers is unscored. It used to show "100 - interview ready".
- Phone fixes: admin Templates buttons, Coach page jump, conversation difficulty buttons.
- A clear message when the speech-analysis page is opened for a typed answer or an unknown link.
- `tests/e2e/walkthrough.spec.ts`: opens 43 pages at laptop and phone size. Final review: **no errors, no server failures, no sideways scrolling**.
- Test fix: the v2 exam UI test now retries the camera step after a reload.

## Test results (28 Sep)
- `npx tsc --noEmit`: clean.
- `npm test`: **296 / 296 passed** (23 files).
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

## Known bugs / gaps (top items; the full list is in `docs/handover/KNOWN_ISSUES.md`)
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
- **Resend:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- **Paddle** (not live): `NEXT_PUBLIC_PADDLE_*`, `PADDLE_WEBHOOK_SECRET`.
- **ElevenLabs** (off): `ELEVENLABS_API_KEY`.

Details and where to set each: `docs/handover/SERVICES_AND_SECRETS.md`.

## Deployment status
- **Vercel:** team `vocalis-ai`, project `vocalisai`. Auto-deploys from `main`, last at `e477b8c`. Health check: `GET /api/health`.
- **Neon project `plain-art-88027021`:** 8 branches.
  - production, development, staging, test;
  - backups before-phase4-goals, before-question-bank, before-skills-platform, before-speaker-label-fix.
  - The free-plan limit is 10.
- **No database migrations are pending** (Phase 5 has none).

## Immediate next steps
1. The new Claude session reads `CLAUDE_NEW_ACCOUNT_START.md`.
2. Run the test gate, including the 5 exam/UI specs, with no other test run active.
3. Ask the owner: "ship to production" for Phase 5? Then run the release runbook.
4. Help the owner re-add `DATABASE_URL` in Vercel Production.
