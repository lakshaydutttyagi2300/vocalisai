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

### C. Question-type registry

No Prisma schema change - richer answer shapes (arrays/objects) fit into the existing `PracticeQuestion.correctAnswer`/`options` JSON-string columns the same way `options` already works today.

**Added:**
- `src/lib/question-types/types.ts` - shared `GradeResult`/`QuestionTypeDef` types, deliberately separate from `practice-taxonomy.ts`'s existing `QuestionType` union.
- `src/lib/question-types/graders/*.ts` - one pure grader per new type: `GAP_FILL`, `TRUE_FALSE_NOT_GIVEN`, `YES_NO_NOT_GIVEN`, `MULTI_SELECT`, `MATCHING`, `LABELLING`, `ORDERING`, `HIGHLIGHT_WORDS`, `DICTATION`, `NUMERIC_ENTRY`, `LONG_WRITING` (not auto-graded; exposes `wordCount()` separately), `TIMED_SPEAKING` (not auto-graded; answer shape is `{ recordingId }`, same as every existing voice practice mode).
- `src/lib/question-types/graders/existing-types.ts` - the 4 existing types (`MULTIPLE_CHOICE`, `READING_COMPREHENSION`, `LISTENING_COMPREHENSION`, `SHORT_ANSWER`) re-declared as registry aliases whose `grade()` reproduces `api/practice/attempts/route.ts`'s real logic exactly (case-**sensitive** trim-only compare - verified this does NOT match the case-insensitive behavior the new types use, on purpose, to stay faithful to production).
- `src/lib/question-types.ts` - the registry itself (16 entries), `isValidQuestionTypeKey`/`getQuestionTypeDef`.
- `tests/unit/question-types.test.ts` - 20 tests covering every type's grader, its answer-schema validation, the null-correctAnswer-never-fabricates-a-result guarantee across all 14 gradable types, and an explicit check that the existing-type aliases match real production grading behavior (including its case-sensitivity).
- New dependency used for the first time: `zod` (already installed in P0).

**Not done in this chunk (by design, per the original spec):** nothing wires this registry into `api/practice/attempts`, `api/practice/questions`, or the bulk-import routes - those keep using their own existing logic entirely unchanged. This registry is consumed for the first time by P1-E (exam runner v2) and P1-G (admin import extension).

**Result:** 53/53 unit tests pass, 10/10 e2e tests pass, `npm run build` clean, `npx tsc --noEmit` clean. `npm run lint` unchanged (same pre-existing TS7 blocker).

### F. Score scales

No Prisma schema change - pure functions only, no dependency on anything else in P1 (per the original plan, this is why F was moved earlier in the build order).

**Added:**
- `src/lib/score-scales/types.ts` - shared `ScaleResult` type; every result is explicitly `isEstimate: true`.
- `src/lib/score-scales/ielts-style-band.ts` - 0-9 half-band estimate. Separate raw-out-of-40 tables for Listening, Reading Academic, and Reading General Training (mirrors the real exam's own convention of one Listening table but two Reading tables); `ruleScoreToBand()` linearly maps this platform's existing 0-100 rule-based score onto the band range for Writing/Speaking, which have no raw-out-of-40 concept here; `overallBand()` averages and rounds to the nearest half band.
- `src/lib/score-scales/cefr.ts` - A1-C2, threshold table over a 0-100 score.
- `src/lib/score-scales/pte-style.ts` - linear 10-90 scale.
- `src/lib/score-scales/cambridge-style.ts` - linear 80-230 scale, plus a nearest-level label deliberately suffixed `-style` (never a bare real qualification name).
- `src/lib/score-scales/pass-merit-distinction.ts` - Not yet passing / Pass / Merit / Distinction threshold table - this platform's own grading band, not an approximation of any third party's scale.
- `src/lib/score-scales/percentile.ts` - genuinely implemented (not faked), but returns `null` for an empty population rather than a fabricated number; nothing in the app currently has a real population of scores to pass in, so it stays unwired for now.
- `src/lib/score-scales/index.ts` - `SCORE_SCALE_KEYS` registry matching `ExamVariant.scoreScale` (P1-A); `exam-catalogue.ts`'s own validator isn't yet checking against it (noted in that file's original comment) - wiring that up is left for P1-G, the first chunk that actually creates/edits `ExamVariant` rows.
- `tests/unit/score-scales.test.ts` - 70 tests, table-driven (`it.each`) across every threshold in every table, plus clamping/rounding edge cases and the percentile stub's null-on-empty-population guarantee.

**Important scoping note, carried from the plan:** every scale here is explicitly "-style"/approximate and never reproduces a real exam board's actual proprietary conversion table or qualification name - consistent with `TrademarkDisclaimer.tsx`'s "no implied affiliation" requirement.

**Result:** 123/123 unit tests pass, 10/10 e2e tests pass, `npm run build` clean, `npx tsc --noEmit` clean. `npm run lint` unchanged (same pre-existing TS7 blocker).

### D. Assets (admin uploads for ItemGroups)

No Prisma schema change - `ItemGroup.assetKey` already exists from P1-B.

**Added routes (admin-only, 403 for anyone else):**
- `POST /api/admin/item-groups/assets/presign` - validates type/MIME/claimed size, then returns a short-lived signed R2 PUT URL and an `item-groups/<uuid>.<ext>` key. Returns `{ mode: "server" }` when R2 isn't configured, same as the recordings flow.
- `POST /api/admin/item-groups/assets/complete` - rebuilds and checks the key's exact shape, confirms the object really exists, and checks its **real stored size**. An upload over the cap is deleted from the bucket (413) rather than left as an orphan. Audit-logged.
- `POST /api/admin/item-groups/assets` - local-disk/through-the-server fallback, reusing the existing `writeRecording()` unchanged (it's a generic key-to-bytes writer). Audit-logged.

**Touched (additive only):**
- `src/lib/storage.ts` - added `getPresignedItemAssetUploadUrl`, `itemAssetSize`, `deleteItemAsset`. Existing recording functions untouched.
- `src/lib/item-groups.ts` - MIME allow-lists per type (audio/image/chart/video), a 25MB cap, `validateItemGroupAssetUpload`, and key build/validate helpers.

**Why the size check happens after upload:** a presigned S3/R2 PUT can't cap upload size up front (that needs a POST policy, a different flow). So the presign step rejects an honest oversized request early, and the complete step checks the real stored size and deletes anything over the cap - a client that lies about size still can't keep an oversized file.

**Not done in this chunk (by design):** nothing yet attaches an `assetKey` to an `ItemGroup` row - that's the admin CRUD in P1-G.

**Tests:**
- `tests/unit/item-group-assets.test.ts` - 14 tests: validators, plus every branch of all three routes (non-admin, bad MIME, R2 vs server mode, bad key, missing upload, oversized-delete, success + audit log), with storage mocked.
- `tests/e2e/item-group-assets.spec.ts` - 2 tests against the real server: non-admin gets 403; admin gets 400 for a bad file type and a well-formed presign response for a good one.
- The dev `.env` has real R2 credentials, so no test ever performs an actual upload - minting a presigned URL is local signing, and everything past that is unit-tested against the mock. No test files land in the real bucket.

**Result:** 137/137 unit tests pass, 12/12 e2e tests pass, `npm run build` clean, `npx tsc --noEmit` clean. `npm run lint` unchanged (same pre-existing TS7 blocker).

### E. Exam runner v2

**New flag:** `exam_runner_v2` - **OFF by default** (listed in `DEFAULT_OFF_FEATURES`; every pre-existing flag keeps its original "missing row = on" default). Toggle it on `/admin/features`. It also acts as a kill switch: turning it off closes every v2 route immediately.

**When v2 is used:** only when the session's template has an `examVariantId` **and** the flag is on. Every existing template has no variant, so today's mock test is unchanged whether or not the flag is on.

**Database** (migration `20260925092630_exam_runner_v2`, dev + test branches only, never production) - two new tables, no existing table altered:
- `ExamSessionState` - one per v2 session: the fixed question plan (chosen once at start, so a resume returns the identical exam), current paper/question, server-held exam and paper deadlines, audio play counts, status.
- `ItemResponse` - one autosaved answer per question, graded when its paper is submitted. Separate from `PracticeAttempt`, so usage counting, practice history and the existing mock-test scoring are untouched.

**Routes** (`/api/exam-sessions/[id]/...`, all signed-in + flag + ownership checked, added to the auth proxy matcher): `start` (idempotent start/resume), `GET` (state), `response` (autosave), `advance` (forward-only step), `submit-paper`, `audio-play`, `assets/[groupId]`. Page: `/exam/results/[sessionId]`.

**Server-authoritative rules:**
- Deadlines live in the database; the client only displays them. Every request first auto-submits any paper past its deadline (+5s grace), looping if the candidate was away through several. Time keeps running while away, like a real exam.
- Answers are only accepted for the current paper, validated against the question type's schema (P1-C), and, in `LOCKED_SEQUENTIAL` papers, only for the question the server says the candidate is on - refreshing can't be used to go back.
- Audio plays are counted server-side against `ItemGroup.playLimit`; audio only streams after a play is granted. Assets only stream for the current paper.
- Clients never receive a correct answer or an audio transcript.
- Grading uses only the P1-C pure graders; unanswered auto-markable questions score 0, writing/speaking stay unmarked (null). Never AI.

**Screen** (`src/components/exam-runner-v2/`, inside the existing proctored shell - camera/mic/fullscreen/tab monitoring reused unchanged): section + whole-exam countdowns, free navigation with flag-for-review and a review screen (or forward-only, per paper), confirm-before-submit, debounced autosave with a saved indicator, passage highlighter, play-limited audio, word counter, prep + response timers with recording for `TIMED_SPEAKING`.

**Resume after refresh / crash:** the shell remembers an in-progress v2 session id and, after the server confirms it's still in progress and belongs to the signed-in user, resumes it instead of creating a new session (which would also have spent another mock-test allowance). v1 sessions never store this.

**Proctoring event types:** unchanged - `FULLSCREEN_EXIT`, `PASTE_ATTEMPT` and `WINDOW_BLUR` (focus loss) already existed and are already recorded by `useLiveProctoring`.

**Small additive changes to existing files:** `api/mock-tests/sessions` returns one extra field (`runner`); `MockTestSessionShell` picks the runner and the results destination; `feature-flags.ts` gains the default-off list; the admin feature-toggle audit note now records the correct default; the admin question-delete route also refuses deletion when v2 answers reference the question (friendly 409 instead of a database error); `proxy.ts` matcher covers `/exam` and `/api/exam-sessions`.

**Bugs found and fixed while testing:**
- A second "Submit section" click arriving just after the first could have submitted the *next* section as well - submits now carry the paper index and are re-checked on fresh state.
- Grading wrote one row at a time (one round-trip per question) - now a fixed few queries per paper regardless of size, which also removed a concurrent-insert race.
- The shell's once-a-second re-render kept restarting the exam screen's start-up request, so it never loaded - caught only by the real-browser test.
- Page refresh would have started a brand-new exam instead of resuming (see above).

**Not included (by design):** no band/score-scale estimate on the results page yet - raw counts only, since converting to an "-style" band needs per-exam calibration and anything else would be an invented number. Speaking prep/response timers are client-side; the paper deadline around them is still enforced server-side.

**Tests:**
- `tests/unit/exam-runner.test.ts` - 15: deadline capping and grace, deterministic shuffle, whole-group selection, no-fabrication grading, flag defaults, plan fixed on resume, nothing secret in the client view, expiry auto-submit with the clock continuing from the old deadline, completion + unmarked speaking, double-submit (concurrent and back-to-back), End-assessment finalization, refusing a non-exam template.
- `tests/e2e/exam-runner-v2.spec.ts` - 3 against the real server: flag off (v1 runner, v2 routes 403); full flow (autosave, resume, schema validation, early-paper 409, audio 403 before play and limit enforced, other user 404, stale double-submit, locked paper, forward-only, grading, results page + disclaimer, no `PracticeAttempt` rows); server-side expiry.
- `tests/e2e/exam-runner-v2-ui.spec.ts` - 1 real-browser walkthrough with Chromium's fake camera/mic: intro → system check → rules → new exam screen → answer → full reload resumes the same exam with answers intact → review → submit → forward-only section → results.
- `tests/helpers/exam-fixture.ts`, `tests/e2e/exam-v2-setup.ts` - isolated fixture (own per-run category names, so it never mixes with real questions) and flag/default-template setup that restores the original state afterwards.
- `tests/e2e/helpers.ts` `loginAs` now confirms a session actually exists after logging in (one retry), after a cold-dev-server first login was seen returning OK without a session.

**Result:** 152/152 unit tests, 16/16 e2e tests (all 10 original P0 e2e tests still pass unchanged), `npm run build` clean, `npx tsc --noEmit` clean. `npm run lint` unchanged (same pre-existing TS7 blocker).

**To try it (dev):** attach a template to an `ExamVariant` with sections linked to `ExamPart`s (admin UI for this arrives in P1-G; P1-H seeds a demo), then turn on `exam_runner_v2` in `/admin/features`.

### G. Admin

No Prisma schema change - every column used already existed (P1-A, B, E).

**New admin pages** (added to the admin nav):
- `/admin/exams` - the exam catalogue as a tree: add a family (only from the 7 registry families), then versions (short code + score scale from the P1-F list), timed papers (minutes, forward-only or free navigation, review screen, instructions, order) and parts (order, instructions, prep/speak seconds). Edit or delete at every level.
- `/admin/item-groups` - create/edit passages, audio, images, charts, video; upload the file (P1-D routes, R2 or server fallback); audio play limit + transcript; optional metadata JSON; attach questions by ID with an order, detach them.
- `/admin/templates` (existing page, extended) - optional "Exam format" picker and a per-section "exam part" picker.

**New admin API** (admin-only, every change written to the Activity Log):
- `GET /api/admin/exam-catalogue` (tree + option lists), `POST /api/admin/exam-catalogue/{families|variants|papers|parts}`, `PATCH|DELETE /api/admin/exam-catalogue/{entity}/{id}`.
- `GET|POST /api/admin/item-groups`, `GET|PATCH|DELETE /api/admin/item-groups/{id}` (PATCH also does `{attach:[...]}` / `{detach:[...]}`).
- `POST/PATCH /api/admin/templates` accept optional `examVariantId` and per-section `examPartId`; a part must belong to the chosen version, and parts can't be set without a version. PATCH without `examVariantId` keeps the current link (so the existing "Set as default" button can't wipe it).

**Safety rules:**
- **Delete protection:** anything in the catalogue that a mock-test template still uses can't be deleted (409 with a clear message) - the database would otherwise silently unlink the template. Item groups can't be deleted while questions are attached. Running v2 exams are unaffected either way (their plan is a snapshot).
- **Only real uploads:** an item group's file reference must be a key our own upload routes produce (`item-groups/<uuid>.<ext>`) - never an arbitrary path such as a candidate's private recording.
- **Legacy-type guard:** `api/practice/questions` and `api/conversations` now select only the 4 original question types. Newer types can be imported into shared categories (e.g. Reading Comprehension), and today's practice / v1 mock-test / interview-simulation screens can't render them - they're served only by exam runner v2. Every question that existed before P1-G is one of the 4 original types, so this changes nothing for existing data (verified by test).

**Question validation & bulk import:**
- All 16 registry types are now valid question types. The 4 original types keep their exact rules; each of the 12 new types gets a shape check for its stored correct answer (`src/lib/question-types/correct-answer.ts`) - e.g. GAP_FILL needs `[["a","an"],...]`, ORDERING must contain every option exactly once, NUMERIC_ENTRY needs `{"value":n}`.
- Import template gains two **optional** trailing columns, `Item Group` and `Order In Group`; old 12-column files import exactly as before (tested). Referenced groups must exist. Export includes them; the template has a worked GAP_FILL example; friendly type spellings like `TFNG`, `Gap Fill`, `Essay` are recognised.
- Bulk import no longer flattens a structured correct answer (a real JSON array/object in a .json file) into "a | b" text - only the Options column is pipe-joined, as before.
- Carried over from P1-F: an exam version's score scale must be a real `SCORE_SCALE_KEYS` entry.

**Tests:**
- `tests/unit/admin-p1g.test.ts` - 37: every new type's correct-answer rule (valid + invalid), original types' rules unchanged, import-file compatibility and new columns, score-scale and asset-key checks, and DB-backed admin rules (catalogue create/update/auto-order/duplicate/refused deletes/cascade, template-link validation, item-group attach/detach/delete protection, bulk import with a group).
- `tests/e2e/admin-exams.spec.ts` - 3 against the real server: candidates get 403 on every new admin route; full catalogue → linked template → refused deletes → unlink → delete cycle with Activity Log entries; item group + bulk import of an active newer-type question, which is then confirmed never served by today's practice endpoint.
- `tests/e2e/admin-exams-ui.spec.ts` - 1 real-browser run: an admin builds a family/version/paper/part on `/admin/exams`, links a template in the editor, and creates a passage group - all by clicking, verified in the database, then cleaned up.
- `tests/e2e/helpers.ts` `loginAs` now also clears the test branch's login rate-limit rows before each login: the suite now logs in more than 20 times per run, all from Playwright's one shared "unknown" IP bucket. The real limit is unchanged.

**Result:** 189/189 unit tests, 20/20 e2e tests (all original P0 e2e tests pass unchanged), `npm run build` clean, `npx tsc --noEmit` clean. `npm run lint` unchanged (same pre-existing TS7 blocker).

### H. Demo exam (dev only)

A ready-made **IELTS-style Academic (demo)** exam, so exam runner v2 can be tried end to end. All passages, recordings, charts, tasks and questions are **original placeholder content written for this demo** - nothing is copied or adapted from any real exam or practice paper, and no real exam or exam board is named (checked by test).

| Paper | Time | Navigation | Parts | Content |
|---|---|---|---|---|
| Listening | 30 min | forward-only | 4 | one recording per part, heard **once**; 3 questions each (gap fill, choice, choose-two) |
| Reading | 60 min | free + review | 3 passages | 3 questions each (True/False/Not given, Yes/No/Not given, choose-two, gap fill, choice) |
| Writing | 60 min | free + review | Task 1, Task 2 | Task 1 = describe a chart, **150 words**; Task 2 = essay, **250 words**; 2 alternatives each, one picked per sitting |
| Speaking | 15 min | forward-only | 3 | Part 1: 3 × 30 s; Part 2: 1 cue card, 60 s prep + 120 s talk (2 alternatives); Part 3: 3 × 45 s |

Listening recordings and the Task 1 charts are generated on the spot from the script/numbers in `prisma/exam-demo/content.mjs`, using the two voices and drawing library built into Windows - nothing is downloaded. They're uploaded where the app reads item-group files from (R2 if configured, else `./uploads`). On a non-Windows machine the seed still works, just without recordings/charts (use `--no-assets` to skip them deliberately).

**One Prisma change** (migration `20260925104107_question_exam_part_pin`, applied to the dev and test branches only):
```prisma
model PracticeQuestion {
  // ...
  examPartId String?                                                  // new, nullable
  examPart   ExamPart? @relation(fields: [examPartId], references: [id], onDelete: SetNull)
  @@index([examPartId])
}
model ExamPart { pinnedQuestions PracticeQuestion[] }                 // back-relation only
```
Why: without it, v2 picks each part's questions at random from its category, so Reading Passage 1 could show Passage 3's questions. A question can now be **pinned** to one exam part; v2 then uses exactly that part's questions, and pinned questions are never picked for any other exam. No existing question is pinned, and the v1 runner never reads this column. Deleting a part just unpins its questions.

**How to try it (dev database only):**
1. `npm run seed:exam-demo -- --make-default` - creates the demo and makes it the default mock test. It refuses to run against anything except the dev/test Neon branches (no override). Without `--make-default` it's created but not used by `/mock-test` until you pick it in Admin > Templates.
2. Admin > Features: turn on **Exam Runner v2**.
3. As a candidate with mock tests in their plan, open `/mock-test` and start. You get the demo in the new exam screen.
4. To go back: Admin > Templates > **Set as default** on the previous template ("General English Communication Assessment" on dev), and turn Exam Runner v2 off.

Other options: `-- --reset` (remove and rebuild), `-- --remove` (remove; refuses while the demo is the default or has been sat, rather than deleting anyone's answers).

**Tests:**
- `tests/unit/exam-demo-seed.test.ts` - 14:
  - The paper structure and timings.
  - Each part has 2-3 items.
  - Every question passes the admin import validation.
  - Only newer question types are used, so none of it can reach today's screens.
  - Every answer key is graded correct by its own grader, and a wrong answer isn't.
  - Gap counts match their answers.
  - Each recording is heard once and has a transcript.
  - Chart numbers match the prompt.
  - No real exam or exam-board names appear.
  - The database guard.
  - On the test DB: the seed creates everything pinned part by part, and a re-run changes nothing.
  - A real plan uses exactly each part's own questions, with every passage and recording kept whole.
  - Pinned questions never leak into another exam.
  - Removal takes out exactly what the seed created.
- `tests/e2e/exam-demo.spec.ts` - 1 against the real server: a candidate sits all 4 papers in order. They get 12 listening items, 9 reading items across 3 passages, 150- and 250-word writing tasks, and the speaking part timings. No transcript or answer key reaches the browser. All 21 objective answers are marked correct, writing and speaking are left unmarked, and the results page shows "12 of 12" and "9 of 9" with the disclaimer. The test restores the default template and flag afterwards and removes the demo.

### Practice tests for students (follow-up to H)

Students can now choose an IELTS-style practice test on the Mock Tests page. The existing default test is unchanged and still pre-selected.

**Content:** the demo became **Practice Test 1**, and two more complete tests were added (**Practice Tests 2 and 3**). All of it is original, written for VocalisAi, and repeats nothing across tests (checked by test).

Each test has:
- **Listening:** 4 recordings (heard once), 12 questions.
- **Reading:** 3 passages, 9 questions.
- **Writing:** a chart task (150 words) and an essay (250 words).
- **Speaking:** 3 Part 1 questions, a cue card, and 3 Part 3 questions on the same theme as the cue card.

Each test is its own exam version and template (`ACADEMIC_PT1..3`), so a sitting always gets one coherent test.

**Choosing a test** (no database change - reads existing columns only):
- `GET /api/mock-tests/options` returns the default template, as before. While **Exam Runner v2** is on, it also returns every template linked to an **active** exam version of an **active** family.
- `POST /api/mock-tests/sessions` accepts an optional `{ templateId }` from that list. A choice outside the list is refused (400) **before** any usage is recorded. With no body, it behaves exactly as before.
- **Mock Tests page:** the chooser appears only when there is more than one option. With the flag off, the page is unchanged.
- **Admin control:** on Admin > Exams, **Deactivate** a version (or family) to hide its tests from students. The version card now says "Offered to students" or "Hidden from students".

**Seeding:** `npm run seed:exam-demo` creates whichever tests are missing (skips existing ones). To write to production you must pass `--production` explicitly. That flag accepts only the known production endpoint, and `--make-default` is refused there.

**Tests:**
- `tests/unit/exam-demo-seed.test.ts` (updated):
  - The shape and timings of all 3 tests.
  - No repeated content.
  - Every answer key is gradable.
  - Every listening answer is actually spoken in its recording.
  - The guard allows production only with the flag.
  - Seed, plan and remove, per test, on the test DB.
- `tests/e2e/exam-demo.spec.ts` (updated):
  - The options list with the flag off and on.
  - A refused choice costs nothing.
  - No choice still gives the default test.
  - A deactivated version is hidden.
  - The chooser screen works.
  - A full sitting of Practice Test 2 scores 12/12 and 9/9.

### Candidate experience

The candidate side is now organised into clear sections, kept fully separate from the admin area (which keeps its own dark menu and pages).

**Menu:**
- Dashboard
- **Practice ▾:** library, AI conversation, quick practice, find my focus
- **Mock Exams ▾:** take a mock exam, my results
- **Speech Analysis**
- Progress
- AI Coach
- **Account ▾:** profile, plan & billing

The current section is always highlighted. On phones and tablets, a menu lists every page grouped by section.

**New pages:**
- `/mock-tests/history`: every mock exam and exam-style practice test, with its result and status, each opening its full report.
- `/speech-analysis`: every analysed recording, with average pace, filler words and pronunciation. Each card shows pronunciation, fluency and grammar ratings and opens the full breakdown.

**Updated pages:**
- **Dashboard:** quick links to each section, plus recent mock exams and latest speech analyses.
- **Progress:** a new "Exam-style practice tests" section showing correct answers per paper, across completed sittings.
- **Mock Exams page and exam results:** both now link to "My results".

**Fixes:**
- The dashboard showed scored voice answers as "Incorrect". They now show their score.
- Internal developer wording ("…once that's built (Phase 8)") removed from the practice summary.

**Tests:** `tests/e2e/candidate-experience.spec.ts` (4 tests) runs every candidate page and checks that:
- It opens without errors, and the admin area stays closed to candidates.
- The grouped menu and the phone menu work.
- A practice session can be completed by clicking.
- A speech analysis and a mock exam appear in their sections and open.

`exam-demo.spec.ts` also checks that a finished practice test shows in My results and on Progress.

**Result:**
- 207/207 unit tests and 27/27 e2e tests pass. The full suite was re-run after the last fixes (candidate and practice-test specs: 6/6).
- Build and tsc are clean.
- Lint shows only the known TS7 blocker.

### Fix: raw question data shown in the mock test

**Problem:** 131 live question-bank questions (129 listening, 2 "describe the picture") store a production spec in `PracticeQuestion.passage`:
- an audio spec: `{"audio":{"script":[...],"voices":...,"speechRate":...,"maxPlays":...,"generationStatus":...}}`
- or an image spec: `{"image":{"prompt":...,"altText":...}}`

The mock test printed `passage` as-is, and its "Play audio" button read the whole JSON aloud. Plain-text listening passages were also printed in the mock test, which showed candidates the transcript.

**Fix - one renderer for every candidate screen:**
- `src/lib/question-stimulus.ts` turns any passage into one of four things:
  - plain text
  - a listening recording: script turns, speed, pause and play limit
  - a picture task: the scene description and key elements, never the illustrator's brief
  - or nothing
- Unrecognised or malformed JSON is never shown. Plain-text listening passages are played, not printed.
- Only the cleaned-up result leaves the server. `/api/practice/questions`, AI-generated questions and the exam runner v2 view all send it. Their `passage` field is now only ever plain display text, and internal spec fields never reach the browser.
- AI conversations use the parsed text as the scenario, never a raw spec.
- `src/components/questions/StimulusView.tsx` is used by the mock test, text practice and voice practice. It shows:
  - the reading passage
  - a **listening player** that speaks each turn in a different voice or pitch, at the spec's speed with its pauses, enforces the play limit ("You can play this recording 2 more times"), and never shows the script
  - or a **picture task** card
- Every mock-test question now has a clear instruction line for its task type: Listening, Picture task, Grammar, Vocabulary, Reading, Read aloud, Customer call, Spontaneous response, Workplace scenario, Interview.

**Future content:** bulk import (and a question edit that changes the passage) refuses a JSON passage that isn't a recognised audio or image spec, with a clear message. Plain text and the existing valid specs import and edit exactly as before. No other admin behaviour changed; no database change.

**Tests:**
- `tests/unit/question-stimulus.test.ts` (8), using the exact production shapes. It checks:
  - specs are parsed and every internal field is dropped
  - bad JSON is never shown
  - plain text is unchanged
  - listening text is played, not printed
  - values are clamped
  - the admin import check works
- `tests/e2e/mock-test-rendering.spec.ts` is a complete standard mock test in a real browser: fake camera and mic, system check, rules, 10 sections covering listening (a production-shaped audio spec), picture task (an image spec), grammar, vocabulary, reading, read aloud, customer call, spontaneous response, workplace scenario and interview. Every screen is checked for raw JSON, spec field names and the transcript. It checks the player and its play limit, records voice answers, and confirms that all 10 answers are saved and the results page opens.

### Listening audio pipeline (generated recordings)

- **`npm run generate:question-audio`** (`prisma/generate-question-audio.mjs`; add `--production` for the live DB, plus `--dry-run` and `--limit`):
  - Speaks every audio-spec question's script: a different voice per speaker (S1 and S2 map to two distinct voices, in order of appearance), at the spec's `speechRate`, with its `pauseBetweenTurnsMs`.
  - Uploads the WAV to storage under `question-audio/`.
  - Writes back into the same spec: `generationStatus: "generated"`, `audioAssetKey`, `audioScriptHash` and `generatedAt`. Every other field is kept, so admin editing works on the same data.
  - A failure is recorded as `generationStatus: "failed"` with `generationError`.
  - Re-running only processes questions that are not generated, failed, or whose script changed.
- **Stale audio can't play:** `audioScriptHash` fingerprints the script and speed. If an admin edits the dialogue, the old file is ignored automatically, and the next generator run replaces it.
- **Serving:** `GET /api/questions/[id]/audio` is for signed-in users only. It streams only that question's own validated, current `question-audio/` file (never any other stored file), with `no-store`.
- **Player:**
  - Plays the generated file. If there is none yet, or it fails to load, the same play uses the browser's voices (a different voice or pitch per speaker).
  - If nothing can play, it shows a friendly message and the play is given back.
  - Shows "Plays left: N of M".
  - A transcript appears only when `transcriptVisibleToCandidate` is true, on request, labelled "Speaker 1/2" (never S1/S2).
- **Mock test:** the buttons are now "Submit & next" / "Stop & next", and "Submit & finish" on the last question.
- **Live data:** all 129 production listening questions were generated (0 failures). A backup branch `backup-production-before-question-audio-2026-09-25` was taken first.
- **Limit:** generation uses Windows' built-in voices, so it runs from a Windows machine rather than on Vercel. Newly imported audio questions play through browser voices until the command is run again. Fully automatic server-side generation would need a paid text-to-speech API.
- **Tests:**
  - `tests/unit/question-audio.test.ts` (8): script-fingerprint parity with the generator; a file is used only when valid and current; nothing internal reaches the browser; the transcript rule; distinct voices and the rate mapping; and the audio route (sign-in required, own file only, 404 when stale, invalid or missing).
  - `tests/e2e/mock-test-rendering.spec.ts` now runs **14 consecutive questions** through "Submit & next". They include 5 production-shaped listening specs: one generated but with its file missing, which must fall back; one with a transcript allowed. Every screen is checked for JSON, spec fields, S1/S2 and hidden transcripts, and the browser's API payload is checked for internal fields.

### Verification pass: raw question data

- **Gap closed:** a question's own audio or picture spec used in a *new-style (v2) exam* now plays or renders there too (it previously showed nothing, which was not a leak but had no audio). `QuestionView.stimulus` is built by the same parser, including after resume.
- The cleaned-up picture field is renamed `keyElements` → `features`, so no spec field name reaches the browser at all.
- **`tests/e2e/raw-data-guard.spec.ts` (3 tests):**
  - New questions of any shape (2- and 3-speaker specs, an unknown JSON spec, malformed JSON) are clean on the wire. They are clicked through with Next in practice, 4 questions, with no raw data on screen. Admin import refuses the broken ones.
  - A refresh in the middle of a mock test, then re-entry, stays clean.
  - A v2 exam built from spec-shaped listening and picture questions: answer, refresh, resume the same session. Players and answers come back, and the state API and screen stay clean.
- **Read-only audit of the live question bank** (3,455 questions) through the same parser: 0 internal fields sent, 0 JSON shown as text, 0 listening transcripts printed, and 129 of 129 audio specs with a playable, current file.

### Fix: S1/S2 speaker labels reaching candidates

**Found in the live question bank (read-only search):**
- **134 listening questions** stored their dialogue as plain text, with every line starting "S1:" or "S2:". The player spoke that text, labels included, in one voice.
- **10 listening questions** (5 unique, each stored twice) said "S2" or "S3" in the question or its explanation, e.g. "What is S2's main argument?".

**Code:**
- `question-stimulus.ts` reads a plain-text "S1:/S2:" (or "Speaker 1:") dialogue as separate turns per speaker, so labels are never spoken. A written (non-listening) dialogue is shown with "Speaker 1/2".
- `validateSpeakerReferences`: admin import, and any edit that changes the wording, options, answer or explanation, refuses S1/S2-style labels in a listening question's text, with guidance to write "the second speaker".

**Data** (`npm run fix:speaker-labels`, with `--production` for live and `--dry-run` to preview):
- Rewrites labels in question text to "the first/second/third speaker", by that question's own speaking order.
- Converts plain-text dialogues to the standard audio spec, using the bank's per-level play limits and speeds.
- Then run `generate:question-audio`.

**Live:**
- A backup `backup-production-before-speaker-label-fix-2026-09-25` was taken first.
- 10 questions reworded, 134 dialogues converted, and 134 recordings generated (0 failed).
- Audit of all 3,455 live questions: 0 labels in question text, 0 labels spoken or shown, 0 internal fields, and 263 of 263 conversations with a playable recording.
- Dev was repaired the same way. It has no recordings, so the browser's voices play the turns there.

**Tests:**
- `tests/unit/speaker-labels.test.ts` (9): dialogue parsing parity with the repair script, the rewrite by speaking order, refusal to guess an unknown label, spec conversion, and the import rule.
- `raw-data-guard.spec.ts`: adds a plain "S1:/S2:" dialogue, which plays as 2 speakers with no labels on screen or in what is spoken, and an import refusal for "What is S2's view".

### Candidate icons: one consistent set

- **Problem:** icons mixed a filled 20px style with outlined ones at different stroke weights. Some were distorted: the mock-test "Camera" icon was drawn outside its frame. Others didn't match their feature: every landing feature card showed the same checkmark, and the "progress starts here" card used a download arrow.
- **Fix:** all candidate icons now use `lucide-react` (ISC licence) through one component, `src/components/ui/Icon.tsx`:
  - a single stroke weight of 1.75;
  - fixed sizes of 12, 16, 18, 20 and 28 px;
  - `IconBadge` for feature tiles.
- **Replaced:**
  - the menu arrows, phone menu button (now toggles to a close icon) and logo mic;
  - the mock-test prep icons (Video, Mic, House);
  - the system-check and rules ticks;
  - the results ticks;
  - the sign-in page ticks;
  - the listening and picture task icons;
  - the dashboard icons (Target, plus a feature icon on each card);
  - the landing hero badge, trust bar and feature cards (each with its own icon), and the list and pricing ticks.
- Charts (score ring, trend line) are marked `data-chart` and left unchanged. Layout, colours, menus and behaviour are unchanged.
- **Test:** `tests/e2e/icons.spec.ts` visits every candidate page, the menus, and the mock-test entry and listening screens at 1280px and 390px. It checks that every icon comes from the shared set, uses the same stroke and a standard square size, and that no page errors occur. Screenshots are saved to `test-results/icons/`.

### Candidate buttons: one premium button system

- **`globals.css` button system** replaces the two basic styles:
  - **Variants:** `.btn-primary` (gradient, soft depth), `.btn-secondary` (white, bordered), `.btn-danger` (end or stop actions), `.btn-ghost` (Back and navigation) and `.btn-dark` (secondary actions on the dark exam screen).
  - **Sizes:** default 44px (touch-friendly), `.btn-sm` and `.btn-lg`.
  - **States:** hover, pressed, a `:focus-visible` ring, disabled, and `data-loading="true"` (a spinner that keeps the label and blocks clicks).
- Existing `btn-primary` / `btn-secondary` markup upgrades automatically. Hand-sized overrides (`px-3 py-1.5 text-xs`, inline padding, `disabled:opacity-60`) and hand-rolled buttons were replaced.
- **Key actions now use the system, with icons and loading states:**
  - Begin system check / Continue / Start test
  - Start section, Start practice (difficulty buttons), Play audio / Play recording
  - Start recording and Stop (danger), Submit & next, Next question, Previous / Next / Review answers / Submit section on the exam screen
  - End assessment (danger), Try again, Practice again, Re-record, Back to Practice (ghost)
  - Sign-in and account forms (loading), coach send, profile save, conversation practice, results pages, landing CTAs
- The exam screen's "Back" is now **"Previous"** (test updated).
- **Fix:** during an exam the sticky site menu covered the exam bar (timer + End assessment) once the candidate scrolled. The exam bar is now pinned, and the site menu scrolls away only during an exam (`html[data-exam-session]`).
- Multiple-choice answer options get a comfortable size and the same focus ring.
- **Test:** `tests/e2e/buttons.spec.ts` covers the practice, exam-entry, rules, exam-question and sign-in buttons at desktop and phone width: the right variant, consistent heights, disabled until ready, hover change, the focus ring, the loading spinner, and End assessment staying visible and uncovered after scrolling.

## Skills platform - Phase 1: data model & taxonomy (branch `feat/skills-platform`)

**Principle:** questions belong to skills (category → subcategory → skill); exams, mocks, drills and Goal Tracks are recipes over skills. This follows blueprint rev. 2 (26 Sep 2026): no coding content, no personality tests.

**Taxonomy** (`src/lib/skills/taxonomy.ts`): 12 categories, 77 subcategories, 213 skills (302 nodes), with the L1–L6 ladder.
- **Enabled in v1:** ENG, SPK, QNT, REA, VRB, CSV, SJT and INV. REA and QNT were added by the owner; SJT was added because it already has 241+ questions.
- **Hidden:** COG, DIN, BIZ and DGT, behind the `skills_all_categories` flag (default OFF).

**Migration `skills_platform_phase1`** (additive only, reversible with `down.sql`):
- **New tables:** Skill, Rubric, UserSkillMastery, GoalTrack, GoalTrackSkill, ExamBlueprint.
- **New nullable columns:**
  - PracticeQuestion: skillId, skillPrecision, skillSource, level, format, distractorReasons, hint, rubricId, bankStatus.
  - PracticeAttempt: skillId, level.
  - Profile: goalTrackId.
- Applied to the **test, dev and staging** Neon branches only. **Production has not been migrated** and is waiting for "ship to production".
- **Reversibility proven on test:** down.sql removed all 6 tables and the new columns, with every existing row unchanged; re-applying and re-seeding then worked.

**Seed / legacy migration** (`npm run seed:skills`; idempotent; `--dry-run`; `--production` required for live):
- Syncs the skill tree.
- Adds 4 rubrics: SPEAKING_6D, ROLEPLAY_CALL, EMAIL_REPLY and INTERVIEW_STAR.
- Adds 5 Goal Tracks with skill weights; CAMPUS and STUDY_ABROAD are hidden.
- Adds exam blueprints, including links from the **existing** BPO ("Workplace Communication Assessment") and General English mock tests to their tracks, plus 8 category diagnostics.
- Maps questions: old category/type → skill node, and old difficulty → level (BEGINNER=L2, INTERMEDIATE=L3, ADVANCED=L4, EXPERT=L5). It never overwrites a question that already has a skill.
- Copies each question's skill and level onto its past attempts.
- **Staging result (a copy of live):** 3,455 of 3,455 questions mapped, none unmapped, 67 attempts tagged.
  - Precision: 155 exact skill, 2,817 subcategory, 483 category.
  - Exact skills for the rest need a reviewed classification pass; that isn't guessed.
- **Staging** is a separate Neon branch copied from production, for Vercel Preview deployments. It is not connected until Preview's `DATABASE_URL` is set in Vercel.

**Tests:** `tests/unit/skills-phase1.test.ts` (11):
- taxonomy integrity (12 categories, unique ids and parents, the v1 flags, no coding or personality content, the ladder);
- the mapping covers every existing practice category with an enabled node;
- goal-track weights reference real skills;
- the seed is idempotent, never overwrites an author tag, and tags new legacy questions and past attempts;
- tracks and blueprints link the existing exams.

## Skills platform - Phase 2: skill practice & weak-area engine (branch `feat/skills-platform`)

**No database migration.** Phase 2 uses only the Phase 1 tables and columns.

**Mastery** (`src/lib/skills/mastery.ts`, stored by `mastery-store.ts` in UserSkillMastery):
- Each skill gets a 0–100 score from weighted accuracy, recency and difficulty. There is no IRT.
  - **Recency:** a 14-day half-life.
  - **Difficulty:** factor 0.75 + 0.1 × (level − 1). A correct answer at a harder level earns more; a miss at a harder level costs less.
  - **History:** only the latest 50 answers count.
  - **Roll-up:** a skill's score also counts towards its subcategory and category.
- **Bands:** Weak <50, Developing 50–74, Proficient 75–89, Mastered ≥90. A band needs at least 5 answers, and Mastered also needs 2 or more levels seen.
- **Voice answers** count once analysed, using the same "Overall" as the results page (average of 5 AI ratings plus pace).
- **Backfill:** the dashboard reconciles each user's history, so answers from before Phase 2 count too. Only changed rows are written.

**Answering (existing `/api/practice/attempts`, extended additively):**
- Copies the question's skill and level onto the attempt.
- Works out the new mastery (one extra query) and **saves it after the response is sent** (`after()`), so answering is no slower. This can never fail the answer.
- Returns `distractorReason` (why the chosen wrong option is wrong) and the new mastery.
- The speech-analysis save also updates mastery.

**Quick Drills** (`/skills/drill/[skill]`, `GET /api/skills/drill`):
- 5–10 instantly-marked questions for any skill, subcategory or category node, easiest first.
- Aimed half a level above what the candidate recently got right, with recently seen questions held back.
- Filtered to the difficulties the candidate's plan includes.
- Instant feedback: right or wrong, why the chosen option is wrong, how to get it, and an optional hint.

**Usage:** a drill or diagnostic counts as **one** practice session. The start route issues a signed token (`drill-token.ts`, HMAC with NEXTAUTH_SECRET). Answers carrying a valid token aren't charged again; all other answers are charged exactly as before.

**"I'm weak in X"** (`/skills/diagnostic/[category]`, `GET /api/skills/diagnostic`):
- Follows the category's diagnostic blueprint: 2 questions per subcategory at L2–L4, one per level first, at most 12.
- Categories whose older questions sit at category level (SJT) are topped up from the whole category.
- Results are shown per subcategory, with recommended drills for the weakest.
- Speaking-type categories (SPK, CSV, INV) point to their recorded-practice modes instead.

**My Skills dashboard** (`/skills`):
- An "I'm weak in…" entry point.
- Recommended drills: the weakest rated areas that have questions.
- Per-category cards showing the band, score and bar, subcategory rows with a Drill link, and "Check my level".
- Short candidate-facing category names (`CATEGORY_SHORT_NAMES`); the full blueprint names stay for admin.
- **Visibility:** candidates see the v1 categories only. The `skills_all_categories` flag reveals all 12 on every skills screen and route (`visibleSkillWhere` / `findVisibleSkill`).
- Works at phone width.

**Entry points:**
- "My skills" is first in the Practice menu.
- The Practice library has a new **Aptitude & Reasoning** group.
- Quick practice has a **Quick Skill Drills** section.
- `/skills` and `/api/skills` sit behind the sign-in guard.

**Starter content** (`npm run seed:skills-content`; idempotent; `--production` required for live). It adds 176 original questions in three new practice categories: NUMERICAL_APTITUDE, LOGICAL_REASONING and VERBAL_REASONING.
- **136 are computer-generated** (`prisma/skills-content/generated.mjs`, fixed seed, so they're the same on every run). Answers are computed from the question's own numbers, so they're correct by construction. They cover:
  - percentages, profit/loss, ratio, averages, interest, time and work, speed and distance, LCM/HCF, discounts;
  - number and letter series, coding-decoding, directions, ranking, clocks and calendars.
- **40 are hand-written** (`authored.mjs`):
  - true/false/cannot say, sentence completion and ordering, critical reasoning (strengthen, weaken, assumption, inference, flaw), fact vs opinion, argument evaluation;
  - syllogisms, blood relations, statements and conclusions.
- Every question has an exact skill, a level, a hint and a reason for every wrong option.
- Loaded into **test, dev and staging only**.
- Starter questions later removed from the source files are retired (isActive=false), never deleted.

**Tests:**
- `tests/unit/skills-phase2.test.ts` (18):
  - mastery maths: recency, difficulty, bands, the 50-answer window, roll-up, voice score;
  - bank integrity, with answers recomputed from the question text;
  - drill-token forgery, expiry and wrong-user checks;
  - the full drill → answer → mastery flow on the test DB: one charge per drill, no answers leaked, distractor reasons, and the 3-level roll-up;
  - the diagnostic spread, the voice redirect, and hidden categories returning 404.
- `tests/unit/skills-visibility.test.ts` (2): hidden categories stay hidden until the flag is on, then all 12 appear.
- `tests/e2e/skills.spec.ts` (3): the dashboard, a drill with feedback, the diagnostic with recommendations, the new entry points, and no horizontal overflow at 390px.
- `question-import.test.ts` fix: its cleanup deleted every GRAMMAR question created during its run, including other test files' questions when they ran in parallel. It now deletes only its own.

**Noted, not changed:** in the existing Practice library flow, *each answered question* uses one of a FREE user's 5 lifetime "practice sessions", so 5 questions use up the whole free allowance. Skill Drills avoid this with the token above. The existing flow is unchanged pending a decision.

## Shipped to production (26 Sep 2026)

Phases 1 and 2 are live on vocalisai.vercel.app. The owner gave the go-ahead with "ship to production".

**Order of release:**
1. Neon backup branch `backup-production-before-skills-platform`.
2. `prisma migrate deploy` applied the one pending migration, `skills_platform_phase1`.
3. `seed:skills --production`:
   - 3,455 of 3,455 questions mapped to skills;
   - 87 past attempts tagged.
4. `seed:skills-content --production` added 176 questions.
5. `main` fast-forwarded to `feat/skills-platform` and pushed. Vercel production deploy is Ready; smoke checks passed.

## Large question bank + fresh-first selection (branch `feat/skills-platform`)

**Fresh-first selection** (`src/lib/question-freshness.ts`), used by every place a candidate is served questions:
- Solo practice and v1 mock tests (`/api/practice/questions`).
- New-style v2 exams (`buildPlan` / `selectQuestionUnits`).
- Skill Drills and "I'm weak in…" diagnostics.
- AI conversations.

How it chooses:
- Questions the candidate has **never** met come first, in random order.
- Repeats only happen once that area and level is used up, least-recently-seen first.
- "Met" counts any activity: practice, drill or mock answers (PracticeAttempt), v2 exam items (ItemResponse, even when skipped) and AI conversations (ConversationSession).
- This replaces the old per-category "last 50 answers" cooldown.

**Bank:** `npm run seed:skills-content` now loads 2,318 questions, 2,141 of them new. Identity is prompt + passage. The loader is idempotent, retires removed items, and skips copies of questions already in the bank.
- **Numerical Aptitude: 1,004.** Generated; covers all 35 QNT skills with every answer computed from the question's own numbers. About 100 are Expert multi-step questions.
- **Logical Reasoning: 802.** Generated: series, odd one out, classification, analogies, rules, coding, blood relations, directions, ranking, and linear, circular, floor and schedule puzzles. Puzzles are solved by brute force and kept only when the answer is unique. It also covers:
  - syllogisms checked against every Venn model;
  - cubes, Venn counts, input-output, data sufficiency;
  - real-calendar weekday questions and clock angles.
- **Verbal Reasoning: 194.** Hand-written:
  - 20 passages × 3 true/false/cannot-say statements;
  - sentence completion, sentence ordering and critical reasoning;
  - argument evaluation;
  - a fact-vs-opinion set built from two hand-checked lists.

  Plus 11 statements-and-conclusions, assumptions, and cause-and-effect items (these sit under Logical Reasoning).
- **Situational judgement: 38 new** (+ existing 241), across all 7 SJT skills.
- **Open prompts: 40 each** (10 per level) for Read Aloud, Fluency, Supervisor, Casual Conversation, Customer-Service role-play, Interview and Writing. Each is tagged to an exact skill and scored by the existing speech and writing analysis.
- Loaded into test, dev and staging. **Live DB gets it on the next ship.**

**Tests:**
- `question-freshness.test.ts`: fresh-first ordering; v2 exams prefer unseen units; 3 practice rounds on a private 12-question pool never repeat until it's used up, then repeat oldest first; conversations count as seen.
- `skills-phase2.test.ts` bank checks:
  - over 2,000 questions, the same on every run, no duplicates;
  - at least 15 MCQs per level in each aptitude area;
  - every MCQ's answer is among its options and every wrong option has a reason;
  - open prompts have no fixed answer;
  - every floor puzzle is re-solved independently and has exactly one answer.
