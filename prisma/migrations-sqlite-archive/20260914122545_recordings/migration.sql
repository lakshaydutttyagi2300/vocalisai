-- CreateTable
CREATE TABLE "PracticeRecording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeRecording_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PracticeAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "responseText" TEXT,
    "recordingId" TEXT,
    "isCorrect" BOOLEAN,
    "score" INTEGER,
    "timeTakenSeconds" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PracticeAttempt_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "PracticeRecording" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PracticeAttempt" ("category", "createdAt", "difficulty", "id", "isCorrect", "questionId", "responseText", "score", "timeTakenSeconds", "userId") SELECT "category", "createdAt", "difficulty", "id", "isCorrect", "questionId", "responseText", "score", "timeTakenSeconds", "userId" FROM "PracticeAttempt";
DROP TABLE "PracticeAttempt";
ALTER TABLE "new_PracticeAttempt" RENAME TO "PracticeAttempt";
CREATE INDEX "PracticeAttempt_userId_createdAt_idx" ON "PracticeAttempt"("userId", "createdAt");
CREATE INDEX "PracticeAttempt_userId_category_idx" ON "PracticeAttempt"("userId", "category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PracticeRecording_userId_idx" ON "PracticeRecording"("userId");
