-- Additive: certificates for completed mock exams. A new table only; nothing
-- existing changes. Reverse with down.sql.

CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mockTestSessionId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "design" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Certificate_code_key" ON "Certificate"("code");
CREATE UNIQUE INDEX "Certificate_mockTestSessionId_key" ON "Certificate"("mockTestSessionId");
CREATE INDEX "Certificate_userId_issuedAt_idx" ON "Certificate"("userId", "issuedAt");

ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_mockTestSessionId_fkey" FOREIGN KEY ("mockTestSessionId") REFERENCES "MockTestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
