# Changes

## Phase P0 - Safety net (this commit)

Test infrastructure only - no application behavior changed.

**Added:**
- Vitest (unit tests) + Playwright (e2e tests), configured to run against a disposable Neon branch (see `tests/README.md`).
- `tests/unit/scoring-engine.test.ts`, `tests/unit/question-import.test.ts`, `tests/unit/entitlements.test.ts` - 17 tests.
- `tests/e2e/auth.spec.ts`, `tests/e2e/practice-mcq.spec.ts`, `tests/e2e/practice-voice.spec.ts`, `tests/e2e/mock-test.spec.ts` - 10 tests.
- `tests/e2e/helpers.ts`, `tests/e2e/global-setup.ts` - shared e2e test utilities.
- `src/components/exam/EstimatedScoreLabel.tsx`, `src/components/exam/TrademarkDisclaimer.tsx` - not yet used anywhere; ready for the exam-family pages P1 will add.
- New dev dependencies: `vitest`, `@playwright/test`, `dotenv`. New dependency: `zod` (approved for P1-C's per-question-type answer validation).

**Result:** 27/27 tests pass. `npm run build` is clean. `npm run lint` currently fails - pre-existing, unrelated to this work: `next lint` is no longer a valid Next.js 16 CLI subcommand (confirmed via `next --help`), so this was already broken before P0/P1 started. Flagging rather than fixing, since it's outside this task's scope.

**Known limitation:** `npm run lint` cannot be used as the "clean" gate requested until that pre-existing breakage is separately addressed (e.g. migrating to a plain `eslint` invocation). `npm run build` and `npx tsc --noEmit` are both clean and were used as the gate for this work instead.

## Phase P1 - Foundations

Not started yet.
