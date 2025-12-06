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

    if (status) {
      where.status = status;
    }

    if (month) {
      where.month = parseInt(month);
    }

    if (year) {
      where.year = parseInt(year);
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

    return NextResponse.json({
      vouchers,
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
    } = body;

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
              status: { in: [FeeStatus.UNPAID, FeeStatus.PARTIAL] },
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
