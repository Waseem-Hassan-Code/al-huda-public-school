import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logUpdate } from "@/lib/transaction-log";
import { FeeStatus, FeeType } from "@prisma/client";
import { getVoucherArrears } from "@/lib/fee-payment";
import { round2 } from "@/lib/fee-utils";

// GET - Get single voucher by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_FEES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const voucher = await prisma.feeVoucher.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            class: true,
            section: true,
          },
        },
        feeItems: true,
        payments: {
          orderBy: { paymentDate: "desc" },
          include: { createdBy: { select: { name: true } } },
        },
      },
    });

    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // Live arrears: unpaid balances on this student's older vouchers
    const arrears = await getVoucherArrears(voucher);
    return NextResponse.json({ ...voucher, arrears });
  } catch (error) {
    console.error("Fee Voucher GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch voucher" },
      { status: 500 }
    );
  }
}

// PUT - Update voucher (only for UNPAID or PARTIALLY_PAID)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_FEE_VOUCHER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get existing voucher
    const existingVoucher = await prisma.feeVoucher.findUnique({
      where: { id },
      include: { payments: true, feeItems: true },
    });

    if (!existingVoucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // Only allow editing unpaid or partially paid vouchers
    if (
      existingVoucher.status === "PAID" ||
      existingVoucher.status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          error: `Cannot edit a ${existingVoucher.status.toLowerCase()} voucher`,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { feeItems, discount, lateFee, dueDate, remarks } = body;

    // Calculate amounts
    let subtotal = 0;
    if (feeItems && feeItems.length > 0) {
      subtotal = feeItems.reduce(
        (sum: number, item: any) => sum + (item.amount || 0),
        0
      );
    } else {
      subtotal = existingVoucher.subtotal;
    }

    const newDiscount =
      discount !== undefined ? parseFloat(discount) : existingVoucher.discount;
    const newLateFee =
      lateFee !== undefined ? parseFloat(lateFee) : existingVoucher.lateFee;
    // Arrears are NOT part of a voucher's own total (they stay on the older
    // vouchers and are shown as a separate line), so previousBalance is left out.
    const totalAmount = round2(subtotal + newLateFee - newDiscount);
    if (totalAmount < 0) {
      return NextResponse.json(
        { error: "Discount can't be more than the fees plus late fee" },
        { status: 400 }
      );
    }
    if (totalAmount + 0.005 < existingVoucher.paidAmount) {
      return NextResponse.json(
        {
          error: `The new total (Rs. ${totalAmount.toLocaleString()}) is less than what has already been paid (Rs. ${existingVoucher.paidAmount.toLocaleString()})`,
        },
        { status: 400 }
      );
    }
    const balanceDue = round2(Math.max(0, totalAmount - existingVoucher.paidAmount));

    // Determine new status
    let newStatus: FeeStatus = existingVoucher.status;
    if (balanceDue <= 0) {
      newStatus = FeeStatus.PAID;
    } else if (existingVoucher.paidAmount > 0) {
      newStatus = FeeStatus.PARTIAL;
    } else if (existingVoucher.status === FeeStatus.OVERDUE) {
      newStatus = FeeStatus.OVERDUE;
    } else {
      newStatus = FeeStatus.UNPAID;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update fee items if provided
      if (feeItems && feeItems.length > 0) {
        // Delete existing items
        await tx.feeVoucherItem.deleteMany({
          where: { voucherId: id },
        });

        // Create new items
        await tx.feeVoucherItem.createMany({
          data: feeItems.map((item: any) => ({
            voucherId: id,
            feeType: item.feeType || FeeType.OTHER,
            description: item.description,
            amount: item.amount,
          })),
        });
      }

      // Update voucher
      const updatedVoucher = await tx.feeVoucher.update({
        where: { id },
        data: {
          subtotal,
          discount: newDiscount,
          lateFee: newLateFee,
          totalAmount,
          balanceDue,
          status: newStatus,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          remarks,
        },
        include: {
          student: {
            include: {
              class: true,
              section: true,
            },
          },
          feeItems: true,
          payments: true,
        },
      });

      return updatedVoucher;
    });

    // Log the update
    await logUpdate(
      "FEE",
      id,
      { totalAmount: existingVoucher.totalAmount },
      { totalAmount: result.totalAmount },
      session.user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fee Voucher PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update voucher" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel voucher (only if no payments)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.DELETE_FEE_VOUCHER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get existing voucher
    const existingVoucher = await prisma.feeVoucher.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!existingVoucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // Don't allow canceling if payments exist
    if (existingVoucher.payments.length > 0) {
      return NextResponse.json(
        { error: "Cannot cancel voucher with existing payments" },
        { status: 400 }
      );
    }

    // Cancel the voucher
    await prisma.feeVoucher.update({
      where: { id },
      data: { status: FeeStatus.CANCELLED },
    });

    return NextResponse.json({ message: "Voucher cancelled successfully" });
  } catch (error) {
    console.error("Fee Voucher DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel voucher" },
      { status: 500 }
    );
  }
}
