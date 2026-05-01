import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSequenceValue } from "@/lib/sequences";
import { logTransaction } from "@/lib/transaction-log";
import { getSystemUserId } from "@/lib/system-user";
import { FeeStatus, FeeType } from "@prisma/client";

// This endpoint is meant to be called by a CRON job on the 1st of each month
// It generates fee vouchers for all active students

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from an authorized source (CRON secret)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const targetMonth = now.getMonth() + 1; // 1-12
    const targetYear = now.getFullYear();
    const dueDate = new Date(targetYear, targetMonth - 1, 10); // Due on 10th

    const systemUserId = await getSystemUserId();

    console.log(
      `[CRON] Starting automatic fee voucher generation for ${targetMonth}/${targetYear}`
    );

    // Get current academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: "No active academic year found" },
        { status: 400 }
      );
    }

    // Get all active students with their class info
    const students = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      include: {
        class: true,
        section: true,
      },
    });

    console.log(`[CRON] Found ${students.length} active students`);

    // Get fee structures for recurring fees
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        academicYearId: academicYear.id,
        isActive: true,
        isRecurring: true,
      },
    });

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const student of students) {
      try {
        // Check if voucher already exists
        const existingVoucher = await prisma.feeVoucher.findFirst({
          where: {
            studentId: student.id,
            month: targetMonth,
            year: targetYear,
          },
        });

        if (existingVoucher) {
          skipped++;
          continue;
        }

        // Get applicable fee structures for student's class
        const applicableFees = feeStructures.filter(
          (fs) => !fs.classId || fs.classId === student.classId
        );

        if (applicableFees.length === 0 && student.monthlyFee === 0) {
          skipped++;
          continue;
        }

        // Calculate total amount
        let totalAmount = student.monthlyFee || 0;
        const feeItems: {
          feeType: FeeType;
          description: string;
          amount: number;
        }[] = [];

        if (student.monthlyFee > 0) {
          feeItems.push({
            feeType: FeeType.MONTHLY_FEE,
            description: `Monthly Fee - ${targetMonth}/${targetYear}`,
            amount: student.monthlyFee,
          });
        }

        for (const fee of applicableFees) {
          if (fee.feeType !== FeeType.MONTHLY_FEE) {
            totalAmount += fee.amount;
            feeItems.push({
              feeType: fee.feeType,
              description: fee.name,
              amount: fee.amount,
            });
          }
        }

        // Compute previousBalance as sum of ALL existing unpaid/partial/overdue
        // vouchers — stored for display only, NOT added to this voucher's balanceDue.
        // Each voucher is responsible for its own month's fee only; the FIFO payment
        // allocator handles clearing older dues automatically.
        const [unpaidVouchers, lastVoucher] = await Promise.all([
          prisma.feeVoucher.findMany({
            where: {
              studentId: student.id,
              status: { in: [FeeStatus.UNPAID, FeeStatus.PARTIAL, FeeStatus.OVERDUE] },
            },
            select: { balanceDue: true },
          }),
          prisma.feeVoucher.findFirst({
            where: { studentId: student.id },
            orderBy: { createdAt: "desc" },
            select: { id: true },
          }),
        ]);

        const previousBalance = unpaidVouchers.reduce((s, v) => s + v.balanceDue, 0);

        // Generate voucher number
        const voucherNo = await getNextSequenceValue("VOUCHER");

        // Create voucher with fee items.
        // totalAmount = THIS month's fee only (no compounding of prior balances).
        const voucher = await prisma.feeVoucher.create({
          data: {
            voucherNo,
            studentId: student.id,
            month: targetMonth,
            year: targetYear,
            dueDate,
            subtotal: totalAmount,
            previousBalance,        // display reference
            totalAmount,            // this month only
            paidAmount: 0,
            balanceDue: totalAmount, // this month only
            status: FeeStatus.UNPAID,
            isAutoGenerated: true,
            createdById: systemUserId,
            feeItems: {
              create: feeItems,
            },
            previousVoucherId: lastVoucher?.id,
          },
        });

        // Log transaction
        await logTransaction({
          action: "CREATE",
          entityType: "FeeVoucher",
          entityId: voucher.id,
          userId: systemUserId,
          details: {
            voucherNo,
            studentId: student.id,
            amount: voucher.totalAmount,
            source: "CRON_JOB",
          },
        });

        created++;
      } catch (err) {
        console.error(
          `[CRON] Error generating voucher for student ${student.id}:`,
          err
        );
        errors++;
      }
    }

    // Update vouchers that are past due date to OVERDUE status
    const overdueCount = await prisma.feeVoucher.updateMany({
      where: {
        status: FeeStatus.UNPAID,
        dueDate: { lt: now },
      },
      data: {
        status: FeeStatus.OVERDUE,
      },
    });

    console.log(
      `[CRON] Completed. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}, Marked Overdue: ${overdueCount.count}`
    );

    return NextResponse.json({
      success: true,
      message: `Fee voucher generation completed`,
      stats: {
        month: targetMonth,
        year: targetYear,
        totalStudents: students.length,
        vouchersCreated: created,
        skipped,
        errors,
        markedOverdue: overdueCount.count,
      },
    });
  } catch (error) {
    console.error("[CRON] Fee voucher generation failed:", error);
    return NextResponse.json(
      { error: "Fee voucher generation failed" },
      { status: 500 }
    );
  }
}

// GET endpoint to check CRON job status
export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get statistics
    const [totalActive, vouchersThisMonth, pendingVouchers, overdueVouchers] =
      await Promise.all([
        prisma.student.count({ where: { status: "ACTIVE" } }),
        prisma.feeVoucher.count({
          where: { month: currentMonth, year: currentYear },
        }),
        prisma.feeVoucher.count({ where: { status: FeeStatus.UNPAID } }),
        prisma.feeVoucher.count({ where: { status: FeeStatus.OVERDUE } }),
      ]);

    return NextResponse.json({
      status: "operational",
      currentMonth,
      currentYear,
      stats: {
        activeStudents: totalActive,
        vouchersGeneratedThisMonth: vouchersThisMonth,
        pendingVouchers,
        overdueVouchers,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
