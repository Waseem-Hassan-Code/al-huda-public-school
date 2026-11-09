import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { getStudentOutstandingBalance } from "@/lib/fee-payment";
import { periodLabel, round2 } from "@/lib/fee-utils";

// GET - Everything paid in one counter transaction (one printed receipt).
// Accepts the primary receipt number or any of its per-voucher receipt numbers.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ receiptNo: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, Permission.VIEW_FEES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { receiptNo } = await params;
  const number = decodeURIComponent(receiptNo);

  try {
    const anyPayment = await prisma.payment.findFirst({
      where: { OR: [{ receiptNo: number }, { receiptGroup: number }] },
      select: { receiptNo: true, receiptGroup: true },
    });
    if (!anyPayment) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    const group = anyPayment.receiptGroup ?? anyPayment.receiptNo;
    const payments = await prisma.payment.findMany({
      where: anyPayment.receiptGroup ? { receiptGroup: group } : { receiptNo: group },
      orderBy: { receiptNo: "asc" },
      include: {
        voucher: {
          select: {
            id: true,
            voucherNo: true,
            month: true,
            year: true,
            isOpeningBalance: true,
            balanceDue: true,
            status: true,
          },
        },
        createdBy: { select: { name: true } },
        student: {
          select: {
            id: true,
            registrationNo: true,
            firstName: true,
            lastName: true,
            fatherName: true,
            guardianName: true,
            guardianPhone: true,
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    });

    const first = payments[0];
    return NextResponse.json({
      receiptNo: group,
      paymentDate: first.paymentDate,
      paymentMethod: first.paymentMethod,
      reference: first.reference,
      remarks: first.remarks,
      receivedBy: first.createdBy?.name ?? null,
      student: first.student,
      lines: payments.map((p) => ({
        receiptNo: p.receiptNo,
        voucherId: p.voucher.id,
        voucherNo: p.voucher.voucherNo,
        period: periodLabel(p.voucher),
        amount: round2(p.amount),
        voucherBalanceNow: round2(p.voucher.balanceDue),
      })),
      total: round2(payments.reduce((s, p) => s + p.amount, 0)),
      // Current outstanding (may include charges added after this receipt)
      outstandingNow: await getStudentOutstandingBalance(first.studentId),
    });
  } catch (error) {
    console.error("Receipt GET Error:", error);
    return NextResponse.json({ error: "Failed to load receipt" }, { status: 500 });
  }
}
