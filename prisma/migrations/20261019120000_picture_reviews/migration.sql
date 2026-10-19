-- Additive: one new table for AI-marked picture descriptions. Reverse with: DROP TABLE "PictureReview";
CREATE TABLE "PictureReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "attemptKey" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "timedOut" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL,
    "feedbackJson" TEXT NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PictureReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PictureReview_userId_attemptKey_key" ON "PictureReview"("userId", "attemptKey");

CREATE INDEX "PictureReview_userId_createdAt_idx" ON "PictureReview"("userId", "createdAt");

ALTER TABLE "PictureReview" ADD CONSTRAINT "PictureReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
