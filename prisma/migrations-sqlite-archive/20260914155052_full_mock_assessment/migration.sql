-- CreateTable
CREATE TABLE "MockTestTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MockTestTemplateSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    CONSTRAINT "MockTestTemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MockTestTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MockTestSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "MockTestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MockTestSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MockTestTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MockTestSession" ("endedAt", "id", "startedAt", "userId") SELECT "endedAt", "id", "startedAt", "userId" FROM "MockTestSession";
DROP TABLE "MockTestSession";
ALTER TABLE "new_MockTestSession" RENAME TO "MockTestSession";
CREATE INDEX "MockTestSession_userId_startedAt_idx" ON "MockTestSession"("userId", "startedAt");
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
    "mockTestSessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PracticeAttempt_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "PracticeRecording" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PracticeAttempt_mockTestSessionId_fkey" FOREIGN KEY ("mockTestSessionId") REFERENCES "MockTestSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PracticeAttempt" ("category", "createdAt", "difficulty", "id", "isCorrect", "questionId", "recordingId", "responseText", "score", "timeTakenSeconds", "userId") SELECT "category", "createdAt", "difficulty", "id", "isCorrect", "questionId", "recordingId", "responseText", "score", "timeTakenSeconds", "userId" FROM "PracticeAttempt";
DROP TABLE "PracticeAttempt";
ALTER TABLE "new_PracticeAttempt" RENAME TO "PracticeAttempt";
CREATE INDEX "PracticeAttempt_userId_createdAt_idx" ON "PracticeAttempt"("userId", "createdAt");
CREATE INDEX "PracticeAttempt_userId_category_idx" ON "PracticeAttempt"("userId", "category");
CREATE INDEX "PracticeAttempt_mockTestSessionId_idx" ON "PracticeAttempt"("mockTestSessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MockTestTemplateSection_templateId_order_idx" ON "MockTestTemplateSection"("templateId", "order");
