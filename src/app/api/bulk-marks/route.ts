import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// GET - Get marks for a specific exam and subject (for bulk entry)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_MARKS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get("examId");
    const subjectId = searchParams.get("subjectId");

    if (!examId) {
      return NextResponse.json(
        { error: "Exam ID is required" },
        { status: 400 }
      );
    }

    // Get exam details
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        class: true,
        section: true,
        academicYear: true,
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Build where clause for marks
    const where: any = { examId };
    if (subjectId) {
      where.subjectId = subjectId;
    }

    // Get student marks with student details
    const studentMarks = await prisma.studentMark.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            registrationNo: true,
            rollNo: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
        subject: true,
      },
      orderBy: [
        { student: { rollNo: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });

    // Get subjects in this exam
    const subjectsInExam = await prisma.studentMark.findMany({
      where: { examId },
      select: { subjectId: true, totalMarks: true },
      distinct: ["subjectId"],
    });

    const subjectIds = subjectsInExam.map((s) => s.subjectId);
    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
    });

    // Add totalMarks to each subject
    const subjectsWithMarks = subjects.map((subject) => {
      const markConfig = subjectsInExam.find((s) => s.subjectId === subject.id);
      return {
        ...subject,
        totalMarks: markConfig?.totalMarks || 100,
      };
    });

    return NextResponse.json({
      exam,
      subjects: subjectsWithMarks,
      studentMarks,
    });
  } catch (error) {
    console.error("Bulk Marks GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch marks data" },
      { status: 500 }
    );
  }
}

// PUT - Update marks in bulk for an exam/subject
export async function PUT(request: NextRequest) {
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

    if (!examId || !subjectId || !marks || !Array.isArray(marks)) {
      return NextResponse.json(
        { error: "Exam ID, Subject ID, and marks array are required" },
        { status: 400 }
      );
    }

    // Verify exam exists and is not published
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (exam.isPublished) {
      return NextResponse.json(
        { error: "Cannot update marks for a published exam" },
        { status: 400 }
      );
    }

    // Update marks in transaction
    const updates = marks.map((mark: any) =>
      prisma.studentMark.updateMany({
        where: {
          examId,
          studentId: mark.studentId,
          subjectId,
        },
        data: {
          marksObtained:
            mark.marksObtained !== null && mark.marksObtained !== ""
              ? parseFloat(mark.marksObtained)
              : null,
          isAbsent: mark.isAbsent || false,
          remarks: mark.remarks || null,
          enteredById: session.user.id,
          updatedAt: new Date(),
        },
      })
    );

    await prisma.$transaction(updates);

    // Calculate completion status
    const totalMarksCount = await prisma.studentMark.count({
      where: { examId },
    });

    const enteredMarksCount = await prisma.studentMark.count({
      where: {
        examId,
        OR: [{ marksObtained: { not: null } }, { isAbsent: true }],
      },
    });

    const completionPercentage = Math.round(
      (enteredMarksCount / totalMarksCount) * 100
    );

    return NextResponse.json({
      message: "Marks updated successfully",
      completion: {
        total: totalMarksCount,
        entered: enteredMarksCount,
        percentage: completionPercentage,
      },
    });
  } catch (error) {
    console.error("Bulk Marks PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update marks" },
      { status: 500 }
    );
  }
}
