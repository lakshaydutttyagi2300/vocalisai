-- Additive: one new table for AI-marked support tickets. Reverse with: DROP TABLE "TicketReview";
CREATE TABLE "TicketReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedbackJson" TEXT NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketReview_userId_createdAt_idx" ON "TicketReview"("userId", "createdAt");

ALTER TABLE "TicketReview" ADD CONSTRAINT "TicketReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
