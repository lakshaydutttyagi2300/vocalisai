-- AlterTable
ALTER TABLE "PracticeAttempt" ADD COLUMN     "level" INTEGER,
ADD COLUMN     "skillId" TEXT;

-- AlterTable
ALTER TABLE "PracticeQuestion" ADD COLUMN     "bankStatus" TEXT,
ADD COLUMN     "distractorReasons" TEXT,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "hint" TEXT,
ADD COLUMN     "level" INTEGER,
ADD COLUMN     "rubricId" TEXT,
ADD COLUMN     "skillId" TEXT,
ADD COLUMN     "skillPrecision" TEXT,
ADD COLUMN     "skillSource" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "goalTrackId" TEXT;

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "parentId" TEXT,
    "categoryCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "maxPoints" INTEGER NOT NULL DEFAULT 100,
    "dimensionsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkillMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "band" TEXT NOT NULL DEFAULT 'UNRATED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "levelsSeen" TEXT NOT NULL DEFAULT '[]',
    "lastAttemptAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSkillMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalTrack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalTrackSkill" (
    "goalTrackId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "GoalTrackSkill_pkey" PRIMARY KEY ("goalTrackId","skillId")
);

-- CreateTable
CREATE TABLE "ExamBlueprint" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL,
    "goalTrackId" TEXT,
    "mockTestTemplateId" TEXT,
    "sectionsJson" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Skill_parentId_idx" ON "Skill"("parentId");

-- CreateIndex
CREATE INDEX "Skill_categoryCode_depth_idx" ON "Skill"("categoryCode", "depth");

-- CreateIndex
CREATE UNIQUE INDEX "Rubric_key_key" ON "Rubric"("key");

-- CreateIndex
CREATE INDEX "UserSkillMastery_userId_band_idx" ON "UserSkillMastery"("userId", "band");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillMastery_userId_skillId_key" ON "UserSkillMastery"("userId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalTrack_slug_key" ON "GoalTrack"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ExamBlueprint_slug_key" ON "ExamBlueprint"("slug");

-- CreateIndex
CREATE INDEX "PracticeAttempt_userId_skillId_idx" ON "PracticeAttempt"("userId", "skillId");

-- CreateIndex
CREATE INDEX "PracticeQuestion_skillId_level_idx" ON "PracticeQuestion"("skillId", "level");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkillMastery" ADD CONSTRAINT "UserSkillMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkillMastery" ADD CONSTRAINT "UserSkillMastery_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalTrackSkill" ADD CONSTRAINT "GoalTrackSkill_goalTrackId_fkey" FOREIGN KEY ("goalTrackId") REFERENCES "GoalTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalTrackSkill" ADD CONSTRAINT "GoalTrackSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamBlueprint" ADD CONSTRAINT "ExamBlueprint_goalTrackId_fkey" FOREIGN KEY ("goalTrackId") REFERENCES "GoalTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_goalTrackId_fkey" FOREIGN KEY ("goalTrackId") REFERENCES "GoalTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
