import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - Get exam results
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_RESULTS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get("examId");
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");

    const where: any = {};

    if (examId) {
      where.examId = examId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (classId) {
      where.student = { classId };
    }

    if (sectionId) {
      where.student = { ...where.student, sectionId };
    }

    const results = await prisma.examResult.findMany({
      where,
      include: {
        exam: true,
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            class: true,
            section: true,
          },
        },
        subject: true,
      },
      orderBy: [
        { exam: { examDate: "desc" } },
        { student: { firstName: "asc" } },
      ],
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Results GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}

// POST - Enter exam results (bulk)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.ENTER_MARKS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { examId, subjectId, results } = body;

    // results is array of { studentId, marksObtained, remarks }

    if (!examId || !subjectId || !results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "Exam ID, Subject ID, and results are required" },
        { status: 400 }
      );
    }

    // Get exam and subject details for validation
    const [exam, subject] = await Promise.all([
      prisma.exam.findUnique({ where: { id: examId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
    ]);

    if (!exam || !subject) {
      return NextResponse.json(
        { error: "Exam or Subject not found" },
        { status: 404 }
      );
    }

    // Upsert results
    const savedResults = await Promise.all(
      results.map(async (result: any) => {
        const { studentId, marksObtained, remarks } = result;

        // Validate marks
        if (marksObtained > subject.totalMarks) {
          throw new Error(
            `Marks for student ${studentId} exceed total marks (${subject.totalMarks})`
          );
        }

        // Calculate grade
        const percentage = (marksObtained / subject.totalMarks) * 100;
        let grade = "F";
        if (percentage >= 90) grade = "A+";
        else if (percentage >= 80) grade = "A";
        else if (percentage >= 70) grade = "B";
        else if (percentage >= 60) grade = "C";
        else if (percentage >= 50) grade = "D";
        else if (percentage >= subject.passingMarks) grade = "E";

        const isPassing = marksObtained >= subject.passingMarks;

        // Check for existing result
        const existing = await prisma.examResult.findFirst({
          where: { examId, subjectId, studentId },
        });

        if (existing) {
          return prisma.examResult.update({
            where: { id: existing.id },
            data: {
              marksObtained,
              grade,
              isPassing,
              remarks,
            },
          });
        } else {
          return prisma.examResult.create({
            data: {
              examId,
              subjectId,
              studentId,
              marksObtained,
              totalMarks: subject.totalMarks,
              grade,
              isPassing,
              remarks,
            },
          });
        }
      })
    );

    await logTransaction({
      action: "CREATE",
      entityType: "ExamResult",
      entityId: `bulk-${examId}-${subjectId}`,
      userId: session.user.id,
      details: {
        examId,
        subjectId,
        recordsCount: savedResults.length,
      },
    });

    return NextResponse.json({
      message: "Results saved successfully",
      data: savedResults,
    });
  } catch (error: any) {
    console.error("Results POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save results" },
      { status: 500 }
    );
  }
}
