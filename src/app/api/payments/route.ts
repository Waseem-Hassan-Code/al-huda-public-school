import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { processPaymentFIFO } from "@/lib/fee-payment";

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

// POST - Receive payment with automatic FIFO allocation
//
// Body: { studentId, amount, paymentMethod?, reference?, remarks?, voucherId? }
//
// voucherId is accepted for UI compatibility but is used ONLY to look up the
// studentId. Payment is always routed oldest-dues-first (FIFO) regardless of
// which voucher the UI was displaying.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.RECEIVE_PAYMENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { voucherId, amount, paymentMethod, reference, remarks } = body;
    let { studentId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Student ID, Voucher ID and valid amount are required" },
        { status: 400 }
      );
    }

    // Resolve studentId from voucherId when not supplied
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

    const result = await processPaymentFIFO({
      studentId,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || "CASH",
      paymentDate: new Date(),
      reference: reference ?? null,
      remarks: remarks ?? null,
      createdById: session.user.id,
    });

    // Return a response shape compatible with the existing UI
    // (the UI reads data.receiptNo and data.receiptNumber)
    const primaryAllocation = result.allocations[0];
    return NextResponse.json(
      {
        id: primaryAllocation?.voucherId,
        receiptNo: result.primaryReceiptNo,
        receiptNumber: result.primaryReceiptNo,
        studentId,
        amount: result.totalApplied,
        paymentMethod: paymentMethod || "CASH",
        reference,
        totalApplied: result.totalApplied,
        allocations: result.allocations,
        message: `Payment of ${result.totalApplied} recorded. Receipt: ${result.primaryReceiptNo}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error receiving payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to receive payment" },
      { status: 500 }
    );
  }
}
