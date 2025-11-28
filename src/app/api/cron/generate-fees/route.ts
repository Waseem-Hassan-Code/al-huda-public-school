import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSequenceValue } from "@/lib/sequences";
import { logTransaction } from "@/lib/transaction-log";

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

    console.log(
      `[CRON] Starting automatic fee voucher generation for ${targetMonth}/${targetYear}`
    );

    // Get all active students with their fee structures
    const students = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      include: {
        studentFees: {
          include: { feeStructure: true },
        },
      },
    });

    console.log(`[CRON] Found ${students.length} active students`);

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

        // Skip if student has no fee structure
        if (student.studentFees.length === 0) {
          skipped++;
          continue;
        }

        // Calculate total amount from student's fees
        const totalAmount = student.studentFees.reduce(
          (sum: number, sf: any) => {
            return sum + (sf.amount - sf.discount);
          },
          0
        );

        // Get previous balance (unpaid from last voucher)
        const lastVoucher = await prisma.feeVoucher.findFirst({
          where: { studentId: student.id },
          orderBy: { createdAt: "desc" },
        });

        const previousBalance = lastVoucher
          ? lastVoucher.totalAmount - lastVoucher.paidAmount
          : 0;

        // Generate voucher number
        const voucherNumber = await getNextSequenceValue("VOUCHER");

        // Create voucher
        const voucher = await prisma.feeVoucher.create({
          data: {
            voucherNumber,
            studentId: student.id,
            month: targetMonth,
            year: targetYear,
            dueDate,
            totalAmount: totalAmount + previousBalance,
            previousBalance,
            paidAmount: 0,
            status: "PENDING",
            generatedBy: null, // System generated
          },
        });

        // Log transaction
        await logTransaction({
          action: "CREATE",
          entityType: "FeeVoucher",
          entityId: voucher.id,
          userId: "system", // System
          details: {
            voucherNumber,
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
        status: "PENDING",
        dueDate: { lt: now },
      },
      data: {
        status: "OVERDUE",
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
export async function GET(request: NextRequest) {
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
        prisma.feeVoucher.count({ where: { status: "PENDING" } }),
        prisma.feeVoucher.count({ where: { status: "OVERDUE" } }),
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
