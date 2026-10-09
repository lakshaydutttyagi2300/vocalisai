-- Additive: one new table for live chat simulations. Reverse with: DROP TABLE "ChatSimulation";
CREATE TABLE "ChatSimulation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "turnsJson" TEXT NOT NULL,
    "score" INTEGER,
    "replySeconds" INTEGER,
    "feedbackJson" TEXT,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ChatSimulation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatSimulation_userId_createdAt_idx" ON "ChatSimulation"("userId", "createdAt");

ALTER TABLE "ChatSimulation" ADD CONSTRAINT "ChatSimulation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
