import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// GET - Get result card for a student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_MARKS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: studentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get("examId");
    const academicYearId = searchParams.get("academicYearId");

    // Get student details
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        section: true,
        academicYear: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!student.classId) {
      return NextResponse.json(
        { error: "Student is not assigned to a class" },
        { status: 400 }
      );
    }

    // Get all subjects for the student's class
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId: student.classId,
        isActive: true,
      },
      include: {
        subject: true,
      },
    });

    const totalSubjectsInClass = classSubjects.length;

    // Build query for exams
    const examWhere: any = {};
    if (examId) {
      examWhere.id = examId;
    }
    if (academicYearId) {
      examWhere.academicYearId = academicYearId;
    } else if (student.academicYearId) {
      examWhere.academicYearId = student.academicYearId;
    }

    // Get all exams for this class
    const exams = await prisma.exam.findMany({
      where: {
        ...examWhere,
        OR: [
          { classId: student.classId },
          { classId: null }, // School-wide exams
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Get all marks for this student
    const studentMarks = await prisma.studentMark.findMany({
      where: {
        studentId,
        examId: examId ? examId : { in: exams.map((e) => e.id) },
      },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            examType: true,
            totalMarks: true,
            passingMarks: true,
            isPublished: true,
            examDate: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ exam: { examDate: "desc" } }, { subject: { name: "asc" } }],
    });

    // Group marks by exam
    const resultsByExam: any[] = [];
    const examGroups = new Map<string, typeof studentMarks>();

    studentMarks.forEach((mark) => {
      const existing = examGroups.get(mark.examId);
      if (existing) {
        existing.push(mark);
      } else {
        examGroups.set(mark.examId, [mark]);
      }
    });

    // Process each exam
    for (const exam of exams) {
      const examMarks = examGroups.get(exam.id) || [];

      // Calculate stats
      const subjectsWithMarks = examMarks.filter(
        (m) => m.marksObtained !== null || m.isAbsent
      );
      const totalMarksSum = examMarks.reduce(
        (sum, m) => sum + (m.totalMarks || 0),
        0
      );
      const obtainedMarksSum = examMarks.reduce(
        (sum, m) => sum + (m.marksObtained || 0),
        0
      );
      const percentage =
        totalMarksSum > 0
          ? Math.round((obtainedMarksSum / totalMarksSum) * 100)
          : 0;

      // Determine if result is complete
      const isComplete =
        subjectsWithMarks.length >= totalSubjectsInClass ||
        (examMarks.length > 0 && subjectsWithMarks.length === examMarks.length);
      const isPending =
        examMarks.length === 0 || subjectsWithMarks.length < examMarks.length;

      // Calculate grade
      const grade = calculateGrade(percentage);

      // Determine pass/fail
      const passedSubjects = examMarks.filter(
        (m) =>
          m.marksObtained !== null &&
          m.marksObtained >= (exam.passingMarks || 33)
      ).length;
      const failedSubjects = examMarks.filter(
        (m) =>
          m.marksObtained !== null &&
          m.marksObtained < (exam.passingMarks || 33)
      ).length;
      const absentSubjects = examMarks.filter((m) => m.isAbsent).length;

      const isPassed =
        failedSubjects === 0 && absentSubjects === 0 && passedSubjects > 0;

      resultsByExam.push({
        exam: {
          id: exam.id,
          name: exam.name,
          examType: exam.examType,
          totalMarks: exam.totalMarks,
          passingMarks: exam.passingMarks,
          isPublished: exam.isPublished,
          examDate: exam.examDate,
        },
        status: {
          isComplete,
          isPending,
          isPassed,
          marksEntered: subjectsWithMarks.length,
          totalSubjects: totalSubjectsInClass,
          completionPercentage: Math.round(
            (subjectsWithMarks.length / totalSubjectsInClass) * 100
          ),
        },
        subjects: examMarks.map((mark) => ({
          id: mark.subject.id,
          name: mark.subject.name,
          code: mark.subject.code,
          totalMarks: mark.totalMarks,
          marksObtained: mark.marksObtained,
          isAbsent: mark.isAbsent,
          isPassed:
            mark.marksObtained !== null &&
            mark.marksObtained >= (exam.passingMarks || 33),
          remarks: mark.remarks,
        })),
        summary: {
          totalMarks: totalMarksSum,
          obtainedMarks: obtainedMarksSum,
          percentage,
          grade,
          passedSubjects,
          failedSubjects,
          absentSubjects,
        },
      });
    }

    // Overall stats across all exams
    const overallStats = {
      totalExams: resultsByExam.length,
      completedExams: resultsByExam.filter((r) => r.status.isComplete).length,
      pendingExams: resultsByExam.filter((r) => r.status.isPending).length,
      passedExams: resultsByExam.filter((r) => r.status.isPassed).length,
    };

    return NextResponse.json({
      student: {
        id: student.id,
        name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
        registrationNo: student.registrationNo,
        rollNo: student.rollNo,
        photo: student.photo,
        class: student.class?.name,
        section: student.section?.name,
        academicYear: student.academicYear?.name,
      },
      results: resultsByExam,
      overallStats,
      totalSubjectsInClass,
    });
  } catch (error) {
    console.error("Result Card GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch result card" },
      { status: 500 }
    );
  }
}

// Helper function to calculate grade
function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 33) return "E";
  return "F";
}

// PUT - Update individual marks for a student (for editing from profile)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.ENTER_MARKS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: studentId } = await params;
    const body = await request.json();
    const { examId, subjectId, marksObtained, isAbsent, remarks, totalMarks } =
      body;

    if (!examId || !subjectId) {
      return NextResponse.json(
        { error: "examId and subjectId are required" },
        { status: 400 }
      );
    }

    // Verify exam is not published
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

    // Upsert the mark
    const mark = await prisma.studentMark.upsert({
      where: {
        examId_studentId_subjectId: {
          examId,
          studentId,
          subjectId,
        },
      },
      create: {
        examId,
        studentId,
        subjectId,
        totalMarks: totalMarks || exam.totalMarks || 100,
        marksObtained:
          marksObtained !== null && marksObtained !== ""
            ? parseFloat(marksObtained)
            : null,
        isAbsent: isAbsent || false,
        remarks: remarks || null,
        enteredById: session.user.id,
      },
      update: {
        totalMarks: totalMarks || exam.totalMarks || 100,
        marksObtained:
          marksObtained !== null && marksObtained !== ""
            ? parseFloat(marksObtained)
            : null,
        isAbsent: isAbsent || false,
        remarks: remarks || null,
        enteredById: session.user.id,
        updatedAt: new Date(),
      },
      include: {
        subject: true,
        exam: true,
      },
    });

    return NextResponse.json({
      message: "Mark updated successfully",
      mark,
    });
  } catch (error) {
    console.error("Result Card PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update mark" },
      { status: 500 }
    );
  }
}
