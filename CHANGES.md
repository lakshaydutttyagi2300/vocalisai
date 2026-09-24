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

**Result:** 27/27 tests pass. `npm run build` is clean. `npm run lint` was broken (pre-existing: `next lint` is not a valid Next.js 16 CLI subcommand) and gated on `npm run build` + `npx tsc --noEmit` instead for this phase.

## Lint tooling fix (separate commit)

Replaced `next lint` with `eslint .` against a flat `eslint.config.mjs` (`eslint`, `eslint-config-next@16.3.6`, `@eslint/eslintrc` added as dev dependencies).

**Blocker found and left unresolved, by design:** `eslint-config-next` cannot currently load at all under this project's pinned `typescript@7.0.2` - `typescript-eslint` (a dependency of `eslint-config-next`) explicitly refuses to run against TypeScript 7.0 (see https://github.com/typescript-eslint/typescript-eslint/issues/10940, no fix yet). This isn't scoped to the type-aware preset; the whole package fails to `require()`. Fixing it fully would mean either downgrading the project's TypeScript to a 6.x line (a real, unapproved change to working, already-typechecking code) or dropping Next's own rule set for a hand-rolled config that checks meaningfully less. Neither was applied.

**Current state:** `npm run lint` still does not run. `eslint.config.mjs` exists and documents the blocker inline. `npm run build` and `npx tsc --noEmit` remain the real gates for this and all P1 work, same as P0. Revisit once `typescript-eslint` supports TypeScript 7, or if the project's TypeScript version is deliberately changed for unrelated reasons.

## Phase P1 - Foundations

Not started yet.
