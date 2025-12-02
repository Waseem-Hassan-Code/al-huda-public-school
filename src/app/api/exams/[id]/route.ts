import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// GET - Get single exam
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_EXAMS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const exam = await prisma.exam.findUnique({
      where: { id },
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
          orderBy: { examDate: "asc" },
        },
        _count: {
          select: { studentMarks: true, examResults: true },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ data: exam });
  } catch (error) {
    console.error("Exam GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam" },
      { status: 500 }
    );
  }
}

// PUT - Update exam
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_EXAM)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      examType,
      classId,
      sectionId,
      subjectId,
      teacherId,
      totalMarks,
      passingMarks,
      startDate,
      endDate,
      examDate,
      remarks,
      isPublished,
    } = body;

    // Check if exam exists
    const existing = await prisma.exam.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        examType: examType ?? existing.examType,
        classId: classId ?? existing.classId,
        sectionId: sectionId !== undefined ? sectionId : existing.sectionId,
        subjectId: subjectId !== undefined ? subjectId : existing.subjectId,
        teacherId: teacherId !== undefined ? teacherId : existing.teacherId,
        totalMarks: totalMarks ?? existing.totalMarks,
        passingMarks: passingMarks ?? existing.passingMarks,
        startDate:
          startDate !== undefined
            ? startDate
              ? new Date(startDate)
              : null
            : existing.startDate,
        endDate:
          endDate !== undefined
            ? endDate
              ? new Date(endDate)
              : null
            : existing.endDate,
        examDate:
          examDate !== undefined
            ? examDate
              ? new Date(examDate)
              : null
            : existing.examDate,
        remarks: remarks !== undefined ? remarks : existing.remarks,
        isPublished:
          isPublished !== undefined ? isPublished : existing.isPublished,
      },
      include: {
        class: true,
        section: true,
        subject: true,
        academicYear: true,
      },
    });

    return NextResponse.json({ data: exam });
  } catch (error) {
    console.error("Exam PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update exam" },
      { status: 500 }
    );
  }
}

// DELETE - Delete exam
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.DELETE_EXAM)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if exam exists
    const existing = await prisma.exam.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Delete exam (cascades to schedules and marks)
    await prisma.exam.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Exam deleted successfully" });
  } catch (error) {
    console.error("Exam DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete exam" },
      { status: 500 }
    );
  }
}
