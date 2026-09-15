-- CreateTable
CREATE TABLE "ResultsReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mockTestSessionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "improvements" TEXT NOT NULL,
    "analysisProvider" TEXT NOT NULL,
    "analysisModel" TEXT NOT NULL,
    "estimatedCostUsd" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResultsReport_mockTestSessionId_fkey" FOREIGN KEY ("mockTestSessionId") REFERENCES "MockTestSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ResultsReport_mockTestSessionId_key" ON "ResultsReport"("mockTestSessionId");
