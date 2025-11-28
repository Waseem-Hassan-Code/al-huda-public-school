import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import { getNextSequenceValue } from "@/lib/sequences";

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
      where.voucher = { studentId };
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
                  studentId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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

// POST - Record a fee payment (supports partial payments)
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

    // Get the voucher
    const voucher = await prisma.feeVoucher.findUnique({
      where: { id: voucherId },
      include: { student: true },
    });

    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // Check if payment amount is valid
    const remainingAmount = voucher.totalAmount - voucher.paidAmount;
    if (amount > remainingAmount) {
      return NextResponse.json(
        {
          error: `Payment amount (${amount}) exceeds remaining balance (${remainingAmount})`,
        },
        { status: 400 }
      );
    }

    // Generate receipt number
    const receiptNumber = await getNextSequenceValue("RECEIPT");

    // Create payment and update voucher in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create payment record
      const payment = await tx.feePayment.create({
        data: {
          receiptNumber,
          voucherId,
          amount,
          paymentMethod: paymentMethod || "CASH",
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes,
          bankName,
          transactionId,
          chequeNumber,
          receivedById: session.user.id,
        },
      });

      // Update voucher
      const newPaidAmount = voucher.paidAmount + amount;
      const newStatus =
        newPaidAmount >= voucher.totalAmount ? "PAID" : "PARTIAL";

      await tx.feeVoucher.update({
        where: { id: voucherId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          paidDate: newStatus === "PAID" ? new Date() : null,
        },
      });

      return payment;
    });

    // Log transaction
    await logTransaction({
      action: "CREATE",
      entityType: "FeePayment",
      entityId: result.id,
      userId: session.user.id,
      details: {
        receiptNumber,
        amount,
        voucherId,
        studentId: voucher.studentId,
      },
    });

    return NextResponse.json(
      {
        ...result,
        message: `Payment of ${amount} recorded successfully. Receipt: ${receiptNumber}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fee Payments POST Error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
