-- Additive: five new tables for the Social Autopilot. Reverse with:
-- DROP TABLE "SocialMetric"; DROP TABLE "SocialPost"; DROP TABLE "SocialTask"; DROP TABLE "SocialNote"; DROP TABLE "SocialSetting";
CREATE TABLE "SocialSetting" ("key" TEXT NOT NULL, "value" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SocialSetting_pkey" PRIMARY KEY ("key"));

CREATE TABLE "SocialTask" (
    "id" TEXT NOT NULL, "kind" TEXT NOT NULL, "agent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED', "dedupeKey" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}', "result" TEXT, "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0, "maxAttempts" INTEGER NOT NULL DEFAULT 3, "depth" INTEGER NOT NULL DEFAULT 0,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3), "lockedBy" TEXT, "parentId" TEXT, "postId" TEXT, "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "finishedAt" TIMESTAMP(3),
    CONSTRAINT "SocialTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SocialTask_dedupeKey_key" ON "SocialTask"("dedupeKey");
CREATE INDEX "SocialTask_status_runAfter_idx" ON "SocialTask"("status", "runAfter");
CREATE INDEX "SocialTask_postId_idx" ON "SocialTask"("postId");

CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL, "platform" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'IDEA',
    "format" TEXT NOT NULL, "topic" TEXT NOT NULL,
    "directionJson" TEXT NOT NULL DEFAULT '{}', "contentJson" TEXT NOT NULL DEFAULT '{}',
    "hookText" TEXT NOT NULL DEFAULT '', "fingerprint" TEXT NOT NULL DEFAULT '', "qaJson" TEXT,
    "revisionCount" INTEGER NOT NULL DEFAULT 0, "scheduledFor" TIMESTAMP(3), "publishedAt" TIMESTAMP(3),
    "externalId" TEXT, "externalUrl" TEXT, "clicks" INTEGER NOT NULL DEFAULT 0, "decidedBy" TEXT, "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SocialPost_status_scheduledFor_idx" ON "SocialPost"("status", "scheduledFor");
CREATE INDEX "SocialPost_platform_createdAt_idx" ON "SocialPost"("platform", "createdAt");

CREATE TABLE "SocialMetric" (
    "id" TEXT NOT NULL, "postId" TEXT NOT NULL, "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "likes" INTEGER, "replies" INTEGER, "shares" INTEGER, "saves" INTEGER, "views" INTEGER,
    CONSTRAINT "SocialMetric_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SocialMetric_postId_collectedAt_idx" ON "SocialMetric"("postId", "collectedAt");
ALTER TABLE "SocialMetric" ADD CONSTRAINT "SocialMetric_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SocialNote" (
    "id" TEXT NOT NULL, "kind" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "sourceUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false, "dedupeKey" TEXT, "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SocialNote_dedupeKey_key" ON "SocialNote"("dedupeKey");
CREATE INDEX "SocialNote_kind_createdAt_idx" ON "SocialNote"("kind", "createdAt");
