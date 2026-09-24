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

### A. Exam catalogue

**Added:**
- `ExamFamily`, `ExamVariant`, `ExamPaper`, `ExamPart` models (migration `20260924154631_exam_catalogue`, applied to `development` and the disposable `test` branch only - never `production`).
- Nullable `MockTestTemplate.examVariantId` and `MockTestTemplateSection.examPartId` - both null on every existing row, no behaviour change until an admin explicitly attaches one (P1-G, not built yet).
- `src/lib/exam-catalogue.ts` - family-slug registry (7 seeded families: `IELTS_STYLE`, `SELT_STYLE`, `PTE_STYLE`, `CAMBRIDGE_STYLE`, `APTITUDE`, `EMPLOYMENT`, `GENERAL_ENGLISH`), navigation-mode registry, field validators for all four new models.
- `tests/unit/exam-catalogue.test.ts` - 9 tests: registry validation, the full Family→Variant→Paper→Part create/cascade-delete chain, per-family slug uniqueness, and confirming the two new template/section columns default to null.

**Result:** 26/26 unit tests pass, 10/10 e2e tests pass (existing signup/login/practice/mock-test flows unaffected), `npm run build` clean, `npx tsc --noEmit` clean. `npm run lint` unchanged (same pre-existing TS7 blocker, see above).

### B. Shared stimulus (ItemGroup)

**Added:**
- `ItemGroup` model (migration `20260924155144_item_groups`, applied to `development` and the disposable `test` branch only - never `production`) - a shared stimulus (reading passage, audio clip, image, chart, video) that one or more `PracticeQuestion` rows can point at.
- Nullable `PracticeQuestion.itemGroupId` and `orderInGroup` - both null on every existing question, additive to (not a replacement for) the existing per-question `passage` field, which keeps working exactly as before.
- `src/lib/item-groups.ts` - `ItemGroup.type` registry (`PASSAGE`/`AUDIO`/`IMAGE`/`CHART`/`VIDEO`) and field validators (text required for PASSAGE, an uploaded asset required for the other four, `playLimit` only valid on AUDIO).
- `tests/unit/item-groups.test.ts` - 8 tests: registry/validator coverage, a real Family→group→two-linked-questions create/read chain ordered by `orderInGroup`, and confirming a question's existing standalone `passage` field is untouched when no `itemGroupId` is set.

**Result:** 33/33 unit tests pass, 10/10 e2e tests pass, `npm run build` clean, `npx tsc --noEmit` clean. `npm run lint` unchanged (same pre-existing TS7 blocker).
