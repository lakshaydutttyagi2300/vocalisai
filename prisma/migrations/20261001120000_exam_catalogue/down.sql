-- Reverses 20261001120000_exam_catalogue. Deletes the catalogue, question
-- tracking, bookmarks and catalogue test history. Existing questions and
-- attempts keep every other column.

ALTER TABLE "PracticeAttempt" DROP CONSTRAINT IF EXISTS "PracticeAttempt_practiceTestId_fkey";
ALTER TABLE "PracticeQuestion" DROP CONSTRAINT IF EXISTS "PracticeQuestion_subjectId_fkey";
ALTER TABLE "PracticeQuestion" DROP CONSTRAINT IF EXISTS "PracticeQuestion_catalogSkillId_fkey";

DROP TABLE IF EXISTS "PracticeTest";
DROP TABLE IF EXISTS "QuestionBookmark";
DROP TABLE IF EXISTS "QuestionSeen";
DROP TABLE IF EXISTS "QuestionExam";
DROP TABLE IF EXISTS "CatalogSkill";
DROP TABLE IF EXISTS "CatalogExamSubject";
DROP TABLE IF EXISTS "CatalogSubject";
DROP TABLE IF EXISTS "CatalogExam";
DROP TABLE IF EXISTS "CatalogCategory";

DROP INDEX IF EXISTS "PracticeAttempt_practiceTestId_idx";
DROP INDEX IF EXISTS "PracticeQuestion_subjectId_difficulty_isActive_idx";
DROP INDEX IF EXISTS "PracticeQuestion_catalogSkillId_difficulty_isActive_idx";
ALTER TABLE "PracticeAttempt" DROP COLUMN IF EXISTS "practiceTestId";
ALTER TABLE "PracticeQuestion" DROP COLUMN IF EXISTS "archivedAt",
  DROP COLUMN IF EXISTS "catalogSkillId",
  DROP COLUMN IF EXISTS "subjectId",
  DROP COLUMN IF EXISTS "tags";
