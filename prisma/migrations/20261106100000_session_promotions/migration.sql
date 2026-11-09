-- AlterTable: record which session a student came from and what happened at year end
ALTER TABLE "promotion_history" ADD COLUMN "fromAcademicYearId" TEXT,
ADD COLUMN "action" TEXT NOT NULL DEFAULT 'PROMOTED';

-- CreateIndex
CREATE INDEX "promotion_history_fromAcademicYearId_idx" ON "promotion_history"("fromAcademicYearId");
