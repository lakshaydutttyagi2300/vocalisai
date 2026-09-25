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
