-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitHit_key_windowStart_idx" ON "RateLimitHit"("key", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitHit_key_windowStart_key" ON "RateLimitHit"("key", "windowStart");
