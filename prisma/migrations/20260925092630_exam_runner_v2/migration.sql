-- CreateTable
CREATE TABLE "ExamSessionState" (
    "id" TEXT NOT NULL,
    "mockTestSessionId" TEXT NOT NULL,
    "planJson" TEXT NOT NULL,
    "currentPaperIndex" INTEGER NOT NULL DEFAULT 0,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "examStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "examDeadline" TIMESTAMP(3) NOT NULL,
    "paperStartedAt" TIMESTAMP(3) NOT NULL,
    "paperDeadline" TIMESTAMP(3) NOT NULL,
    "audioPlaysJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSessionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemResponse" (
    "id" TEXT NOT NULL,
    "mockTestSessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "paperIndex" INTEGER NOT NULL,
    "answerJson" TEXT,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "isCorrect" BOOLEAN,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamSessionState_mockTestSessionId_key" ON "ExamSessionState"("mockTestSessionId");

-- CreateIndex
CREATE INDEX "ItemResponse_mockTestSessionId_paperIndex_idx" ON "ItemResponse"("mockTestSessionId", "paperIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ItemResponse_mockTestSessionId_questionId_key" ON "ItemResponse"("mockTestSessionId", "questionId");

-- AddForeignKey
ALTER TABLE "ExamSessionState" ADD CONSTRAINT "ExamSessionState_mockTestSessionId_fkey" FOREIGN KEY ("mockTestSessionId") REFERENCES "MockTestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemResponse" ADD CONSTRAINT "ItemResponse_mockTestSessionId_fkey" FOREIGN KEY ("mockTestSessionId") REFERENCES "MockTestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemResponse" ADD CONSTRAINT "ItemResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
