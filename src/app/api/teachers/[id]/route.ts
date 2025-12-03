import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - Get single teacher by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_TEACHERS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
        salaries: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 12,
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("Teacher GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teacher" },
      { status: 500 }
    );
  }
}

// PUT - Update teacher
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_TEACHER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if teacher exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!existingTeacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Remove fields that shouldn't be updated directly
    const {
      employeeId,
      subjects,
      salaries,
      user,
      createdBy,
      updatedBy,
      ...updateData
    } = body;

    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        ...updateData,
        updatedById: session.user.id,
      },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    await logTransaction({
      action: "UPDATE",
      entityType: "Teacher",
      entityId: id,
      userId: session.user.id,
      details: {
        employeeId: teacher.employeeId,
        name: `${teacher.firstName} ${teacher.lastName}`,
      },
    });

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("Teacher PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update teacher" },
      { status: 500 }
    );
  }
}

// DELETE - Delete teacher
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.DELETE_TEACHER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            timetables: true,
            salaries: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Check if teacher has related records
    if (teacher._count.timetables > 0) {
      return NextResponse.json(
        { error: "Cannot delete teacher with assigned timetables" },
        { status: 400 }
      );
    }

    // Soft delete - just mark as inactive
    await prisma.teacher.update({
      where: { id },
      data: {
        isActive: false,
        status: "RESIGNED",
        statusReason: "Deleted by admin",
        updatedById: session.user.id,
      },
    });

    await logTransaction({
      action: "DELETE",
      entityType: "Teacher",
      entityId: id,
      userId: session.user.id,
      details: {
        employeeId: teacher.employeeId,
        name: `${teacher.firstName} ${teacher.lastName}`,
      },
    });

    return NextResponse.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Teacher DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete teacher" },
      { status: 500 }
    );
  }
}
