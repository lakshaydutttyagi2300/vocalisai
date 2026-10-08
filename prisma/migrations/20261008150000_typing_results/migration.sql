-- Additive: one new table for typing test results. Reverse with: DROP TABLE "TypingResult";
CREATE TABLE "TypingResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passageKey" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "typedWords" INTEGER NOT NULL,
    "correctWords" INTEGER NOT NULL,
    "grossWpm" INTEGER NOT NULL,
    "netWpm" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TypingResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TypingResult_userId_createdAt_idx" ON "TypingResult"("userId", "createdAt");

ALTER TABLE "TypingResult" ADD CONSTRAINT "TypingResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
