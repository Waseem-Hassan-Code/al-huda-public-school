import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import { processPaymentFIFO } from "@/lib/fee-payment";

// GET - List fee payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_FEES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const voucherId = searchParams.get("voucherId");
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (voucherId) {
      where.voucherId = voucherId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          voucher: {
            include: {
              student: {
                select: {
                  id: true,
                  registrationNo: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fee Payments GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fee payments" },
      { status: 500 }
    );
  }
}

// POST - Record a fee payment using FIFO allocation
//
// Accepts either:
//   { studentId, amount, paymentMethod, paymentDate?, notes?, bankName?, transactionId?, chequeNumber? }
//   { voucherId, amount, ... }  ← voucherId used only to resolve studentId
//
// Payment is ALWAYS allocated oldest-dues-first (opening balance → oldest month → newest).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.RECEIVE_PAYMENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      voucherId,
      amount,
      paymentMethod,
      paymentDate,
      notes,
      bankName,
      transactionId,
      chequeNumber,
    } = body;

    let { studentId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "A valid payment amount is required" },
        { status: 400 }
      );
    }

    // Resolve studentId from voucherId when not supplied directly
    if (!studentId && voucherId) {
      const voucher = await prisma.feeVoucher.findUnique({
        where: { id: voucherId },
        select: { studentId: true },
      });
      if (!voucher) {
        return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
      }
      studentId = voucher.studentId;
    }

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId or voucherId is required" },
        { status: 400 }
      );
    }

    const reference = transactionId || chequeNumber || (bankName ? `Bank: ${bankName}` : null);

    const result = await processPaymentFIFO({
      studentId,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || "CASH",
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      reference,
      remarks: notes ?? null,
      createdById: session.user.id,
    });

    // Audit log for the entire payment event
    await logTransaction({
      action: "PAYMENT_RECEIVED",
      entityType: "PAYMENT",
      entityId: result.primaryReceiptNo,
      userId: session.user.id,
      details: {
        primaryReceiptNo: result.primaryReceiptNo,
        studentId,
        totalAmount: amount,
        totalApplied: result.totalApplied,
        paymentMethod: paymentMethod || "CASH",
        allocations: result.allocations.map((a) => ({
          voucherNo: a.voucherNo,
          month: a.month,
          year: a.year,
          applied: a.appliedAmount,
          remainingBalance: a.newBalanceDue,
          status: a.newStatus,
          receipt: a.receiptNo,
        })),
        reference,
      },
    });

    return NextResponse.json(
      {
        receiptNumber: result.primaryReceiptNo,
        primaryReceiptNo: result.primaryReceiptNo,
        totalApplied: result.totalApplied,
        allocations: result.allocations,
        message: `Payment of ${result.totalApplied} recorded. Receipt: ${result.primaryReceiptNo}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Fee Payments POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record payment" },
      { status: 400 }
    );
  }
}
