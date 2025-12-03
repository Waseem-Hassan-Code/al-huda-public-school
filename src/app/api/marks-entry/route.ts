import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// POST - Create or update marks for students
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
    const { examId, subjectId, totalMarks, marks } = body;

    if (!examId || !subjectId || !marks || !Array.isArray(marks)) {
      return NextResponse.json(
        { error: "examId, subjectId, and marks array are required" },
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

    // Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const subjectTotalMarks = totalMarks || exam.totalMarks || 100;

    // Process each mark - upsert (create if not exists, update if exists)
    const operations = marks.map((mark: any) =>
      prisma.studentMark.upsert({
        where: {
          examId_studentId_subjectId: {
            examId,
            studentId: mark.studentId,
            subjectId,
          },
        },
        create: {
          examId,
          studentId: mark.studentId,
          subjectId,
          totalMarks: subjectTotalMarks,
          marksObtained:
            mark.marksObtained !== null && mark.marksObtained !== ""
              ? parseFloat(mark.marksObtained)
              : null,
          isAbsent: mark.isAbsent || false,
          remarks: mark.remarks || null,
          enteredById: session.user.id,
        },
        update: {
          totalMarks: subjectTotalMarks,
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

    await prisma.$transaction(operations);

    // Calculate completion stats for this exam
    const totalStudentMarks = await prisma.studentMark.count({
      where: { examId },
    });

    const enteredMarks = await prisma.studentMark.count({
      where: {
        examId,
        OR: [{ marksObtained: { not: null } }, { isAbsent: true }],
      },
    });

    return NextResponse.json({
      message: "Marks saved successfully",
      saved: marks.length,
      completion: {
        total: totalStudentMarks,
        entered: enteredMarks,
        percentage:
          totalStudentMarks > 0
            ? Math.round((enteredMarks / totalStudentMarks) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Marks Entry POST Error:", error);
    return NextResponse.json(
      { error: "Failed to save marks" },
      { status: 500 }
    );
  }
}

// GET - Get marks for a student or exam
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
    const studentId = searchParams.get("studentId");
    const examId = searchParams.get("examId");
    const subjectId = searchParams.get("subjectId");

    const where: any = {};

    if (studentId) where.studentId = studentId;
    if (examId) where.examId = examId;
    if (subjectId) where.subjectId = subjectId;

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
            isPublished: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNo: true,
            rollNo: true,
            photo: true,
          },
        },
        enteredBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ exam: { name: "asc" } }, { subject: { name: "asc" } }],
    });

    // Calculate statistics if getting for a student
    if (studentId && marks.length > 0) {
      const totalMarks = marks.reduce((sum, m) => sum + (m.totalMarks || 0), 0);
      const obtainedMarks = marks.reduce(
        (sum, m) => sum + (m.marksObtained || 0),
        0
      );
      const percentage =
        totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

      return NextResponse.json({
        marks,
        stats: {
          totalSubjects: marks.length,
          totalMarks,
          obtainedMarks,
          percentage,
          absentCount: marks.filter((m) => m.isAbsent).length,
        },
      });
    }

    return NextResponse.json({ marks });
  } catch (error) {
    console.error("Marks Entry GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch marks" },
      { status: 500 }
    );
  }
}
