import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - Get student's subjects or optional subjects for a class/section
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const optionalOnly = searchParams.get("optionalOnly") === "true";

    // If studentId is provided, get the student's enrolled optional subjects
    if (studentId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });

      if (!currentYear) {
        return NextResponse.json(
          { error: "No active academic year" },
          { status: 400 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const studentSubjects = await (prisma as any).studentSubject.findMany({
        where: {
          studentId,
          academicYearId: currentYear.id,
          isActive: true,
        },
        include: {
          subject: true,
          classSubject: {
            include: {
              class: true,
            },
          },
        },
      });

      return NextResponse.json({ data: studentSubjects });
    }

    // If classId provided, get optional subjects available for that class/section
    if (classId) {
      const whereClause: Record<string, unknown> = {
        classId,
        isActive: true,
      };

      if (optionalOnly) {
        whereClause.isOptional = true;
      }

      // If sectionId provided, include section-specific subjects
      if (sectionId) {
        whereClause.OR = [
          { sectionId: null }, // Class-wide subjects
          { sectionId }, // Section-specific subjects
        ];
        delete whereClause.classId;
        whereClause.AND = [{ classId }];
      }

      const classSubjects = await prisma.classSubject.findMany({
        where: sectionId
          ? {
              classId,
              isActive: true,
              ...(optionalOnly ? { isOptional: true } : {}),
              OR: [{ sectionId: null }, { sectionId }],
            }
          : whereClause,
        include: {
          subject: true,
        },
        orderBy: [{ isOptional: "asc" }, { subject: { name: "asc" } }],
      });

      return NextResponse.json({ data: classSubjects });
    }

    return NextResponse.json(
      { error: "studentId or classId is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("StudentSubjects GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student subjects" },
      { status: 500 }
    );
  }
}

// POST - Enroll student in optional subject(s)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_STUDENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, subjectIds, classSubjectIds } = body;

    if (!studentId || (!subjectIds && !classSubjectIds)) {
      return NextResponse.json(
        { error: "studentId and subjectIds/classSubjectIds are required" },
        { status: 400 }
      );
    }

    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    if (!currentYear) {
      return NextResponse.json(
        { error: "No active academic year" },
        { status: 400 }
      );
    }

    // Get student to verify they exist
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true, section: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;

    // If classSubjectIds provided, use those directly
    if (classSubjectIds && classSubjectIds.length > 0) {
      const classSubjects = await prisma.classSubject.findMany({
        where: {
          id: { in: classSubjectIds },
          isOptional: true,
          isActive: true,
        },
      });

      const enrollments = await Promise.all(
        classSubjects.map((cs) =>
          prismaAny.studentSubject.upsert({
            where: {
              studentId_subjectId_academicYearId: {
                studentId,
                subjectId: cs.subjectId,
                academicYearId: currentYear.id,
              },
            },
            create: {
              studentId,
              subjectId: cs.subjectId,
              classSubjectId: cs.id,
              academicYearId: currentYear.id,
              isActive: true,
            },
            update: {
              isActive: true,
              classSubjectId: cs.id,
              droppedAt: null,
            },
          })
        )
      );

      await logTransaction({
        action: "CREATE",
        entityType: "StudentSubject",
        entityId: studentId,
        userId: session.user.id,
        details: { studentId, classSubjectIds, count: enrollments.length },
      });

      return NextResponse.json(
        { data: enrollments, message: "Subjects enrolled successfully" },
        { status: 201 }
      );
    }

    // If subjectIds provided
    if (subjectIds && subjectIds.length > 0) {
      const enrollments = await Promise.all(
        subjectIds.map((subjectId: string) =>
          prismaAny.studentSubject.upsert({
            where: {
              studentId_subjectId_academicYearId: {
                studentId,
                subjectId,
                academicYearId: currentYear.id,
              },
            },
            create: {
              studentId,
              subjectId,
              academicYearId: currentYear.id,
              isActive: true,
            },
            update: {
              isActive: true,
              droppedAt: null,
            },
          })
        )
      );

      await logTransaction({
        action: "CREATE",
        entityType: "StudentSubject",
        entityId: studentId,
        userId: session.user.id,
        details: { studentId, subjectIds, count: enrollments.length },
      });

      return NextResponse.json(
        { data: enrollments, message: "Subjects enrolled successfully" },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "No subjects provided" },
      { status: 400 }
    );
  } catch (error) {
    console.error("StudentSubjects POST Error:", error);
    return NextResponse.json(
      { error: "Failed to enroll subjects" },
      { status: 500 }
    );
  }
}

// DELETE - Remove student from optional subject
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_STUDENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;

    if (id) {
      // Delete by ID
      await prismaAny.studentSubject.update({
        where: { id },
        data: {
          isActive: false,
          droppedAt: new Date(),
        },
      });

      return NextResponse.json({ message: "Subject dropped successfully" });
    }

    if (studentId && subjectId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });

      if (!currentYear) {
        return NextResponse.json(
          { error: "No active academic year" },
          { status: 400 }
        );
      }

      await prismaAny.studentSubject.updateMany({
        where: {
          studentId,
          subjectId,
          academicYearId: currentYear.id,
        },
        data: {
          isActive: false,
          droppedAt: new Date(),
        },
      });

      return NextResponse.json({ message: "Subject dropped successfully" });
    }

    return NextResponse.json(
      { error: "id or (studentId and subjectId) is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("StudentSubjects DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to drop subject" },
      { status: 500 }
    );
  }
}

// PUT - Bulk update student subjects (e.g., assign to multiple students at once)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_STUDENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentIds, classSubjectId, action } = body;

    if (!studentIds || !classSubjectId || !action) {
      return NextResponse.json(
        { error: "studentIds, classSubjectId, and action are required" },
        { status: 400 }
      );
    }

    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    if (!currentYear) {
      return NextResponse.json(
        { error: "No active academic year" },
        { status: 400 }
      );
    }

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
    });

    if (!classSubject) {
      return NextResponse.json(
        { error: "Class subject not found" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;

    if (action === "enroll") {
      // Enroll multiple students in this subject
      const enrollments = await Promise.all(
        studentIds.map((studentId: string) =>
          prismaAny.studentSubject.upsert({
            where: {
              studentId_subjectId_academicYearId: {
                studentId,
                subjectId: classSubject.subjectId,
                academicYearId: currentYear.id,
              },
            },
            create: {
              studentId,
              subjectId: classSubject.subjectId,
              classSubjectId: classSubject.id,
              academicYearId: currentYear.id,
              isActive: true,
            },
            update: {
              isActive: true,
              classSubjectId: classSubject.id,
              droppedAt: null,
            },
          })
        )
      );

      await logTransaction({
        action: "UPDATE",
        entityType: "StudentSubject",
        entityId: classSubjectId,
        userId: session.user.id,
        details: {
          action: "bulk_enroll",
          studentIds,
          count: enrollments.length,
        },
      });

      return NextResponse.json({
        data: enrollments,
        message: `${enrollments.length} students enrolled`,
      });
    }

    if (action === "drop") {
      // Drop multiple students from this subject
      const result = await prismaAny.studentSubject.updateMany({
        where: {
          studentId: { in: studentIds },
          subjectId: classSubject.subjectId,
          academicYearId: currentYear.id,
        },
        data: {
          isActive: false,
          droppedAt: new Date(),
        },
      });

      await logTransaction({
        action: "UPDATE",
        entityType: "StudentSubject",
        entityId: classSubjectId,
        userId: session.user.id,
        details: { action: "bulk_drop", studentIds, count: result.count },
      });

      return NextResponse.json({
        message: `${result.count} students dropped from subject`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("StudentSubjects PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update student subjects" },
      { status: 500 }
    );
  }
}
