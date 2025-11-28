import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import { getNextSequenceValue } from "@/lib/sequences";

// GET - List teacher salaries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.MANAGE_TEACHER_SALARY)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const teacherId = searchParams.get("teacherId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (month && year) {
      where.month = parseInt(month);
      where.year = parseInt(year);
    }

    if (status) {
      where.status = status;
    }

    const [salaries, total] = await Promise.all([
      prisma.teacherSalary.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              teacherId: true,
              firstName: true,
              lastName: true,
              baseSalary: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),
      prisma.teacherSalary.count({ where }),
    ]);

    return NextResponse.json({
      data: salaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Salaries GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch salaries" },
      { status: 500 }
    );
  }
}

// POST - Generate/Process teacher salary
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.MANAGE_TEACHER_SALARY)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      teacherId,
      teacherIds, // For bulk processing
      month,
      year,
      allowances,
      deductions,
      deductionReason,
    } = body;

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    let teachersToProcess: string[] = [];

    if (teacherId) {
      teachersToProcess = [teacherId];
    } else if (teacherIds && teacherIds.length > 0) {
      teachersToProcess = teacherIds;
    } else {
      // Process all active teachers
      const teachers = await prisma.teacher.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      teachersToProcess = teachers.map((t: { id: string }) => t.id);
    }

    const results = await Promise.all(
      teachersToProcess.map(async (tid) => {
        // Check if salary already exists
        const existing = await prisma.teacherSalary.findFirst({
          where: { teacherId: tid, month: targetMonth, year: targetYear },
        });

        if (existing) {
          return { teacherId: tid, status: "exists", salaryId: existing.id };
        }

        // Get teacher details
        const teacher = await prisma.teacher.findUnique({
          where: { id: tid },
          include: {
            teacherSubjects: {
              include: {
                class: true,
              },
            },
          },
        });

        if (!teacher) {
          return { teacherId: tid, status: "not_found" };
        }

        // Calculate salary components
        const baseSalary = teacher.baseSalary;

        // Calculate class allowance (extra pay per class taught)
        const uniqueClasses = new Set(
          teacher.teacherSubjects.map((ts: { classId: string }) => ts.classId)
        );
        const classAllowance = uniqueClasses.size * 1000; // Rs 1000 per class

        const totalAllowances = (allowances || 0) + classAllowance;
        const totalDeductions = deductions || 0;
        const netSalary = baseSalary + totalAllowances - totalDeductions;

        // Generate salary slip number
        const salarySlipNumber = await getNextSequenceValue("SALARY");

        const salary = await prisma.teacherSalary.create({
          data: {
            salarySlipNumber,
            teacherId: tid,
            month: targetMonth,
            year: targetYear,
            baseSalary,
            allowances: totalAllowances,
            deductions: totalDeductions,
            deductionReason,
            netSalary,
            status: "PENDING",
            processedById: session.user.id,
          },
        });

        await logTransaction({
          action: "CREATE",
          entityType: "TeacherSalary",
          entityId: salary.id,
          userId: session.user.id,
          details: { salarySlipNumber, teacherId: tid, netSalary },
        });

        return { teacherId: tid, status: "created", salaryId: salary.id };
      })
    );

    const created = results.filter((r) => r.status === "created").length;
    const exists = results.filter((r) => r.status === "exists").length;

    return NextResponse.json({
      message: `Processed ${created} salary records. ${exists} already existed.`,
      results,
    });
  } catch (error) {
    console.error("Salaries POST Error:", error);
    return NextResponse.json(
      { error: "Failed to process salaries" },
      { status: 500 }
    );
  }
}

// PUT - Pay salary
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.MANAGE_TEACHER_SALARY)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { salaryId, paymentMethod, paymentDate, bankName, transactionId } =
      body;

    const salary = await prisma.teacherSalary.update({
      where: { id: salaryId },
      data: {
        status: "PAID",
        paidDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod,
        bankName,
        transactionId,
      },
    });

    await logTransaction({
      action: "UPDATE",
      entityType: "TeacherSalary",
      entityId: salaryId,
      userId: session.user.id,
      details: { action: "PAID", paymentMethod },
    });

    return NextResponse.json({
      message: "Salary marked as paid",
      data: salary,
    });
  } catch (error) {
    console.error("Salaries PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update salary" },
      { status: 500 }
    );
  }
}
