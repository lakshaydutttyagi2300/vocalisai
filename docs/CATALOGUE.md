# Exam catalogue

VocalisAi's preparation layer for **private-sector hiring**: company and provider assessments, aptitude and reasoning, English and communication, workplace assessments, management entrance tests and professional certifications. Candidates reach the same question bank two ways:

- **Assessment-first:** Category → Assessment → Section → Subject / Skill → Level → Mode (`/explore/[category]/[exam]`).
- **Skill-first:** Practice area → Skill → Level → Mode, no company needed (`/explore/skills/[subject]`).

Everything is managed by admins in the database; no code change is needed to add a company, provider, assessment, section, subject, skill or question.

## Structure

| Layer | Model | Notes |
|---|---|---|
| Category | `CatalogCategory` | Company & Hiring Assessments (shown first), Aptitude & Reasoning, English & Communication, Workplace Assessments, Career & Entrance Assessments, Professional & Certification Exams. |
| Assessment | `CatalogExam` | Belongs to one category. `groupName` is its sub-heading ("Assessment providers" or "Company assessments"); `isPopular` shows it under **Featured assessments**; `keywords` feed search; `mockMinutes` times the full mock. |
| Section | `CatalogExamSubject.sectionName` | The assessment's own name for a section (TCS NQT's "Numerical Ability"). Several subjects can share a section (AMCAT's "English Comprehension" = Grammar + Vocabulary + Reading Comprehension). Also holds each subject's full-mock question count. |
| Subject | `CatalogSubject` | **Shared** between assessments, so one Logical Reasoning bank serves AMCAT, TCS NQT, Infosys and the rest. Optional `legacyCategory` bridges an older question bank (see below). |
| Skill | `CatalogSkill` | Belongs to one subject; `slug` unique within it. |
| Level | `PracticeQuestion.difficulty` | Beginner, Intermediate, Advanced, Expert. Every question has exactly one; levels never share or borrow questions. Free plans: Beginner and Intermediate (`PLAN_DIFFICULTY_ACCESS`). |

**Practice by skill** lists the active subjects used by the Aptitude & Reasoning, English & Communication and Workplace Assessments categories (`SKILL_FIRST_CATEGORIES` in `src/lib/catalog-queries.ts`), plus links to the spoken-English practice modes (recorded answers with AI feedback). Coding and programming assessments are deliberately not part of the catalogue.

**The structure lives in `prisma/catalogue/content.mjs`** (no questions):

- `npm run seed:catalogue` - fresh databases: adds what's missing, never changes existing rows (admin edits survive).
- `node prisma/catalogue/apply.mjs` - brings an existing database in line with the file (`--print` shows the SQL; `--production` for the live database, after a Neon backup branch). It updates the listed rows, replaces the listed assessments' sections and **switches off** everything in `RETIRED`; it never deletes, so candidates' test history keeps its names.

**Government exams were retired on 1 Oct 2026** (Banking, SSC, Railway, UPSC, State, Police & Defence, Teaching, and government-run entrance tests). Their categories and exams are switched off, not deleted; their old addresses redirect to Explore, and assessments that moved (TCS NQT and the other company tests, out of the old Campus Placement; CAT into Career & Entrance) redirect to their new address.

Company and provider names identify the tests candidates prepare for; every assessment page says VocalisAi isn't affiliated with them, and tiles use initials, never logos.

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
| `exams` | no | `tcs-nqt; amcat` | Limit to these assessments. Empty = every assessment with the subject. |
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
