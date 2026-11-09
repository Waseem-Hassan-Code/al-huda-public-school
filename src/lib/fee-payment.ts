import { prisma } from "./prisma";
import { getNextSequenceValue } from "./sequences";
import { PaymentMethod, Prisma } from "@prisma/client";
import { OUTSTANDING_STATUSES, periodLabel, round2 } from "./fee-utils";

export interface FIFOAllocation {
  voucherId: string;
  voucherNo: string;
  month: number;
  year: number;
  isOpeningBalance: boolean;
  period: string;
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
  outstandingAfter: number;
}

// Oldest dues first: opening balance → oldest month → newest month
export const FIFO_ORDER: Prisma.FeeVoucherOrderByWithRelationInput[] = [
  { isOpeningBalance: "desc" },
  { year: "asc" },
  { month: "asc" },
];

const outstandingWhere = (studentId: string): Prisma.FeeVoucherWhereInput => ({
  studentId,
  status: { in: [...OUTSTANDING_STATUSES] },
  balanceDue: { gt: 0 },
});

/**
 * FIFO payment allocation: applies a payment to the student's oldest unpaid
 * obligations first (opening balance → oldest month → newest month).
 *
 * Each voucher portion that receives money gets its own Payment record and
 * receipt number so the audit trail is per-voucher. All payments from one
 * counter transaction share `receiptGroup` (= the primary receipt number), so
 * one printed receipt can list everything that was paid.
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
  const { studentId, paymentMethod, paymentDate, reference, remarks, createdById } = params;
  const amount = round2(params.amount);

  if (!(amount > 0)) {
    throw new Error("Payment amount must be greater than zero");
  }

  // Pre-query to size how many receipt numbers we need
  const pendingVouchers = await prisma.feeVoucher.findMany({
    where: outstandingWhere(studentId),
    orderBy: FIFO_ORDER,
    select: { id: true, balanceDue: true },
  });

  if (pendingVouchers.length === 0) {
    throw new Error("This student has no outstanding dues");
  }

  const totalOutstanding = round2(pendingVouchers.reduce((s, v) => s + v.balanceDue, 0));
  if (amount > totalOutstanding) {
    throw new Error(
      `Amount (Rs. ${amount.toLocaleString()}) is more than the total outstanding (Rs. ${totalOutstanding.toLocaleString()})`
    );
  }

  // Pre-generate receipt numbers (one per voucher that will receive money).
  // Done outside the transaction so gaps on rollback are acceptable.
  let remaining = amount;
  let vouchersToFund = 0;
  for (const v of pendingVouchers) {
    if (remaining <= 0) break;
    remaining = round2(remaining - Math.min(remaining, v.balanceDue));
    vouchersToFund++;
  }
  const receiptNos: string[] = [];
  for (let i = 0; i < vouchersToFund; i++) {
    // Sequential so numbers come out in order on the receipt
    receiptNos.push(await getNextSequenceValue("RECEIPT"));
  }
  const primaryReceiptNo = receiptNos[0];

  // Execute all DB writes atomically
  const allocations = await prisma.$transaction(async (tx) => {
    // Re-query inside the transaction for fresh balanceDue values
    const freshVouchers = await tx.feeVoucher.findMany({
      where: outstandingWhere(studentId),
      orderBy: FIFO_ORDER,
    });

    let txRemaining = amount;
    const result: FIFOAllocation[] = [];
    let receiptIdx = 0;

    for (const voucher of freshVouchers) {
      if (txRemaining <= 0) break;

      const toApply = round2(Math.min(txRemaining, voucher.balanceDue));
      const newPaidAmount = round2(voucher.paidAmount + toApply);
      const newBalanceDue = round2(Math.max(0, voucher.balanceDue - toApply));
      const newStatus = newBalanceDue <= 0 ? "PAID" : "PARTIAL";
      // If the fresh state needs more receipts than pre-generated, make one now
      const receiptNo = receiptNos[receiptIdx++] ?? (await getNextSequenceValue("RECEIPT"));

      await tx.payment.create({
        data: {
          receiptNo,
          receiptGroup: primaryReceiptNo,
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
        period: periodLabel(voucher),
        appliedAmount: toApply,
        newPaidAmount,
        newBalanceDue,
        newStatus,
        receiptNo,
      });

      txRemaining = round2(txRemaining - toApply);
    }

    return result;
  });

  const totalApplied = round2(allocations.reduce((s, a) => s + a.appliedAmount, 0));

  return {
    allocations,
    totalApplied,
    remainingUnallocated: round2(Math.max(0, amount - totalApplied)),
    primaryReceiptNo,
    outstandingAfter: await getStudentOutstandingBalance(studentId),
  };
}

/**
 * Returns the total outstanding balance across all unpaid vouchers for a student.
 */
export async function getStudentOutstandingBalance(studentId: string): Promise<number> {
  const agg = await prisma.feeVoucher.aggregate({
    where: outstandingWhere(studentId),
    _sum: { balanceDue: true },
  });
  return round2(agg._sum.balanceDue ?? 0);
}

/**
 * Outstanding vouchers for a student in the order a payment will clear them.
 */
export async function getStudentDues(studentId: string) {
  const vouchers = await prisma.feeVoucher.findMany({
    where: outstandingWhere(studentId),
    orderBy: FIFO_ORDER,
    select: {
      id: true,
      voucherNo: true,
      month: true,
      year: true,
      isOpeningBalance: true,
      subtotal: true,
      lateFee: true,
      discount: true,
      totalAmount: true,
      paidAmount: true,
      balanceDue: true,
      status: true,
      dueDate: true,
    },
  });
  return {
    vouchers: vouchers.map((v) => ({ ...v, period: periodLabel(v) })),
    totalOutstanding: round2(vouchers.reduce((s, v) => s + v.balanceDue, 0)),
  };
}

/**
 * Arrears for a voucher: what the student still owes on OLDER vouchers
 * (opening balance and earlier months). Shown as one line on the voucher and
 * added to the "total payable". Computed live, so it's always current.
 */
export async function getVoucherArrears(voucher: {
  id: string;
  studentId: string;
  month: number;
  year: number;
  isOpeningBalance: boolean;
}) {
  // The opening balance is the oldest due, so nothing comes before it
  if (voucher.isOpeningBalance) return { total: 0, items: [] as ArrearsItem[] };

  const older = await prisma.feeVoucher.findMany({
    where: {
      ...outstandingWhere(voucher.studentId),
      id: { not: voucher.id },
      OR: [
        { isOpeningBalance: true },
        { year: { lt: voucher.year } },
        { year: voucher.year, month: { lt: voucher.month } },
      ],
    },
    orderBy: FIFO_ORDER,
    select: { id: true, voucherNo: true, month: true, year: true, isOpeningBalance: true, balanceDue: true },
  });

  const items: ArrearsItem[] = older.map((v) => ({
    voucherId: v.id,
    voucherNo: v.voucherNo,
    period: periodLabel(v),
    balanceDue: round2(v.balanceDue),
  }));
  return { total: round2(items.reduce((s, i) => s + i.balanceDue, 0)), items };
}

export interface ArrearsItem {
  voucherId: string;
  voucherNo: string;
  period: string;
  balanceDue: number;
}
