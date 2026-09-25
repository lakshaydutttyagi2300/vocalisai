-- AlterTable
ALTER TABLE "PracticeQuestion" ADD COLUMN     "examPartId" TEXT;

-- CreateIndex
CREATE INDEX "PracticeQuestion_examPartId_idx" ON "PracticeQuestion"("examPartId");

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_examPartId_fkey" FOREIGN KEY ("examPartId") REFERENCES "ExamPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
