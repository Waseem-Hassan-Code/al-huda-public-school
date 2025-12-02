import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// GET - Get result card configuration for a class/section
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_EXAMS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get("examId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");

    if (examId) {
      // Get existing exam with subjects configuration
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: {
          class: true,
          section: true,
          subject: true,
          academicYear: true,
          studentMarks: {
            include: {
              student: true,
              subject: true,
            },
          },
        },
      });

      if (!exam) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }

      return NextResponse.json({ data: exam });
    }

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    // Get subjects for the class
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId,
        isActive: true,
      },
      include: {
        subject: true,
      },
      orderBy: { subject: { name: "asc" } },
    });

    // Build student where clause
    const studentWhere: any = {
      classId,
      status: "ACTIVE",
    };
    if (sectionId) {
      studentWhere.sectionId = sectionId;
    }

    // Get students in the class/section
    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: [{ rollNo: "asc" }, { firstName: "asc" }],
    });

    // Get current academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    return NextResponse.json({
      subjects: classSubjects,
      students,
      academicYear,
    });
  } catch (error) {
    console.error("Result Cards GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch result card data" },
      { status: 500 }
    );
  }
}

// POST - Trigger result cards for a class/section (create exam with subject configs)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.CREATE_EXAM)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      examType,
      classId,
      sectionId,
      subjects, // Array of { subjectId, totalMarks, passingMarks }
      examDate,
      startDate,
      endDate,
      remarks,
    } = body;

    if (!name || !examType || !classId || !sectionId || !subjects?.length) {
      return NextResponse.json(
        { error: "Name, exam type, class, section, and subjects are required" },
        { status: 400 }
      );
    }

    // Get current academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: "No active academic year found" },
        { status: 400 }
      );
    }

    // Get students in the section
    const students = await prisma.student.findMany({
      where: {
        classId,
        sectionId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    // Create exam record
    const exam = await prisma.exam.create({
      data: {
        name,
        examType,
        academicYearId: academicYear.id,
        classId,
        sectionId,
        examDate: examDate ? new Date(examDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        remarks,
        totalMarks: subjects.reduce(
          (sum: number, s: any) => sum + (s.totalMarks || 100),
          0
        ),
        passingMarks: subjects.reduce(
          (sum: number, s: any) => sum + (s.passingMarks || 33),
          0
        ),
        createdById: session.user.id,
      },
    });

    // Create student marks placeholders for all students and subjects
    const studentMarksData = [];
    for (const student of students) {
      for (const subject of subjects) {
        studentMarksData.push({
          examId: exam.id,
          studentId: student.id,
          subjectId: subject.subjectId,
          totalMarks: subject.totalMarks || 100,
          marksObtained: null,
          isAbsent: false,
          enteredById: session.user.id,
        });
      }
    }

    await prisma.studentMark.createMany({
      data: studentMarksData,
    });

    // Create exam result record (pending)
    await prisma.examResult.create({
      data: {
        examId: exam.id,
        academicYearId: academicYear.id,
        status: "PENDING",
        totalStudents: students.length,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(
      {
        data: exam,
        message: `Result cards triggered for ${students.length} students with ${subjects.length} subjects`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Result Cards POST Error:", error);
    return NextResponse.json(
      { error: "Failed to trigger result cards" },
      { status: 500 }
    );
  }
}
