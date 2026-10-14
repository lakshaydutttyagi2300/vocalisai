-- Additive: one new table for support-desk practice shifts. Reverse with: DROP TABLE "DeskShift";
CREATE TABLE "DeskShift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketsJson" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "DeskShift_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeskShift_userId_startedAt_idx" ON "DeskShift"("userId", "startedAt");

ALTER TABLE "DeskShift" ADD CONSTRAINT "DeskShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
