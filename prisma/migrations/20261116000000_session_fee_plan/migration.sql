-- Session fee plan (additive only: new columns with defaults, existing rows unchanged)

-- AlterTable: every existing student stays on the monthly plan
ALTER TABLE "students" ADD COLUMN "feePlan" TEXT NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN "sessionFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable: existing vouchers are not session fees and have no session link
ALTER TABLE "fee_vouchers" ADD COLUMN "isSessionFee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "academicYearId" TEXT;

-- CreateIndex
CREATE INDEX "fee_vouchers_academicYearId_idx" ON "fee_vouchers"("academicYearId");

-- AddForeignKey
ALTER TABLE "fee_vouchers" ADD CONSTRAINT "fee_vouchers_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
