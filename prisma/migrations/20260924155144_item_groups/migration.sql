-- AlterTable
ALTER TABLE "PracticeQuestion" ADD COLUMN     "itemGroupId" TEXT,
ADD COLUMN     "orderInGroup" INTEGER;

-- CreateTable
CREATE TABLE "ItemGroup" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT,
    "assetKey" TEXT,
    "transcript" TEXT,
    "metadataJson" TEXT,
    "playLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemGroup_type_idx" ON "ItemGroup"("type");

-- CreateIndex
CREATE INDEX "PracticeQuestion_itemGroupId_orderInGroup_idx" ON "PracticeQuestion"("itemGroupId", "orderInGroup");

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_itemGroupId_fkey" FOREIGN KEY ("itemGroupId") REFERENCES "ItemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
