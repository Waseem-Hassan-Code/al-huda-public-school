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
    const sectionId = searchParams.get("sectionId");
    const subjectId = searchParams.get("subjectId");
    const academicYearId = searchParams.get("academicYearId");
    const type = searchParams.get("type");
    const all = searchParams.get("all"); // If "true", return all exams regardless of session
    const includeSchedules = searchParams.get("includeSchedules") === "true";

    const where: Record<string, unknown> = {};

    if (classId) {
      where.classId = classId;
    }

    if (sectionId) {
      where.sectionId = sectionId;
    }

    if (subjectId) {
      where.subjectId = subjectId;
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
          select: {
            studentMarks: true,
            examResults: true,
          },
        },
        ...(includeSchedules && {
          examSchedules: {
            include: {
              subject: true,
              invigilator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { examDate: "asc" as const },
          },
        }),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ exams });
  } catch (error) {
    console.error("Exams GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exams" },
      { status: 500 }
    );
  }
}

// POST - Create exam for all subjects of a class
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

    // Create exam WITHOUT a specific subject - this is for all subjects of the class
    const exam = await prisma.exam.create({
      data: {
        name,
        examType,
        academicYearId: targetAcademicYearId,
        classId,
        sectionId: sectionId || null,
        subjectId: null, // No specific subject - exam covers all class subjects
        teacherId: null,
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create exam", details: errorMessage },
      { status: 500 }
    );
  }
}
