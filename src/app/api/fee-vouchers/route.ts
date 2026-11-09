import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import { getNextSequenceValue } from "@/lib/sequences";
import { FeeStatus, FeeType } from "@prisma/client";
import { round2 } from "@/lib/fee-utils";

// GET - List fee vouchers with pagination and filtering
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const status = searchParams.get("status");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { voucherNo: { contains: search, mode: "insensitive" } },
        { student: { firstName: { contains: search, mode: "insensitive" } } },
        { student: { lastName: { contains: search, mode: "insensitive" } } },
        {
          student: {
            registrationNo: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    if (studentId) {
      where.studentId = studentId;
    }

    // Filter by class
    if (classId) {
      where.student = { ...where.student, classId };
    }

    // Filter by section
    if (sectionId) {
      where.student = { ...where.student, sectionId };
    }

    if (status === "OUTSTANDING") {
      // Anything still owed: unpaid, partially paid or overdue
      where.status = { in: [FeeStatus.UNPAID, FeeStatus.PARTIAL, FeeStatus.OVERDUE] };
    } else if (status) {
      where.status = status;
    }

    if (month === "0") {
      // Opening balances are stored as month 0 / year 0
      where.isOpeningBalance = true;
    } else {
      if (month) where.month = parseInt(month);
      if (year) where.year = parseInt(year);
    }

    // Totals and per-status counts for the same filter, ignoring the status
    // filter for the counts so the status chips always show every bucket
    const { status: _ignored, ...whereWithoutStatus } = where;

    const [vouchers, total] = await Promise.all([
      prisma.feeVoucher.findMany({
        where,
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
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.feeVoucher.count({ where }),
    ]);

    const [totals, byStatus] = await Promise.all([
      prisma.feeVoucher.aggregate({
        where: { ...where, status: where.status ?? { not: FeeStatus.CANCELLED } },
        _sum: { totalAmount: true, paidAmount: true, balanceDue: true },
      }),
      prisma.feeVoucher.groupBy({
        by: ["status"],
        where: whereWithoutStatus,
        _count: { _all: true },
        _sum: { balanceDue: true },
      }),
    ]);

    return NextResponse.json({
      vouchers,
      summary: {
        totalAmount: round2(totals._sum.totalAmount ?? 0),
        paidAmount: round2(totals._sum.paidAmount ?? 0),
        balanceDue: round2(totals._sum.balanceDue ?? 0),
        byStatus: Object.fromEntries(
          byStatus.map((b) => [b.status, { count: b._count._all, balanceDue: round2(b._sum.balanceDue ?? 0) }])
        ),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fee Vouchers GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fee vouchers" },
      { status: 500 }
    );
  }
}

// POST - Generate fee vouchers (manual trigger for single student or batch)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.CREATE_FEE_VOUCHER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      studentId,
      studentIds,
      month,
      year,
      classId,
      sectionId,
      feeItems: customFeeItems,
      isOpeningBalance,
    } = body;

    // ── Special path: create an opening balance voucher ──────────────────────
    if (isOpeningBalance && studentId && customFeeItems?.length > 0) {
      const amount = customFeeItems.reduce(
        (s: number, f: any) => s + (f.amount || 0),
        0
      );
      if (amount <= 0) {
        return NextResponse.json(
          { error: "Opening balance amount must be greater than 0" },
          { status: 400 }
        );
      }
      // A student has at most one opening balance (month 0 / year 0 is unique
      // per student), so "Set Opening Balance" updates the existing one.
      const existing = await prisma.feeVoucher.findFirst({
        where: { studentId, month: 0, year: 0 },
      });
      if (existing) {
        if (amount + 0.005 < existing.paidAmount) {
          return NextResponse.json(
            {
              error: `Rs. ${existing.paidAmount.toLocaleString()} has already been received against the opening balance, so it can't be set lower than that`,
            },
            { status: 400 }
          );
        }
        const balanceDue = round2(Math.max(0, amount - existing.paidAmount));
        const updated = await prisma.$transaction(async (tx) => {
          await tx.feeVoucherItem.deleteMany({ where: { voucherId: existing.id } });
          await tx.student.update({ where: { id: studentId }, data: { openingBalance: amount } });
          return tx.feeVoucher.update({
            where: { id: existing.id },
            data: {
              subtotal: amount,
              totalAmount: amount,
              balanceDue,
              status:
                balanceDue <= 0
                  ? FeeStatus.PAID
                  : existing.paidAmount > 0
                    ? FeeStatus.PARTIAL
                    : FeeStatus.UNPAID,
              isOpeningBalance: true,
              feeItems: {
                create: customFeeItems.map((f: any) => ({
                  feeType: FeeType.OTHER,
                  description: f.description || "Opening Balance (Previous Dues)",
                  amount: f.amount,
                })),
              },
            },
          });
        });
        await logTransaction({
          action: "UPDATE",
          entityType: "FEE",
          entityId: updated.id,
          userId: session.user.id,
          details: { voucherNo: updated.voucherNo, openingBalanceFrom: existing.totalAmount, openingBalanceTo: amount },
        });
        return NextResponse.json(
          { message: "Opening balance updated", voucherId: updated.id, voucherNo: updated.voucherNo },
          { status: 200 }
        );
      }

      const voucherNo = await getNextSequenceValue("VOUCHER");
      await prisma.student.update({ where: { id: studentId }, data: { openingBalance: amount } });
      const voucher = await prisma.feeVoucher.create({
        data: {
          voucherNo,
          studentId,
          month: 0,
          year: 0,
          dueDate: new Date(),
          subtotal: amount,
          totalAmount: amount,
          balanceDue: amount,
          paidAmount: 0,
          status: FeeStatus.UNPAID,
          isOpeningBalance: true,
          remarks: "Opening balance — added manually from student profile",
          createdById: session.user.id,
          feeItems: {
            create: customFeeItems.map((f: any) => ({
              feeType: FeeType.OTHER,
              description: f.description || "Opening Balance (Previous Dues)",
              amount: f.amount,
            })),
          },
        },
      });
      return NextResponse.json(
        { message: "Opening balance created", voucherId: voucher.id, voucherNo },
        { status: 201 }
      );
    }

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    const dueDate = new Date(targetYear, targetMonth - 1, 10); // Due on 10th of month

    let studentsToProcess: string[] = [];
    const isSingleStudentWithCustomItems =
      studentId && customFeeItems && customFeeItems.length > 0;

    if (studentId) {
      // Single student
      studentsToProcess = [studentId];
    } else if (studentIds && studentIds.length > 0) {
      // Multiple specific students
      studentsToProcess = studentIds;
    } else {
      // Batch generate for class/section or all active students
      const studentWhere: any = { status: "ACTIVE" };
      if (classId) studentWhere.classId = classId;
      if (sectionId) studentWhere.sectionId = sectionId;

      const students = await prisma.student.findMany({
        where: studentWhere,
        select: { id: true },
      });
      studentsToProcess = students.map((s: { id: string }) => s.id);
    }

    // Generate vouchers for each student
    const results = await Promise.all(
      studentsToProcess.map(async (sid) => {
        // Check if voucher already exists for this month
        const existingVoucher = await prisma.feeVoucher.findFirst({
          where: {
            studentId: sid,
            month: targetMonth,
            year: targetYear,
          },
        });

        if (existingVoucher) {
          return {
            studentId: sid,
            status: "exists",
            voucherId: existingVoucher.id,
          };
        }

        // Get student's monthly fee and previous unpaid vouchers
        const [student, unpaidVouchers] = await Promise.all([
          prisma.student.findUnique({
            where: { id: sid },
            select: {
              monthlyFee: true,
              classId: true,
              firstName: true,
              lastName: true,
              registrationNo: true,
            },
          }),
          prisma.feeVoucher.findMany({
            where: {
              studentId: sid,
              status: { in: [FeeStatus.UNPAID, FeeStatus.PARTIAL, FeeStatus.OVERDUE] },
            },
            orderBy: { createdAt: "desc" },
          }),
        ]);

        // Determine fee items and subtotal
        let subtotal: number;
        let voucherFeeItems: {
          feeType: FeeType;
          description: string;
          amount: number;
        }[];

        if (isSingleStudentWithCustomItems && sid === studentId) {
          // Use custom fee items from the request (single student with custom items)
          subtotal = customFeeItems.reduce(
            (sum: number, item: any) => sum + (item.amount || 0),
            0
          );
          voucherFeeItems = customFeeItems.map((item: any) => ({
            feeType:
              item.feeType && FeeType[item.feeType as keyof typeof FeeType]
                ? FeeType[item.feeType as keyof typeof FeeType]
                : FeeType.OTHER,
            description:
              item.description || `Fee - ${targetMonth}/${targetYear}`,
            amount: item.amount || 0,
          }));

          if (subtotal === 0) {
            return { studentId: sid, status: "no_fees" };
          }
        } else {
          // Use student's monthly fee (batch generation or no custom items)
          if (!student || student.monthlyFee === 0) {
            return { studentId: sid, status: "no_fees" };
          }
          subtotal = student.monthlyFee;
          voucherFeeItems = [
            {
              feeType: FeeType.MONTHLY_FEE,
              description: `Monthly Fee - ${targetMonth}/${targetYear}`,
              amount: subtotal,
            },
          ];
        }

        // Calculate previous balance from ALL unpaid/partial vouchers (for display/reference only)
        // NOTE: We do NOT add this to the current voucher's balanceDue to avoid compounding
        const previousBalance = unpaidVouchers.reduce(
          (sum, v) => sum + v.balanceDue,
          0
        );

        // Get the most recent unpaid voucher for reference linking
        const lastUnpaidVoucher = unpaidVouchers[0] || null;

        // Generate voucher number
        const voucherNo = await getNextSequenceValue("VOUCHER");

        // Total amount for THIS voucher = just the current subtotal
        // The previousBalance is stored for reference but NOT added to balanceDue
        // This prevents the compounding balance issue
        const totalAmount = subtotal;

        // Create voucher with proper linking
        const voucher = await prisma.feeVoucher.create({
          data: {
            voucherNo,
            studentId: sid,
            month: targetMonth,
            year: targetYear,
            dueDate,
            subtotal,
            totalAmount,
            previousBalance, // Stored for reference/display only
            balanceDue: totalAmount, // Only this voucher's amount
            paidAmount: 0,
            status: FeeStatus.UNPAID,
            previousVoucherId: lastUnpaidVoucher?.id || null,
            createdById: session.user.id,
            feeItems: {
              create: voucherFeeItems,
            },
          },
        });

        // Log transaction with detailed info
        await logTransaction({
          action: "FEE_GENERATED",
          entityType: "FEE",
          entityId: voucher.id,
          userId: session.user.id,
          details: {
            voucherNo,
            studentId: sid,
            studentName: student
              ? `${student.firstName} ${student.lastName}`
              : "Unknown",
            registrationNo: student?.registrationNo || "N/A",
            month: targetMonth,
            year: targetYear,
            subtotal,
            previousBalance,
            totalAmount: voucher.totalAmount,
            previousVoucherId: lastUnpaidVoucher?.id || null,
          },
        });

        return { studentId: sid, status: "created", voucherId: voucher.id };
      })
    );

    const created = results.filter((r) => r.status === "created").length;
    const exists = results.filter((r) => r.status === "exists").length;
    const noFees = results.filter((r) => r.status === "no_fees").length;

    return NextResponse.json({
      message: `Generated ${created} vouchers. ${exists} already existed. ${noFees} students have no fee structure.`,
      results,
    });
  } catch (error) {
    console.error("Fee Vouchers POST Error:", error);
    return NextResponse.json(
      { error: "Failed to generate fee vouchers" },
      { status: 500 }
    );
  }
}
