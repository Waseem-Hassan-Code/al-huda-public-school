import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST - Generate salary records for all active teachers for a specific month
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and year are required" },
        { status: 400 }
      );
    }

    // Get all active teachers
    const teachers = await prisma.teacher.findMany({
      where: { isActive: true },
    });

    if (teachers.length === 0) {
      return NextResponse.json(
        { error: "No active teachers found" },
        { status: 400 }
      );
    }

    // Check which teachers already have salary records for this month
    const existingSalaries = await prisma.teacherSalary.findMany({
      where: { month, year },
      select: { teacherId: true },
    });

    const existingTeacherIds = new Set(
      existingSalaries.map((s: { teacherId: string }) => s.teacherId)
    );

    // Filter out teachers who already have salary records
    const teachersToGenerate = teachers.filter(
      (t: { id: string }) => !existingTeacherIds.has(t.id)
    );

    if (teachersToGenerate.length === 0) {
      return NextResponse.json(
        {
          message: "Salary records already exist for all teachers",
          count: 0,
        },
        { status: 200 }
      );
    }

    // Create salary records for all teachers
    const salaryRecords = teachersToGenerate.map((teacher: any) => ({
      teacherId: teacher.id,
      month,
      year,
      baseSalary: teacher.monthlySalary,
      allowances: 0,
      deductions: 0,
      bonuses: 0,
      netSalary: teacher.monthlySalary,
      status: "PENDING" as const,
    }));

    await prisma.teacherSalary.createMany({
      data: salaryRecords,
    });

    return NextResponse.json({
      message: `Generated ${teachersToGenerate.length} salary records`,
      count: teachersToGenerate.length,
      skipped: existingSalaries.length,
    });
  } catch (error) {
    console.error("Failed to generate salaries:", error);
    return NextResponse.json(
      { error: "Failed to generate salaries" },
      { status: 500 }
    );
  }
}
