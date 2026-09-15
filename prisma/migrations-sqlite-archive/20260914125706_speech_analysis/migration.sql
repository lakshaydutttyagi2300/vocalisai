-- CreateTable
CREATE TABLE "SpeechAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "durationSeconds" REAL NOT NULL,
    "wpm" REAL NOT NULL,
    "paceClassification" TEXT NOT NULL,
    "fillerCount" INTEGER NOT NULL,
    "fillerBreakdown" TEXT NOT NULL,
    "repetitionCount" INTEGER NOT NULL,
    "repetitionExamples" TEXT NOT NULL,
    "longPauses" TEXT NOT NULL,
    "aiAnalysisJson" TEXT NOT NULL,
    "transcriptionProvider" TEXT NOT NULL,
    "transcriptionModel" TEXT NOT NULL,
    "analysisProvider" TEXT NOT NULL,
    "analysisModel" TEXT NOT NULL,
    "estimatedCostUsd" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpeechAnalysis_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SpeechAnalysis_attemptId_key" ON "SpeechAnalysis"("attemptId");
