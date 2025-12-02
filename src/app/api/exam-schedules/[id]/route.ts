import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// GET - Get single exam schedule
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

    const schedule = await prisma.examSchedule.findUnique({
      where: { id },
      include: {
        subject: true,
        invigilator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        exam: {
          include: {
            class: true,
            section: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Exam schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: schedule });
  } catch (error) {
    console.error("Exam Schedule GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam schedule" },
      { status: 500 }
    );
  }
}

// PUT - Update exam schedule
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
      subjectId,
      examDate,
      startTime,
      endTime,
      totalMarks,
      passingMarks,
      venue,
      invigilatorId,
      remarks,
    } = body;

    // Check if schedule exists
    const existing = await prisma.examSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Exam schedule not found" },
        { status: 404 }
      );
    }

    // Check for duplicate if subject is being changed
    if (subjectId && subjectId !== existing.subjectId) {
      const duplicate = await prisma.examSchedule.findFirst({
        where: {
          examId: existing.examId,
          subjectId,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "This subject is already scheduled for this exam" },
          { status: 400 }
        );
      }
    }

    const schedule = await prisma.examSchedule.update({
      where: { id },
      data: {
        subjectId: subjectId || existing.subjectId,
        examDate: examDate ? new Date(examDate) : existing.examDate,
        startTime: startTime || existing.startTime,
        endTime: endTime || existing.endTime,
        totalMarks: totalMarks ?? existing.totalMarks,
        passingMarks: passingMarks ?? existing.passingMarks,
        venue: venue !== undefined ? venue : existing.venue,
        invigilatorId:
          invigilatorId !== undefined ? invigilatorId : existing.invigilatorId,
        remarks: remarks !== undefined ? remarks : existing.remarks,
      },
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
    });

    return NextResponse.json({ data: schedule });
  } catch (error) {
    console.error("Exam Schedule PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update exam schedule" },
      { status: 500 }
    );
  }
}

// DELETE - Delete exam schedule
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

    // Check if schedule exists
    const existing = await prisma.examSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Exam schedule not found" },
        { status: 404 }
      );
    }

    await prisma.examSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Exam schedule deleted successfully" });
  } catch (error) {
    console.error("Exam Schedule DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete exam schedule" },
      { status: 500 }
    );
  }
}
