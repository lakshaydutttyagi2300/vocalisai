-- Reverses 20260928120000_email_verification_exam_descriptions exactly
-- (Prisma has no built-in down migrations). Removes ONLY what that
-- migration added. Pending sign-ups waiting for a code are lost (they are
-- not accounts); exam descriptions are lost. Run manually, then delete the
-- migration's row from "_prisma_migrations":
--   psql "$DATABASE_URL" -f down.sql
--   DELETE FROM "_prisma_migrations" WHERE migration_name = '20260928120000_email_verification_exam_descriptions';

BEGIN;
DROP TABLE IF EXISTS "EmailVerification";
ALTER TABLE "ExamVariant" DROP COLUMN IF EXISTS "description";
COMMIT;
