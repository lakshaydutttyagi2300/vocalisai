-- CreateTable
CREATE TABLE "ScoreReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mockTestSessionId" TEXT NOT NULL,
    "overallScore" INTEGER,
    "categoryScoresJson" TEXT NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreReport_mockTestSessionId_fkey" FOREIGN KEY ("mockTestSessionId") REFERENCES "MockTestSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoreReport_mockTestSessionId_key" ON "ScoreReport"("mockTestSessionId");
