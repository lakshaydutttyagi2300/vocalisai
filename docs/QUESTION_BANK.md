# Question bank

## Storage

Every question is one row in **`PracticeQuestion`** (`prisma/schema.prisma`).

| Field | Meaning |
|---|---|
| `id` | cuid, the question ID used everywhere (attempts, exam responses, history) |
| `category` | one of the 17 practice categories in `src/lib/practice-taxonomy.ts`: GRAMMAR, VOCABULARY, READING_COMPREHENSION, LISTENING, SITUATIONAL_JUDGEMENT, NUMERICAL_APTITUDE, LOGICAL_REASONING, VERBAL_REASONING, INTERVIEW, WRITING, READING (read aloud), PRONUNCIATION, FLUENCY, SPEAKING, CUSTOMER_SERVICE, SUPERVISOR, CONVERSATION_PARTNER |
| `type` | question type: the original MULTIPLE_CHOICE, SHORT_ANSWER, LISTENING_COMPREHENSION and voice types, plus 12 newer exam types (gap fill, matching, ordering, true/false/not given, and so on). There are 16 types in all in `src/lib/question-types/`, each with a grader. |
| `difficulty` | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |
| `level` | 1-6 (blueprint level). L1-2 is Beginner, L3 Intermediate, L4 Advanced, L5-6 Expert. See `difficultyForLevel` in `src/lib/skills/question-tags.ts`. |
| `skillId`, `skillPrecision`, `skillSource` | the skill it tests (`Skill` table). `skillSource` is `legacy-auto` (mapped from category/type), `classified` or `author` (set by hand; kept on edit). |
| `prompt`, `passage`, `options` (JSON array), `correctAnswer`, `expectedAnswer`, `explanation`, `distractorReasons` (JSON), `hint` | content. `passage` can be plain text **or a JSON audio/image spec** (see LISTENING_SYSTEM.md). |
| `source` | `SEEDED` (original seeds and admin imports), `SKILLS_STARTER` (the big generated/authored bank), `AI_GENERATED` (Gemini scenarios) |
| `isActive` | admin enable/disable (soft delete; nothing is hard-deleted) |
| `bankStatus` | draft / review / live / retired. null means legacy, treated as live. The bank loader marks removed items `retired` and inactive. |
| `itemGroupId`, `orderInGroup` | shared stimulus (one passage or audio clip, several questions) |
| `examPartId` | pins a question to a specific exam paper part (IELTS-style practice tests) |

Live database (read-only audit, 26 Sep 2026):
- **5,772 active questions**;
- 0 without a skill, 0 without a level, 0 on hidden skills;
- 302 skills.

## Where questions come from

1. **Original seeds**: `prisma/seed.mjs`, `seed-phase4.mjs`, `seed-writing.mjs`, `seed-fluency.mjs`, `seed-conversation-roles.mjs`.
2. **The large bank (`SKILLS_STARTER`)**:
   - Loaded by `npm run seed:skills-content` (`prisma/seed-skills-content.mjs`) from `prisma/skills-content/`.
   - Generated items (built by code with checked answers):
     - `generated-qnt.mjs`: 921 numerical;
     - `generated-rea.mjs`: 724 reasoning; puzzles are re-solved by brute force in the tests.
   - Written items:
     - `authored-verbal.mjs`: 179 verbal;
     - `authored-prompts.mjs`: 38 SJT and 280 open speaking/writing prompts.
   - v1 content in `generated.mjs` and `authored.mjs`; `gen-kit.mjs` holds helpers.
   - **Identity** is `source + prompt + "\u0000" + passage`. Re-running is idempotent: it adds new items, retires removed ones, and skips anything identical to a question from another source.
   - Add `--production` to load into the live database.
3. **Admin bulk import**:
   - Admin, Question Bank: paste JSON, or upload XLSX/CSV/JSON/TXT (`src/lib/question-import.ts`, `question-file-format.ts`, `question-validation.ts`).
   - Rows are validated, checked for near-duplicates, and (since Phase 5) **auto-tagged with skill and level**.
   - **Catalogue files over 2,000 rows** (the Admin catalogue import limit): `node scripts/import-questions.mjs <file.csv>` checks every row with the same `importQuestions()` the Admin page uses, one subject at a time; add `--save` to load, and `--save --production` (with `DATABASE_URL` set to production) for the live site. Nothing saves unless every batch passes; questions already in the bank are skipped, so a re-run never adds a question twice. Used on 3 Oct 2026 to load 6,509 questions into 15 subjects.
4. **Admin single add / edit / duplicate**: tags follow category and difficulty automatically. Hand-set tags are kept (`tagsAfterEdit`).
5. **AI scenarios**: `POST /api/practice/questions/generate` (Gemini) creates `AI_GENERATED` customer-service or role-play scenarios, auto-tagged.
6. **Demo IELTS-style practice tests**: `prisma/exam-demo/` (3 tests; seeded with `npm run seed:exam-demo`).

## Duplicate detection
- **Import/admin:** `src/lib/question-dedup.ts` compares word sets (Jaccard similarity, threshold 0.72) against the whole category. Near-duplicates are flagged and skipped unless the admin allows them.
- **Bank loader:** exact identity (prompt + passage) across all sources.
- **Tests:** `tests/unit/skills-phase2.test.ts` checks bank integrity (unique prompts, valid answers, re-solved puzzles).

## Selection: "fresh first" (why users don't see repeats)

`src/lib/question-freshness.ts` is used by **every** activity:
- solo practice (`api/practice/questions`);
- v1 mock tests (they fetch per section through the same route);
- v2 exams (`exam-runner.ts`, `selectQuestionUnits` / `buildPlan`);
- Quick Drills and diagnostics (`src/lib/skills/drills.ts`, `pickDrill` / `pickDiagnostic`);
- AI conversations (`api/conversations`).

The rule:
1. Questions this user has **never** seen come first, in random order.
2. Only when those run out are seen ones reused, **longest-ago first**.
3. "Seen" means any trace, from any activity:
   - a `PracticeAttempt` (practice, drill or mock answer);
   - an `ItemResponse` (v2 exam item, created even if skipped);
   - a `ConversationSession` started from that question.
4. Exposure history comes from those tables. There is no separate "exposure" table.

Randomisation: the fresh pool is shuffled, and practice screens shuffle again on each fetch.

## Categorisation

- **Practice categories** (above) map to **skills** through `src/lib/skills/legacy-mapping.ts`.
- **Skill taxonomy** (`src/lib/skills/taxonomy.ts`, blueprint rev. 2) has 12 categories, then subcategories, then skills (302 rows):
  - **Visible (V1):** ENG English Language Proficiency, SPK Spoken Communication/Voice & Accent, QNT Quantitative Aptitude, REA Logical & Analytical Reasoning, VRB Verbal Reasoning & Critical Thinking, CSV Customer Service, SJT Situational Judgement, INV Interview & Career Readiness.
  - **Hidden** unless the `skills_all_categories` flag is on: COG Cognitive & Abstract, DIN Data Interpretation, BIZ Workplace & Business Communication, DGT Workplace Digital Skills.
  - Out of scope: coding tests, and personality tests (not in the scored bank).
- **Exam types:** the exam catalogue (`ExamFamily`, `ExamVariant`, `ExamPaper`, `ExamPart`) has 7 family slugs: IELTS_STYLE, SELT_STYLE, PTE_STYLE, CAMBRIDGE_STYLE, APTITUDE, EMPLOYMENT, GENERAL_ENGLISH (`src/lib/exam-catalogue.ts`). Mock templates link to a variant; questions can be pinned to parts.
- **Goal Tracks** (`GoalTrack`, `GoalTrackSkill` weights, `ExamBlueprint` kind `mock`):
  - enabled: GENERAL_ENGLISH, BPO_SUPPORT, INTERVIEW_PREP;
  - hidden: CAMPUS, STUDY_ABROAD.
  - The BPO track's exam is "Workplace Communication Assessment"; General English has its own assessment.

## Still to do / limits

- **Small pools repeat sooner.** Fresh-first can only avoid repeats while unseen questions exist. Admin, Question Bank shows a coverage grid (active / total per category and difficulty). Check it on the **live** site. In the *test* database copy (28 Sep), some pools were small:
  - Listening: about 2-3 active per difficulty;
  - Writing, Fluency, Interview and the conversation roles: about 11-14 per difficulty.

  A heavy user will cycle through small pools. **Fix by adding content, not code.**
- `src/lib/question-selection.ts` (`selectWithCooldown`) is the older selection helper. It's now **unused** by the app; freshness replaced it. Leave it, or delete it in a clean-up.
- The hidden skill categories (COG, DIN, BIZ, DGT) have no bank content yet.
- The AI-generated scenarios are unvetted by a human (source `AI_GENERATED`).
