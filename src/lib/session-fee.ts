// Session fee vouchers: one voucher per student per session for students on
// the "per session" fee plan (feePlan = "SESSION").
//
// - Stored as month 13 of the session's start year (unique per student/session).
// - Payable from the start of the session; due date = last day of the session
//   (shown as "Due up to Mar 2027"), so it isn't overdue during the year.
// - Parents can pay in advance, in parts, or at the end. Anything unpaid stays on
//   the voucher and shows as arrears on the next session's voucher.

import { FeeStatus, FeeType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getNextSequenceValue } from "./sequences";
import { round2, SESSION_FEE_MONTH, sessionYearsLabel } from "./fee-utils";

export interface SessionFeeResult {
  studentId: string;
  status: "created" | "exists" | "no_fee" | "not_session_plan" | "not_found";
  voucherId?: string;
  voucherNo?: string;
  amount?: number;
}

type Tx = Prisma.TransactionClient;

/**
 * Creates the session fee voucher for one student (inside an existing
 * transaction when `tx` is given). `amount` overrides the student's sessionFee.
 */
export async function createSessionFeeVoucher(params: {
  studentId: string;
  academicYear: { id: string; name: string; startDate: Date; endDate: Date };
  createdById: string;
  amount?: number;
  /** Create even if the student is on the monthly plan (explicit single-student action) */
  force?: boolean;
  tx?: Tx;
}): Promise<SessionFeeResult> {
  const db = params.tx ?? prisma;
  const { studentId, academicYear } = params;
  const startYear = new Date(academicYear.startDate).getFullYear();

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { id: true, feePlan: true, sessionFee: true },
  });
  if (!student) return { studentId, status: "not_found" };
  if (student.feePlan !== "SESSION" && !params.force) return { studentId, status: "not_session_plan" };

  const existing = await db.feeVoucher.findFirst({
    where: { studentId, month: SESSION_FEE_MONTH, year: startYear },
    select: { id: true, voucherNo: true, totalAmount: true },
  });
  if (existing) {
    return { studentId, status: "exists", voucherId: existing.id, voucherNo: existing.voucherNo, amount: existing.totalAmount };
  }

  const amount = round2(params.amount ?? student.sessionFee ?? 0);
  if (!(amount > 0)) return { studentId, status: "no_fee" };

  const voucherNo = await getNextSequenceValue("VOUCHER");
  const years = sessionYearsLabel(startYear);
  const voucher = await db.feeVoucher.create({
    data: {
      voucherNo,
      studentId,
      month: SESSION_FEE_MONTH,
      year: startYear,
      isSessionFee: true,
      academicYearId: academicYear.id,
      // Payable from the start of the session (or today if created later)
      issueDate: new Date(Math.max(Date.now(), new Date(academicYear.startDate).getTime())),
      dueDate: new Date(academicYear.endDate),
      subtotal: amount,
      totalAmount: amount,
      balanceDue: amount,
      paidAmount: 0,
      status: FeeStatus.UNPAID,
      remarks: `Session fee for ${academicYear.name}`,
      createdById: params.createdById,
      feeItems: {
        create: [
          {
            feeType: FeeType.OTHER,
            description: `Session Fee ${years} (whole session)`,
            amount,
          },
        ],
      },
    },
    select: { id: true, voucherNo: true },
  });

  return { studentId, status: "created", voucherId: voucher.id, voucherNo: voucher.voucherNo, amount };
}

/** Session to use: the given one, or the active session. */
export async function resolveSession(academicYearId?: string | null) {
  return academicYearId
    ? prisma.academicYear.findUnique({ where: { id: academicYearId } })
    : prisma.academicYear.findFirst({ where: { isCurrent: true } });
}
