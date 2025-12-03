import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// GET - Get single student mark
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_MARKS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const mark = await prisma.studentMark.findUnique({
      where: { id },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            examDate: true,
            totalMarks: true,
            passingMarks: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNo: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        enteredBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!mark) {
      return NextResponse.json({ error: "Mark not found" }, { status: 404 });
    }

    return NextResponse.json(mark);
  } catch (error) {
    console.error("StudentMark GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mark" },
      { status: 500 }
    );
  }
}

// PUT - Update student mark
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.ENTER_MARKS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { marksObtained, isAbsent, remarks } = body;

    // Get existing mark to validate
    const existingMark = await prisma.studentMark.findUnique({
      where: { id },
      include: { exam: true },
    });

    if (!existingMark) {
      return NextResponse.json({ error: "Mark not found" }, { status: 404 });
    }

    // Validate marks
    if (!isAbsent && marksObtained !== null && marksObtained !== undefined) {
      if (marksObtained < 0) {
        return NextResponse.json(
          { error: "Marks cannot be negative" },
          { status: 400 }
        );
      }
      if (marksObtained > existingMark.totalMarks) {
        return NextResponse.json(
          {
            error: `Marks cannot exceed total marks (${existingMark.totalMarks})`,
          },
          { status: 400 }
        );
      }
    }

    // Update the mark
    const updatedMark = await prisma.studentMark.update({
      where: { id },
      data: {
        marksObtained: isAbsent ? null : marksObtained,
        isAbsent: isAbsent || false,
        remarks,
        enteredById: session.user.id,
        updatedAt: new Date(),
      },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            examDate: true,
            totalMarks: true,
            passingMarks: true,
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
    });

    return NextResponse.json(updatedMark);
  } catch (error) {
    console.error("StudentMark PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update mark" },
      { status: 500 }
    );
  }
}

// DELETE - Delete student mark
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.ENTER_MARKS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if mark exists
    const existingMark = await prisma.studentMark.findUnique({
      where: { id },
    });

    if (!existingMark) {
      return NextResponse.json({ error: "Mark not found" }, { status: 404 });
    }

    await prisma.studentMark.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Mark deleted successfully" });
  } catch (error) {
    console.error("StudentMark DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete mark" },
      { status: 500 }
    );
  }
}
