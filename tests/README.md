# Tests

## Setup

1. Copy `.env.test.example` to `.env.test`.
2. Point `DATABASE_URL` at a **disposable Neon branch** created from `development` (Neon dashboard → Branches → Create branch → parent `development`). Never point it at `development` or `production` directly - these suites create, mutate and delete rows freely and assume they own the whole database.
3. `npm install` (installs Vitest, Playwright, dotenv, zod).
4. `npx playwright install chromium` (one-time, downloads the browser binary).

## Running

```bash
npm test          # unit tests (Vitest) - fast, most don't touch a real server
npm run test:e2e  # e2e tests (Playwright) - launches a real dev server against .env.test
```

Unit tests load `.env.test` themselves (`tests/setup.ts`). E2e tests launch `next dev` with `.env` (real provider keys) layered under `.env.test` (test-branch `DATABASE_URL`/`NEXTAUTH_SECRET` override) - see `playwright.config.ts`. This always launches a **fresh** dev server (`reuseExistingServer: false`), even locally, so an already-running manual preview on port 3000 is never silently reused with the wrong database.

`tests/e2e/global-setup.ts` clears `signup:*`/`login:*` rate-limit rows on the test branch before each run - real, working rate limiting (see `src/lib/auth.ts`, `src/app/api/auth/signup/route.ts`) that a repeated full-suite run would otherwise trip on its own, since Playwright's request context sends no `X-Forwarded-For` and every request falls back to one shared "unknown" IP bucket.

## What each file covers

- `unit/scoring-engine.test.ts` - `computeScoreReport` (pure function, no DB): null-when-no-data, MCQ-only categories, proctoring deductions, response-quality flooring, category weighting, customer-handling gating.
- `unit/question-import.test.ts` - `processQuestionBatch`: valid insert, validation rejection, near-duplicate detection (skip and allow), dry-run (no write).
- `unit/entitlements.test.ts` - `getEffectivePlan`, `setPlan`, `checkAndRecordUsage`: lazy FREE creation, lapsed-period fallback, usage limits and blocking, zero-limit features.
- `e2e/auth.spec.ts` - signup → auto-login → dashboard; re-login; wrong password rejected.
- `e2e/practice-mcq.spec.ts` - fetch GRAMMAR/BEGINNER questions, submit correct/incorrect attempts, logged-out rejection.
- `e2e/practice-voice.spec.ts` - fetch READING/BEGINNER (voice) questions, submit an attempt linked to the candidate's own recording, reject a recording owned by someone else.
- `e2e/mock-test.spec.ts` - create session → answer a section → end → score report; session/attempt ownership isolation.

## Conventions

- Every test either creates its own uniquely-suffixed data (email includes `Date.now()` + Playwright's `testInfo.testId`) or cleans up exactly the rows it created (tracked ids, `afterEach`) - never assumes an empty database and never deletes by a broad filter that could catch real seeded/imported content.
- `e2e/helpers.ts`'s `createTestUser`/`loginAs` create the account directly in the DB and authenticate through NextAuth's own credentials callback (the same CSRF flow the browser uses) rather than the real `/signup` form, for every test except `auth.spec.ts` itself - `/signup` is real, IP-rate-limited (5/hour), so a full suite going through it for every test would trip that limiter on its own.
