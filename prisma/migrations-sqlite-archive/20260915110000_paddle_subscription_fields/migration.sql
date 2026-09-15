-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "paddleCustomerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "paddleSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_paddleSubscriptionId_key" ON "Subscription"("paddleSubscriptionId");
