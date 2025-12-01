import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - List exams
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
    const classId = searchParams.get("classId");
    const academicYearId = searchParams.get("academicYearId");
    const type = searchParams.get("type");
    const all = searchParams.get("all"); // If "true", return all exams regardless of session

    const where: Record<string, unknown> = {};

    if (classId) {
      where.classId = classId;
    }

    if (academicYearId) {
      where.academicYearId = academicYearId;
    } else if (all !== "true") {
      // Default to current academic year if not specified
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      if (currentYear) {
        where.academicYearId = currentYear.id;
      }
    }

    if (type) {
      where.examType = type;
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        class: true,
        section: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        academicYear: true,
        _count: {
          select: { studentMarks: true, examResults: true },
        },
      },
      orderBy: { examDate: "desc" },
    });

    return NextResponse.json({ data: exams });
  } catch (error) {
    console.error("Exams GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exams" },
      { status: 500 }
    );
  }
}

// POST - Create exam
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
      academicYearId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      totalMarks,
      passingMarks,
      examDate,
      startDate,
      endDate,
      remarks,
    } = body;

    // Get the academic year - use provided or default to current
    let targetAcademicYearId = academicYearId;
    if (!targetAcademicYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      if (!currentYear) {
        return NextResponse.json(
          {
            error:
              "No active academic session found. Please create one in settings.",
          },
          { status: 400 }
        );
      }
      targetAcademicYearId = currentYear.id;
    }

    if (!name || !examType || !classId) {
      return NextResponse.json(
        { error: "Name, examType, and classId are required" },
        { status: 400 }
      );
    }

    const exam = await prisma.exam.create({
      data: {
        name,
        examType,
        academicYearId: targetAcademicYearId,
        classId,
        sectionId,
        subjectId,
        teacherId,
        totalMarks: totalMarks || 100,
        passingMarks: passingMarks || 33,
        examDate: examDate ? new Date(examDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        remarks,
        isPublished: false,
        createdById: session.user.id,
      },
      include: {
        class: true,
        section: true,
        subject: true,
        academicYear: true,
      },
    });

    await logTransaction({
      action: "CREATE",
      entityType: "Exam",
      entityId: exam.id,
      userId: session.user.id,
      details: { name, examType, classId },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    console.error("Exams POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create exam" },
      { status: 500 }
    );
  }
}
