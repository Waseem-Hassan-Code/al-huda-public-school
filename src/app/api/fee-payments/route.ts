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

// POST - Record a fee payment (supports partial payments and auto-pays previous vouchers)
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

    // Get the voucher with student details
    const voucher = await prisma.feeVoucher.findUnique({
      where: { id: voucherId },
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
      const payment = await tx.payment.create({
        data: {
          receiptNo: receiptNumber,
          studentId: voucher.studentId,
          voucherId,
          amount,
          paymentMethod: paymentMethod || "CASH",
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          reference: transactionId || chequeNumber || null,
          remarks: notes,
          createdById: session.user.id,
        },
      });

      // Calculate new amounts
      const newPaidAmount = voucher.paidAmount + amount;
      const newBalanceDue = Math.max(0, voucher.totalAmount - newPaidAmount);
      const newStatus =
        newBalanceDue <= 0 ? "PAID" : newPaidAmount > 0 ? "PARTIAL" : "UNPAID";

      // Update current voucher
      await tx.feeVoucher.update({
        where: { id: voucherId },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      // If voucher is fully paid and has previous balance, mark previous vouchers as paid
      if (newStatus === "PAID" && voucher.previousBalance > 0) {
        // Get all unpaid/partial vouchers for this student that are older than current
        const previousUnpaidVouchers = await tx.feeVoucher.findMany({
          where: {
            studentId: voucher.studentId,
            status: { in: ["UNPAID", "PARTIAL"] },
            id: { not: voucherId },
            createdAt: { lt: voucher.createdAt },
          },
          orderBy: { createdAt: "asc" },
        });

        // Mark all previous vouchers as paid (since current voucher included their balance)
        for (const prevVoucher of previousUnpaidVouchers) {
          await tx.feeVoucher.update({
            where: { id: prevVoucher.id },
            data: {
              paidAmount: prevVoucher.totalAmount,
              balanceDue: 0,
              status: "PAID",
            },
          });

          // Log the auto-payment of previous voucher
          await logTransaction({
            action: "PAYMENT_RECEIVED",
            entityType: "FEE",
            entityId: prevVoucher.id,
            userId: session.user.id,
            details: {
              voucherNo: prevVoucher.voucherNo,
              autoPayment: true,
              paidViaVoucher: voucher.voucherNo,
              paidViaReceiptNo: receiptNumber,
              message: `Auto-marked as paid via payment on ${voucher.voucherNo}`,
            },
          });
        }
      }

      return { payment, newStatus, newBalanceDue };
    });

    // Log the main payment transaction
    await logTransaction({
      action: "PAYMENT_RECEIVED",
      entityType: "PAYMENT",
      entityId: result.payment.id,
      userId: session.user.id,
      details: {
        receiptNo: receiptNumber,
        voucherNo: voucher.voucherNo,
        studentId: voucher.studentId,
        studentName: `${voucher.student.firstName} ${voucher.student.lastName}`,
        registrationNo: voucher.student.registrationNo,
        amount,
        paymentMethod: paymentMethod || "CASH",
        previousBalance: voucher.previousBalance,
        newVoucherStatus: result.newStatus,
        remainingBalance: result.newBalanceDue,
        reference: transactionId || chequeNumber || null,
      },
    });

    return NextResponse.json(
      {
        ...result.payment,
        message: `Payment of ${amount} recorded successfully. Receipt: ${receiptNumber}`,
        newStatus: result.newStatus,
        remainingBalance: result.newBalanceDue,
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
