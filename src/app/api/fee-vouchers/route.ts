import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import { getNextSequenceValue } from "@/lib/sequences";
import { FeeStatus, FeeType } from "@prisma/client";

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
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const sortBy = searchParams.get("sortBy") || "dueDate";
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

    if (status) {
      where.status = status;
    }

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.dueDate = {
        gte: startDate,
        lte: endDate,
      };
    }

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

    return NextResponse.json({
      data: vouchers,
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
    const { studentId, studentIds, month, year, classId, sectionId } = body;

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    const dueDate = new Date(targetYear, targetMonth - 1, 10); // Due on 10th of month

    let studentsToProcess: string[] = [];

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
              status: { in: [FeeStatus.UNPAID, FeeStatus.PARTIAL] },
            },
            orderBy: { createdAt: "desc" },
          }),
        ]);

        if (!student || student.monthlyFee === 0) {
          return { studentId: sid, status: "no_fees" };
        }

        // Calculate total amount from monthly fee
        const subtotal = student.monthlyFee;

        // Calculate previous balance from ALL unpaid/partial vouchers
        const previousBalance = unpaidVouchers.reduce(
          (sum, v) => sum + v.balanceDue,
          0
        );

        // Get the most recent unpaid voucher for reference linking
        const lastUnpaidVoucher = unpaidVouchers[0] || null;

        // Generate voucher number
        const voucherNo = await getNextSequenceValue("VOUCHER");

        // Total amount = current month fee + all previous unpaid balances
        const totalAmount = subtotal + previousBalance;

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
            previousBalance,
            balanceDue: totalAmount,
            paidAmount: 0,
            status: FeeStatus.UNPAID,
            previousVoucherId: lastUnpaidVoucher?.id || null,
            createdById: session.user.id,
            feeItems: {
              create: {
                feeType: FeeType.MONTHLY_FEE,
                description: `Monthly Fee - ${targetMonth}/${targetYear}`,
                amount: subtotal,
              },
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
            studentName: `${student.firstName} ${student.lastName}`,
            registrationNo: student.registrationNo,
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
