-- Additive: one answer per question per catalogue practice test. Rows with
-- no practiceTestId (every existing attempt) never clash. Reverse with down.sql.

CREATE UNIQUE INDEX "PracticeAttempt_practiceTestId_questionId_key" ON "PracticeAttempt"("practiceTestId", "questionId");
