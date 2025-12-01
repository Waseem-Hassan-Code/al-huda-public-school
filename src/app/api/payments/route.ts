import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// GET - List payments with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const studentId = searchParams.get("studentId");
    const voucherId = searchParams.get("voucherId");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (voucherId) {
      where.voucherId = voucherId;
    }

    if (search) {
      where.OR = [
        { receiptNo: { contains: search, mode: "insensitive" } },
        { student: { firstName: { contains: search, mode: "insensitive" } } },
        { student: { lastName: { contains: search, mode: "insensitive" } } },
        {
          student: {
            registrationNo: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              registrationNo: true,
              firstName: true,
              lastName: true,
              class: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
            },
          },
          voucher: {
            select: {
              id: true,
              voucherNo: true,
              month: true,
              year: true,
              totalAmount: true,
              balanceDue: true,
              status: true,
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// Generate unique receipt number
async function generateReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  // Get the last receipt number for this year
  const lastPayment = await prisma.payment.findFirst({
    where: {
      receiptNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptNo: "desc",
    },
  });

  let nextNumber = 1;
  if (lastPayment) {
    const lastNumber = parseInt(lastPayment.receiptNo.split("-").pop() || "0");
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
}

// POST - Receive payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, voucherId, amount, paymentMethod, reference, remarks } =
      body;

    if (!studentId || !voucherId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Student ID, Voucher ID and valid amount are required" },
        { status: 400 }
      );
    }

    // Get the voucher
    const voucher = await prisma.feeVoucher.findUnique({
      where: { id: voucherId },
      include: { student: true },
    });

    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    if (voucher.studentId !== studentId) {
      return NextResponse.json(
        { error: "Voucher does not belong to this student" },
        { status: 400 }
      );
    }

    if (voucher.status === "PAID") {
      return NextResponse.json(
        { error: "Voucher is already fully paid" },
        { status: 400 }
      );
    }

    if (voucher.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot receive payment for cancelled voucher" },
        { status: 400 }
      );
    }

    if (amount > voucher.balanceDue) {
      return NextResponse.json(
        { error: `Amount exceeds balance due (Rs. ${voucher.balanceDue})` },
        { status: 400 }
      );
    }

    // Generate receipt number
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;

    const lastPayment = await prisma.payment.findFirst({
      where: {
        receiptNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        receiptNo: "desc",
      },
    });

    let nextNumber = 1;
    if (lastPayment) {
      const lastNumber = parseInt(
        lastPayment.receiptNo.split("-").pop() || "0"
      );
      nextNumber = lastNumber + 1;
    }

    const receiptNo = `${prefix}${nextNumber.toString().padStart(5, "0")}`;

    // Create payment within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          receiptNo,
          studentId,
          voucherId,
          amount,
          paymentMethod: paymentMethod || "CASH",
          reference,
          remarks,
          createdById: session.user.id,
        },
        include: {
          student: {
            select: {
              id: true,
              registrationNo: true,
              firstName: true,
              lastName: true,
            },
          },
          voucher: {
            select: {
              id: true,
              voucherNo: true,
              month: true,
              year: true,
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Update voucher
      const newPaidAmount = voucher.paidAmount + amount;
      const newBalanceDue = voucher.totalAmount - newPaidAmount;
      const newStatus = newBalanceDue <= 0 ? "PAID" : "PARTIAL";

      await tx.feeVoucher.update({
        where: { id: voucherId },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: Math.max(0, newBalanceDue),
          status: newStatus,
        },
      });

      // Create transaction log
      await tx.transactionLog.create({
        data: {
          entityType: "PAYMENT",
          entityId: payment.id,
          action: "PAYMENT_RECEIVED",
          userId: session.user.id,
          details: {
            receiptNo: payment.receiptNo,
            voucherNo: voucher.voucherNo,
            studentName: `${voucher.student.firstName} ${voucher.student.lastName}`,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            newVoucherStatus: newStatus,
            remainingBalance: Math.max(0, newBalanceDue),
          },
        },
      });

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error receiving payment:", error);
    return NextResponse.json(
      { error: "Failed to receive payment" },
      { status: 500 }
    );
  }
}
