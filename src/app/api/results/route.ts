import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - Get student marks/results
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
    const subjectId = searchParams.get("subjectId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");

    const where: any = {};

    if (examId) {
      where.examId = examId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    if (classId || sectionId) {
      where.student = {};
      if (classId) where.student.classId = classId;
      if (sectionId) where.student.sectionId = sectionId;
    }

    const marks = await prisma.studentMark.findMany({
      where,
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            examType: true,
            totalMarks: true,
            passingMarks: true,
            examDate: true,
          },
        },
        student: {
          select: {
            id: true,
            registrationNo: true,
            name: true,
            lastName: true,
            classId: true,
            sectionId: true,
            section: {
              include: { class: true },
            },
          },
        },
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        enteredBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ exam: { examDate: "desc" } }, { student: { name: "asc" } }],
    });

    // Add calculated fields
    const resultsWithGrades = marks.map((mark) => {
      const percentage = mark.marksObtained
        ? (mark.marksObtained / mark.totalMarks) * 100
        : 0;
      let grade = "F";
      if (mark.isAbsent) grade = "AB";
      else if (percentage >= 90) grade = "A+";
      else if (percentage >= 80) grade = "A";
      else if (percentage >= 70) grade = "B";
      else if (percentage >= 60) grade = "C";
      else if (percentage >= 50) grade = "D";
      else if (percentage >= 33) grade = "E";

      const isPassing =
        !mark.isAbsent &&
        mark.marksObtained !== null &&
        mark.marksObtained >= mark.exam.passingMarks;

      return {
        ...mark,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        isPassing,
      };
    });

    return NextResponse.json({ data: resultsWithGrades });
  } catch (error) {
    console.error("Results GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}

// POST - Enter student marks (bulk)
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
    const { examId, subjectId, marks } = body;

    // marks is array of { studentId, marksObtained, isAbsent, remarks }

    if (!examId || !subjectId || !marks || !Array.isArray(marks)) {
      return NextResponse.json(
        { error: "Exam ID, Subject ID, and marks are required" },
        { status: 400 }
      );
    }

    // Get exam details for validation
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { totalMarks: true, passingMarks: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Upsert marks
    const savedMarks = await Promise.all(
      marks.map(async (mark: any) => {
        const { studentId, marksObtained, isAbsent, remarks } = mark;

        // Validate marks
        if (
          !isAbsent &&
          marksObtained !== null &&
          marksObtained > exam.totalMarks
        ) {
          throw new Error(
            `Marks for student ${studentId} exceed total marks (${exam.totalMarks})`
          );
        }

        // Upsert using unique constraint
        return prisma.studentMark.upsert({
          where: {
            examId_studentId_subjectId: {
              examId,
              studentId,
              subjectId,
            },
          },
          update: {
            marksObtained: isAbsent ? null : marksObtained,
            isAbsent: isAbsent || false,
            remarks,
            enteredById: session.user.id,
          },
          create: {
            examId,
            studentId,
            subjectId,
            marksObtained: isAbsent ? null : marksObtained,
            totalMarks: exam.totalMarks,
            isAbsent: isAbsent || false,
            remarks,
            enteredById: session.user.id,
          },
        });
      })
    );

    await logTransaction({
      action: "CREATE",
      entityType: "StudentMark",
      entityId: `bulk-${examId}-${subjectId}`,
      userId: session.user.id,
      details: {
        examId,
        subjectId,
        recordsCount: savedMarks.length,
      },
    });

    return NextResponse.json({
      message: "Marks entered successfully",
      count: savedMarks.length,
    });
  } catch (error) {
    console.error("Results POST Error:", error);
    return NextResponse.json(
      { error: "Failed to enter marks" },
      { status: 500 }
    );
  }
}
