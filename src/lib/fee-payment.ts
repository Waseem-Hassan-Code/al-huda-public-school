import { prisma } from "./prisma";
import { getNextSequenceValue } from "./sequences";
import { PaymentMethod } from "@prisma/client";

export interface FIFOAllocation {
  voucherId: string;
  voucherNo: string;
  month: number;
  year: number;
  isOpeningBalance: boolean;
  appliedAmount: number;
  newPaidAmount: number;
  newBalanceDue: number;
  newStatus: string;
  receiptNo: string;
}

export interface FIFOPaymentResult {
  allocations: FIFOAllocation[];
  totalApplied: number;
  remainingUnallocated: number;
  primaryReceiptNo: string;
}

/**
 * FIFO payment allocation: applies a payment to the student's oldest unpaid
 * obligations first (opening balance → oldest month → newest month).
 *
 * Each voucher portion that receives money gets its own Payment record and
 * receipt number so the audit trail is per-voucher. All allocations from one
 * payment event share the primaryReceiptNo for display on the paper receipt.
 *
 * Concurrency: pre-generates receipt numbers and re-queries vouchers inside the
 * transaction so allocations are always based on the freshest DB state.
 */
export async function processPaymentFIFO(params: {
  studentId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  reference?: string | null;
  remarks?: string | null;
  createdById: string;
}): Promise<FIFOPaymentResult> {
  const { studentId, amount, paymentMethod, paymentDate, reference, remarks, createdById } = params;

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  // Pre-query to size how many receipt numbers we need
  const pendingVouchers = await prisma.feeVoucher.findMany({
    where: {
      studentId,
      status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
    },
    orderBy: [
      { isOpeningBalance: "desc" },
      { year: "asc" },
      { month: "asc" },
    ],
    select: { id: true, balanceDue: true },
  });

  if (pendingVouchers.length === 0) {
    throw new Error("No outstanding dues found for this student");
  }

  const totalOutstanding = pendingVouchers.reduce((s, v) => s + v.balanceDue, 0);
  if (amount > totalOutstanding + 0.005) {
    throw new Error(
      `Payment amount (${amount}) exceeds total outstanding balance (${totalOutstanding.toFixed(2)})`
    );
  }

  // Pre-generate receipt numbers (one per voucher that will receive money).
  // Done outside the transaction so gaps on rollback are acceptable.
  let remaining = amount;
  const vouchersToFund: { id: string; toApply: number }[] = [];
  for (const v of pendingVouchers) {
    if (remaining <= 0) break;
    const toApply = Math.min(remaining, v.balanceDue);
    vouchersToFund.push({ id: v.id, toApply });
    remaining -= toApply;
  }

  const receiptNos: string[] = await Promise.all(
    vouchersToFund.map(() => getNextSequenceValue("RECEIPT"))
  );
  const primaryReceiptNo = receiptNos[0];

  // Execute all DB writes atomically
  const allocations = await prisma.$transaction(async (tx) => {
    // Re-query inside the transaction for fresh balanceDue values
    const freshVouchers = await tx.feeVoucher.findMany({
      where: {
        studentId,
        status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
      },
      orderBy: [
        { isOpeningBalance: "desc" },
        { year: "asc" },
        { month: "asc" },
      ],
    });

    let txRemaining = amount;
    const result: FIFOAllocation[] = [];
    let receiptIdx = 0;

    for (const voucher of freshVouchers) {
      if (txRemaining <= 0) break;

      const toApply = Math.min(txRemaining, voucher.balanceDue);
      const newPaidAmount = voucher.paidAmount + toApply;
      const newBalanceDue = Math.max(0, voucher.balanceDue - toApply);
      const newStatus = newBalanceDue <= 0 ? "PAID" : "PARTIAL";
      const receiptNo = receiptNos[receiptIdx++] ?? primaryReceiptNo;

      await tx.payment.create({
        data: {
          receiptNo,
          studentId,
          voucherId: voucher.id,
          amount: toApply,
          paymentMethod: (paymentMethod || "CASH") as PaymentMethod,
          paymentDate,
          reference: reference ?? null,
          remarks: remarks ?? null,
          createdById,
        },
      });

      await tx.feeVoucher.update({
        where: { id: voucher.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      result.push({
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        month: voucher.month,
        year: voucher.year,
        isOpeningBalance: voucher.isOpeningBalance,
        appliedAmount: toApply,
        newPaidAmount,
        newBalanceDue,
        newStatus,
        receiptNo,
      });

      txRemaining -= toApply;
    }

    return result;
  });

  const totalApplied = allocations.reduce((s, a) => s + a.appliedAmount, 0);

  return {
    allocations,
    totalApplied,
    remainingUnallocated: Math.max(0, amount - totalApplied),
    primaryReceiptNo,
  };
}

/**
 * Returns the total outstanding balance across all unpaid vouchers for a student.
 */
export async function getStudentOutstandingBalance(studentId: string): Promise<number> {
  const vouchers = await prisma.feeVoucher.findMany({
    where: {
      studentId,
      status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
    },
    select: { balanceDue: true },
  });
  return vouchers.reduce((s, v) => s + v.balanceDue, 0);
}
