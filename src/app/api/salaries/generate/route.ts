import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNextSequenceValue } from "@/lib/sequences";

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
      select: {
        id: true,
        basicSalary: true,
        allowances: true,
        deductions: true,
      },
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

    // Create salary records one by one to generate unique salaryNo
    let createdCount = 0;
    for (const teacher of teachersToGenerate) {
      const salaryNo = await getNextSequenceValue("SALARY");
      const netSalary =
        teacher.basicSalary + teacher.allowances - teacher.deductions;

      await prisma.teacherSalary.create({
        data: {
          salaryNo,
          teacherId: teacher.id,
          month,
          year,
          basicSalary: teacher.basicSalary,
          allowances: teacher.allowances,
          deductions: teacher.deductions,
          bonus: 0,
          netSalary,
          balanceDue: netSalary,
          status: "PENDING",
          createdById: session.user.id,
        },
      });
      createdCount++;
    }

    return NextResponse.json({
      message: `Generated ${createdCount} salary records`,
      count: createdCount,
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
