-- Additive: an optional sub-heading for exams within a category, and an
-- optional per-exam section name for each linked subject. Reverse with down.sql.

ALTER TABLE "CatalogExam" ADD COLUMN "groupName" TEXT;

ALTER TABLE "CatalogExamSubject" ADD COLUMN "sectionName" TEXT;
