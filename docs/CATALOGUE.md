# Exam catalogue

The India-focused exam preparation layer: candidates choose **Category → Exam → Subject / Skill → Level → Mode**, practise, and track their performance. Everything is managed by admins in the database; no code change is needed to add an exam, subject, skill or question.

## Structure

| Layer | Model | Notes |
|---|---|---|
| Category | `CatalogCategory` | 13 seeded (Banking, SSC, Railway, UPSC, State, Police & Defence, Teaching, University & Entrance, Campus Placement, Aptitude & Reasoning, English & Communication, Professional & Certification, Government & Competitive). |
| Exam | `CatalogExam` | Belongs to one category. `isPopular` shows it under Popular exams; `keywords` feed search; `mockMinutes` times the full mock. |
| Subject | `CatalogSubject` | **Shared** between exams (`CatalogExamSubject`, which also holds each subject's full-mock question count). Optional `legacyCategory` bridges an older question bank (see below). |
| Skill | `CatalogSkill` | Belongs to one subject; `slug` unique within it. |
| Level | `PracticeQuestion.difficulty` | Beginner, Intermediate, Advanced, Expert. Every question has exactly one; levels never share or borrow questions. Free plans: Beginner and Intermediate (`PLAN_DIFFICULTY_ACCESS`). |

The starting structure (13 categories, 77 exams, 30 subjects, 166 skills, **no questions**) is `prisma/catalogue/content.mjs`, loaded by `npm run seed:catalogue` (add `-- --production` for the live database). The seed only creates what is missing and never overwrites an admin's edits.

## Questions

A catalogue question is a `PracticeQuestion` with a `subjectId`:

| Field | Column |
|---|---|
| Unique ID | `id` |
| Category, exam | from the subject's exams; `QuestionExam` rows limit a question to named exams (none = every exam with its subject) |
| Subject, skill | `subjectId`, `catalogSkillId` |
| Level | `difficulty` |
| Question type | `type` (the auto-marked types in `TEST_QUESTION_TYPES`, `src/lib/practice-bank.ts`) |
| Question, passage, options | `prompt`, `passage`, `options` (JSON list) |
| Correct answer, explanation | `correctAnswer`, `explanation` |
| Tags | `tags` |
| Status | Active (`isActive`), Inactive (`isActive=false`), Archived (`archivedAt` set; never served, history kept) |

Every saved question is checked by `questionProblem()` (`src/lib/catalog-admin.ts`): the correct answer must be marked correct by the question type's own marker. Questions of subjects without an older bank get `category = "CATALOG"`, so they never appear in the older practice modes.

**Bridged subjects.** Quantitative Aptitude, Reasoning Ability, Verbal Ability, English Grammar, Vocabulary, Reading Comprehension and Situational Judgement point at the existing banks (`legacyCategory`), so their questions are available immediately. Untagged questions of that bank count as the subject's; they have no catalogue skill, so skill practice needs newly tagged questions.

## Importing a question bank

Admin → Content → **Catalogue questions** → Import questions. Download the template, fill one row per question, upload. Every row is checked first; **nothing is saved unless every row is valid**, and each problem is listed by spreadsheet row.

| Column | Required | Example | Notes |
|---|---|---|---|
| `subject` | yes | `reasoning` | The subject's short name (shown on the Exam catalogue page). |
| `skill` | no | `syllogism` | The skill's short name within that subject. |
| `exams` | no | `ssc-cgl; ibps-po` | Limit to these exams. Empty = every exam with the subject. |
| `difficulty` | yes | `BEGINNER` | BEGINNER, INTERMEDIATE, ADVANCED or EXPERT. |
| `type` | no | `MULTIPLE_CHOICE` | Default MULTIPLE_CHOICE. Also READING_COMPREHENSION, TRUE_FALSE_NOT_GIVEN, YES_NO_NOT_GIVEN, MULTI_SELECT, GAP_FILL, ORDERING, NUMERIC_ENTRY, MATCHING. |
| `question` | yes | `Which river…?` | |
| `passage` | no | | A text shown above the question. |
| `options` | for choice types | `Ganga \| Godavari \| Yamuna` | Separate with `\|` (or a JSON list). |
| `correctAnswer` | yes | `Ganga` | Must match an option exactly. TRUE/FALSE/NOT_GIVEN for true-false types. JSON for the rest: GAP_FILL `[["a","an"],["comfortable"]]`, NUMERIC_ENTRY `{"value": 42}`, MULTI_SELECT/ORDERING `["a","c"]`. |
| `explanation` | no | | Shown after answering. |
| `tags` | no | `syllogism; basics` | |
| `status` | no | `ACTIVE` | ACTIVE, INACTIVE or ARCHIVED. |
| `timeLimitSeconds` | no | `60` | Used to time timed tests. |

Limits: 2,000 rows per file. A question already in the bank (same subject, level and text) or repeated in the file is rejected.

## Candidate modes

| Mode | What it serves | Marking |
|---|---|---|
| Practice (untimed) | One subject or skill at one level | After each question |
| Timed test | Same, timed by the questions' `timeLimitSeconds` | At the end |
| Weak areas | The candidate's lowest-accuracy skills (or subjects), at least 3 answers each, under 70% | After each question |
| Revision | Questions already seen, wrong answers first | After each question |
| Bookmarks | Bookmarked questions | After each question |
| Full mock | Every subject of the exam, using its mock counts, timed by `mockMinutes` | At the end |

Practice, timed tests, weak areas, revision and bookmarks use one **practice session**; a full mock uses one **Full Mock Assessment** (plan limits). An empty selection is never charged. A test is a `PracticeTest`; its answers are `PracticeAttempt` rows with `practiceTestId` (one per question per test).

## No repetition

`QuestionSeen` holds one row per candidate and question (times seen, times answered, times right, last seen, last result). When a test is built (`src/lib/question-order.ts`): questions never seen come first, in random order; then the least recently seen; Revision deliberately uses only seen questions. Questions sharing a passage are always served together.

## Tracking

- **Review** after each test: score, accuracy (of answered questions), time per question, every answer with the correct one and the explanation.
- **Test history** (`/practice-tests`) and **Performance** (`/performance`): accuracy, questions answered and average time by subject, skill and level, and recent scores.
- **Admin question statistics**: times served, candidates, attempts, accuracy and average time per question.

## Where the code is

| Concern | File |
|---|---|
| Candidate pages | `src/app/explore/*`, `src/app/practice-tests/*`, `src/app/performance`, `src/app/bookmarks`, `src/components/explore`, `src/components/practice-tests` |
| Picking and tracking | `src/lib/practice-bank.ts`, `src/lib/question-order.ts`, `src/lib/practice-tests.ts` |
| Reading the catalogue | `src/lib/catalog-queries.ts`, `src/lib/performance.ts` |
| Admin | `src/app/admin/catalogue/*`, `src/lib/catalog-admin.ts`, `src/app/api/admin/catalogue/*` |
| APIs | `/api/practice-tests`, `/api/practice-tests/[id]`, `/api/practice-tests/[id]/answers`, `/api/practice-tests/[id]/submit`, `/api/bookmarks` |
| Tests | `tests/unit/practice-tests.test.ts`, `question-order.test.ts`, `catalog-admin.test.ts`; `tests/e2e/exam-catalogue.spec.ts`, `admin-catalogue.spec.ts` |
