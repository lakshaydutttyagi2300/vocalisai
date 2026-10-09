-- Additive: one new table for AI-marked email replies. Reverse with: DROP TABLE "EmailReview";
CREATE TABLE "EmailReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "feedbackJson" TEXT NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailReview_userId_createdAt_idx" ON "EmailReview"("userId", "createdAt");

ALTER TABLE "EmailReview" ADD CONSTRAINT "EmailReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
