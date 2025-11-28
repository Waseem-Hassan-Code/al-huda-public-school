import { prisma } from "./prisma";

// Get next sequence value
export async function getNextSequenceValue(
  sequenceId: string,
  prefix?: string
): Promise<string> {
  const sequence = await prisma.sequence.upsert({
    where: { id: sequenceId },
    update: { value: { increment: 1 } },
    create: { id: sequenceId, value: 1, prefix: prefix || "" },
  });

  const year = new Date().getFullYear();
  const paddedValue = String(sequence.value).padStart(4, "0");

  switch (sequenceId) {
    case "student":
      return `AHPS-${year}-${paddedValue}`;
    case "teacher":
      return `AHPS-T-${String(sequence.value).padStart(3, "0")}`;
    case "fee_voucher":
      return `FV-${year}-${String(sequence.value).padStart(5, "0")}`;
    case "payment":
      return `REC-${year}-${String(sequence.value).padStart(5, "0")}`;
    case "complaint":
      return `CMP-${year}-${paddedValue}`;
    case "salary":
      return `SAL-${year}-${String(sequence.value).padStart(3, "0")}`;
    default:
      return `${prefix || "SEQ"}-${paddedValue}`;
  }
}

// Reset sequence (use with caution)
export async function resetSequence(sequenceId: string): Promise<void> {
  await prisma.sequence.update({
    where: { id: sequenceId },
    data: { value: 0 },
  });
}

// Get current sequence value without incrementing
export async function getCurrentSequenceValue(
  sequenceId: string
): Promise<number> {
  const sequence = await prisma.sequence.findUnique({
    where: { id: sequenceId },
  });
  return sequence?.value ?? 0;
}
