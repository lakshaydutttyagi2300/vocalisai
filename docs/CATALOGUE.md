# Exam catalogue (Explore)

Candidates browse **Category → Exam → Subject → Level** at `/explore` (public; starting practice needs an account).

| Layer | Where it lives | Example |
|---|---|---|
| Category (10) | `CATALOGUE` in `src/lib/catalogue.ts` | Government & Competitive Exams |
| Exam | same file, `exams` | Banking-style exams (PO, Clerk) |
| Subject | a practice mode slug (`src/lib/practice-taxonomy.ts`) | `numerical-aptitude` |
| Level | the question's `difficulty` | `ADVANCED` |

## How questions are tied in

Every question already stores its prompt, options, correct answer, explanation, practice category (the subject), difficulty, type and a unique id (`PracticeQuestion`). A question's **exam and category come from the catalogue**: a grammar question serves every exam that lists `grammar`. That keeps one well-reviewed bank per subject and level instead of copies per exam.

When an exam needs its own questions (for example general awareness for banking-style exams), add them as a new practice mode, then list its slug under that exam. If exam-specific questions ever need to live inside a shared subject, add an optional exam tag to `PracticeQuestion` (an additive migration) rather than duplicating the bank.

## Rules

- A subject shows **Coming soon** at a level with fewer than `MIN_QUESTIONS_PER_LEVEL` (20) questions; levels never borrow questions from each other (see `DIFFICULTY_LEVELS.md`).
- `upcoming` subjects are listed but can't be started. An exam with no subjects must list what's coming (checked in `tests/unit/catalogue.test.ts`).
- Other organisations' exams are named "-style", with the not-affiliated notice.
- `mockFamilies` link to the exam library's timed mocks (`/mock-tests?type=<family>`).

## Adding things

- **An exam:** add an entry to the right category. Nothing else changes.
- **A category:** add it to `CATALOGUE` and an icon to `src/components/explore/categoryIcons.ts`.
- **A subject:** create its questions and practice mode first, then list its slug.
