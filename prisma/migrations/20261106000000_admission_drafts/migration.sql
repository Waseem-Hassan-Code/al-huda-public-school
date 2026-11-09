-- AlterTable: date of birth and gender are optional on admission
ALTER TABLE "students" ALTER COLUMN "dateOfBirth" DROP NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL;

-- CreateTable
CREATE TABLE "admission_drafts" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "studentName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admission_drafts_createdById_idx" ON "admission_drafts"("createdById");

-- AddForeignKey
ALTER TABLE "admission_drafts" ADD CONSTRAINT "admission_drafts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
