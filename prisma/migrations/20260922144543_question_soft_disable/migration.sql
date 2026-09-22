-- AlterTable
ALTER TABLE "PracticeQuestion" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "PracticeQuestion_category_difficulty_isActive_idx" ON "PracticeQuestion"("category", "difficulty", "isActive");
