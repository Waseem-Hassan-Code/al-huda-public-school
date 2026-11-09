-- AlterTable: group the payments created by one counter transaction under one receipt
ALTER TABLE "payments" ADD COLUMN "receiptGroup" TEXT;

-- Existing payments: each one is its own receipt
UPDATE "payments" SET "receiptGroup" = "receiptNo" WHERE "receiptGroup" IS NULL;

-- CreateIndex
CREATE INDEX "payments_receiptGroup_idx" ON "payments"("receiptGroup");

-- CreateIndex
CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");
