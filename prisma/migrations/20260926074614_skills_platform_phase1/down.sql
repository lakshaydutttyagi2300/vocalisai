-- Reverses 20260926074614_skills_platform_phase1 exactly (Prisma has no
-- built-in down migrations). Removes ONLY what that migration added: the
-- six new tables and the new nullable columns. No pre-existing table,
-- column or row is touched. Run manually, then delete this migration's row
-- from "_prisma_migrations":
--   psql "$DATABASE_URL" -f down.sql
--   DELETE FROM "_prisma_migrations" WHERE migration_name = '20260926074614_skills_platform_phase1';

BEGIN;

ALTER TABLE "PracticeAttempt" DROP CONSTRAINT IF EXISTS "PracticeAttempt_skillId_fkey";
ALTER TABLE "PracticeQuestion" DROP CONSTRAINT IF EXISTS "PracticeQuestion_rubricId_fkey";
ALTER TABLE "PracticeQuestion" DROP CONSTRAINT IF EXISTS "PracticeQuestion_skillId_fkey";
ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_goalTrackId_fkey";

DROP INDEX IF EXISTS "PracticeQuestion_skillId_level_idx";
DROP INDEX IF EXISTS "PracticeAttempt_userId_skillId_idx";

ALTER TABLE "PracticeQuestion"
  DROP COLUMN IF EXISTS "skillId",
  DROP COLUMN IF EXISTS "skillPrecision",
  DROP COLUMN IF EXISTS "skillSource",
  DROP COLUMN IF EXISTS "level",
  DROP COLUMN IF EXISTS "format",
  DROP COLUMN IF EXISTS "distractorReasons",
  DROP COLUMN IF EXISTS "hint",
  DROP COLUMN IF EXISTS "rubricId",
  DROP COLUMN IF EXISTS "bankStatus";
ALTER TABLE "PracticeAttempt" DROP COLUMN IF EXISTS "skillId", DROP COLUMN IF EXISTS "level";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "goalTrackId";

DROP TABLE IF EXISTS "ExamBlueprint";
DROP TABLE IF EXISTS "GoalTrackSkill";
DROP TABLE IF EXISTS "GoalTrack";
DROP TABLE IF EXISTS "UserSkillMastery";
DROP TABLE IF EXISTS "Rubric";
DROP TABLE IF EXISTS "Skill";

COMMIT;
