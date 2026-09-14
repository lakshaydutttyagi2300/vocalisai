-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "questionId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "overallAnalysisJson" TEXT,
    CONSTRAINT "ConversationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationSession_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationTurn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "recordingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConversationSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationTurn_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "PracticeRecording" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ConversationSession_userId_startedAt_idx" ON "ConversationSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ConversationTurn_sessionId_turnIndex_idx" ON "ConversationTurn"("sessionId", "turnIndex");
