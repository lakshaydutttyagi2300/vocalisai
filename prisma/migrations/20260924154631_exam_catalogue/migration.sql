-- AlterTable
ALTER TABLE "MockTestTemplate" ADD COLUMN     "examVariantId" TEXT;

-- AlterTable
ALTER TABLE "MockTestTemplateSection" ADD COLUMN     "examPartId" TEXT;

-- CreateTable
CREATE TABLE "ExamFamily" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamVariant" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scoreScale" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamPaper" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "instructions" TEXT,
    "navigationMode" TEXT NOT NULL DEFAULT 'LOCKED_SEQUENTIAL',
    "allowReview" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExamPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamPart" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "prepSeconds" INTEGER,
    "responseSeconds" INTEGER,

    CONSTRAINT "ExamPart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamFamily_slug_key" ON "ExamFamily"("slug");

-- CreateIndex
CREATE INDEX "ExamFamily_isActive_idx" ON "ExamFamily"("isActive");

-- CreateIndex
CREATE INDEX "ExamVariant_isActive_idx" ON "ExamVariant"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ExamVariant_familyId_slug_key" ON "ExamVariant"("familyId", "slug");

-- CreateIndex
CREATE INDEX "ExamPaper_variantId_order_idx" ON "ExamPaper"("variantId", "order");

-- CreateIndex
CREATE INDEX "ExamPart_paperId_order_idx" ON "ExamPart"("paperId", "order");

-- AddForeignKey
ALTER TABLE "MockTestTemplate" ADD CONSTRAINT "MockTestTemplate_examVariantId_fkey" FOREIGN KEY ("examVariantId") REFERENCES "ExamVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestTemplateSection" ADD CONSTRAINT "MockTestTemplateSection_examPartId_fkey" FOREIGN KEY ("examPartId") REFERENCES "ExamPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamVariant" ADD CONSTRAINT "ExamVariant_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ExamFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPaper" ADD CONSTRAINT "ExamPaper_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExamVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPart" ADD CONSTRAINT "ExamPart_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
