-- Additive only: new catalogue, tracking and bookmark tables, and new
-- nullable/defaulted columns on PracticeQuestion and PracticeAttempt. No
-- existing column or row is changed. Reverse with down.sql in this folder.

-- AlterTable
ALTER TABLE "PracticeAttempt" ADD COLUMN     "practiceTestId" TEXT;

-- AlterTable
ALTER TABLE "PracticeQuestion" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "catalogSkillId" TEXT,
ADD COLUMN     "subjectId" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CatalogCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogExam" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mockMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogSubject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "legacyCategory" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogExamSubject" (
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mockQuestionCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatalogExamSubject_pkey" PRIMARY KEY ("examId","subjectId")
);

-- CreateTable
CREATE TABLE "CatalogSkill" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionExam" (
    "questionId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,

    CONSTRAINT "QuestionExam_pkey" PRIMARY KEY ("questionId","examId")
);

-- CreateTable
CREATE TABLE "QuestionSeen" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "timesSeen" INTEGER NOT NULL DEFAULT 0,
    "timesAttempted" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptedAt" TIMESTAMP(3),
    "lastCorrect" BOOLEAN,

    CONSTRAINT "QuestionSeen_pkey" PRIMARY KEY ("userId","questionId")
);

-- CreateTable
CREATE TABLE "QuestionBookmark" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionBookmark_pkey" PRIMARY KEY ("userId","questionId")
);

-- CreateTable
CREATE TABLE "PracticeTest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT,
    "subjectId" TEXT,
    "catalogSkillId" TEXT,
    "difficulty" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "timed" BOOLEAN NOT NULL DEFAULT false,
    "timeLimitSeconds" INTEGER,
    "questionIds" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "totalCount" INTEGER NOT NULL,
    "answeredCount" INTEGER,
    "correctCount" INTEGER,
    "scorePercent" INTEGER,
    "totalTimeSeconds" INTEGER,

    CONSTRAINT "PracticeTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCategory_slug_key" ON "CatalogCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogExam_slug_key" ON "CatalogExam"("slug");

-- CreateIndex
CREATE INDEX "CatalogExam_categoryId_sortOrder_idx" ON "CatalogExam"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSubject_slug_key" ON "CatalogSubject"("slug");

-- CreateIndex
CREATE INDEX "CatalogExamSubject_subjectId_idx" ON "CatalogExamSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSkill_subjectId_slug_key" ON "CatalogSkill"("subjectId", "slug");

-- CreateIndex
CREATE INDEX "QuestionExam_examId_idx" ON "QuestionExam"("examId");

-- CreateIndex
CREATE INDEX "QuestionSeen_userId_lastSeenAt_idx" ON "QuestionSeen"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "QuestionBookmark_userId_createdAt_idx" ON "QuestionBookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PracticeTest_userId_startedAt_idx" ON "PracticeTest"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "PracticeAttempt_practiceTestId_idx" ON "PracticeAttempt"("practiceTestId");

-- CreateIndex
CREATE INDEX "PracticeQuestion_subjectId_difficulty_isActive_idx" ON "PracticeQuestion"("subjectId", "difficulty", "isActive");

-- CreateIndex
CREATE INDEX "PracticeQuestion_catalogSkillId_difficulty_isActive_idx" ON "PracticeQuestion"("catalogSkillId", "difficulty", "isActive");

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CatalogSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_catalogSkillId_fkey" FOREIGN KEY ("catalogSkillId") REFERENCES "CatalogSkill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_practiceTestId_fkey" FOREIGN KEY ("practiceTestId") REFERENCES "PracticeTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogExam" ADD CONSTRAINT "CatalogExam_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CatalogCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogExamSubject" ADD CONSTRAINT "CatalogExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "CatalogExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogExamSubject" ADD CONSTRAINT "CatalogExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CatalogSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogSkill" ADD CONSTRAINT "CatalogSkill_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CatalogSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionExam" ADD CONSTRAINT "QuestionExam_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionExam" ADD CONSTRAINT "QuestionExam_examId_fkey" FOREIGN KEY ("examId") REFERENCES "CatalogExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSeen" ADD CONSTRAINT "QuestionSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSeen" ADD CONSTRAINT "QuestionSeen_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBookmark" ADD CONSTRAINT "QuestionBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBookmark" ADD CONSTRAINT "QuestionBookmark_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTest" ADD CONSTRAINT "PracticeTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTest" ADD CONSTRAINT "PracticeTest_examId_fkey" FOREIGN KEY ("examId") REFERENCES "CatalogExam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTest" ADD CONSTRAINT "PracticeTest_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CatalogSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTest" ADD CONSTRAINT "PracticeTest_catalogSkillId_fkey" FOREIGN KEY ("catalogSkillId") REFERENCES "CatalogSkill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

