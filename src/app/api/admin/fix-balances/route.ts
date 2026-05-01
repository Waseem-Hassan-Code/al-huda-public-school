/**
 * ONE-TIME DATA MIGRATION ENDPOINT
 *
 * The CRON job previously compounded previousBalance into each voucher's
 * totalAmount and balanceDue, causing exponential balance inflation.
 *
 * This endpoint recalculates every voucher so that:
 *   totalAmount = subtotal + lateFee - discount   (no previousBalance compounding)
 *   balanceDue  = MAX(0, totalAmount - paidAmount)
 *   previousBalance = sum of all OLDER unpaid vouchers' balanceDue (display only)
 *   status recomputed from balanceDue and paidAmount
 *
 * It also refreshes the previousBalance display field on each voucher.
 *
 * IMPORTANT: Review the dry-run output before committing. Use ?dryRun=true first.
 *
 * Access: SUPER_ADMIN only, protected by ADMIN_SECRET header.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FeeStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  // Guard: require ADMIN_SECRET or SUPER_ADMIN session
  const session = await getServerSession(authOptions);
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = request.headers.get("authorization");

  const hasSecret = adminSecret && authHeader === `Bearer ${adminSecret}`;
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  if (!hasSecret && !isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") !== "false"; // default = dry run

  try {
    // Load every student with their vouchers sorted chronologically
    const students = await prisma.student.findMany({
      select: { id: true, registrationNo: true, firstName: true, lastName: true },
    });

    const report: any[] = [];
    let totalFixed = 0;
    let totalSkipped = 0;

    for (const student of students) {
      // Fetch vouchers in FIFO order (opening balance first, then by year/month)
      const vouchers = await prisma.feeVoucher.findMany({
        where: { studentId: student.id },
        orderBy: [
          { isOpeningBalance: "desc" },
          { year: "asc" },
          { month: "asc" },
        ],
      });

      if (vouchers.length === 0) continue;

      const studentChanges: any[] = [];
      // Running sum of unpaid balanceDue from vouchers BEFORE the current one
      let runningPreviousBalance = 0;

      for (const v of vouchers) {
        // Correct totalAmount = just this voucher's own fees (no carry-forward)
        const correctTotal = Math.max(0, v.subtotal + v.lateFee - v.discount);
        const correctBalanceDue = Math.max(0, correctTotal - v.paidAmount);

        let correctStatus: string = v.status;
        if (v.status !== "PAID" && v.status !== "CANCELLED" && v.status !== "WAIVED") {
          if (correctBalanceDue <= 0) {
            correctStatus = "PAID";
          } else if (v.paidAmount > 0) {
            correctStatus = "PARTIAL";
          } else {
            // Keep OVERDUE if it was OVERDUE, otherwise UNPAID
            correctStatus = v.status === "OVERDUE" ? "OVERDUE" : "UNPAID";
          }
        }

        const changed =
          Math.abs(v.totalAmount - correctTotal) > 0.005 ||
          Math.abs(v.balanceDue - correctBalanceDue) > 0.005 ||
          Math.abs(v.previousBalance - runningPreviousBalance) > 0.005 ||
          v.status !== correctStatus;

        if (changed) {
          studentChanges.push({
            voucherId: v.id,
            voucherNo: v.voucherNo,
            month: v.month,
            year: v.year,
            old: {
              totalAmount: v.totalAmount,
              balanceDue: v.balanceDue,
              previousBalance: v.previousBalance,
              status: v.status,
            },
            new: {
              totalAmount: correctTotal,
              balanceDue: correctBalanceDue,
              previousBalance: runningPreviousBalance,
              status: correctStatus,
            },
          });

          if (!dryRun) {
            await prisma.feeVoucher.update({
              where: { id: v.id },
              data: {
                totalAmount: correctTotal,
                balanceDue: correctBalanceDue,
                previousBalance: runningPreviousBalance,
                status: correctStatus as FeeStatus,
              },
            });
          }
          totalFixed++;
        } else {
          totalSkipped++;
        }

        // Accumulate this voucher's remaining balance for the NEXT voucher's
        // previousBalance display field
        if (correctStatus !== "PAID" && correctStatus !== "CANCELLED" && correctStatus !== "WAIVED") {
          runningPreviousBalance += correctBalanceDue;
        }
      }

      if (studentChanges.length > 0) {
        report.push({
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          registrationNo: student.registrationNo,
          changes: studentChanges,
        });
      }
    }

    return NextResponse.json({
      dryRun,
      summary: {
        studentsAffected: report.length,
        vouchersFixed: totalFixed,
        vouchersUnchanged: totalSkipped,
      },
      message: dryRun
        ? "Dry run complete — no data was modified. Add ?dryRun=false to commit."
        : `Migration complete — ${totalFixed} vouchers corrected.`,
      report,
    });
  } catch (error: any) {
    console.error("fix-balances migration error:", error);
    return NextResponse.json(
      { error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}
