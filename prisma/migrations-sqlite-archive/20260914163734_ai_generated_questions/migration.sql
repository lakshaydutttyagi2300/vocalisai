-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PracticeQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "passage" TEXT,
    "options" TEXT,
    "correctAnswer" TEXT,
    "expectedAnswer" TEXT,
    "explanation" TEXT,
    "timeLimitSeconds" INTEGER NOT NULL,
    "scoringCriteria" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SEEDED',
    "estimatedCostUsd" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PracticeQuestion" ("category", "correctAnswer", "createdAt", "difficulty", "expectedAnswer", "explanation", "id", "options", "passage", "prompt", "scoringCriteria", "timeLimitSeconds", "type") SELECT "category", "correctAnswer", "createdAt", "difficulty", "expectedAnswer", "explanation", "id", "options", "passage", "prompt", "scoringCriteria", "timeLimitSeconds", "type" FROM "PracticeQuestion";
DROP TABLE "PracticeQuestion";
ALTER TABLE "new_PracticeQuestion" RENAME TO "PracticeQuestion";
CREATE INDEX "PracticeQuestion_category_difficulty_idx" ON "PracticeQuestion"("category", "difficulty");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
