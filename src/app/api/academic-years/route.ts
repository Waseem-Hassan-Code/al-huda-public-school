import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all academic years
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const academicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ data: academicYears });
  } catch (error) {
    console.error("Academic Years GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch academic years" },
      { status: 500 }
    );
  }
}

// POST - Create new academic year
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can create academic years
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, startDate, endDate, isCurrent } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    // If this will be the current session, deactivate all other current sessions
    if (isCurrent) {
      await prisma.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent || false,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: "Academic year created successfully",
      data: academicYear,
    });
  } catch (error) {
    console.error("Academic Years POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create academic year" },
      { status: 500 }
    );
  }
}

// PUT - Update academic year
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, startDate, endDate, isCurrent, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Academic year ID is required" },
        { status: 400 }
      );
    }

    // If setting this as current, deactivate all other current sessions
    if (isCurrent) {
      await prisma.academicYear.updateMany({
        where: { isCurrent: true, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    const academicYear = await prisma.academicYear.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isCurrent !== undefined && { isCurrent }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      message: "Academic year updated successfully",
      data: academicYear,
    });
  } catch (error) {
    console.error("Academic Years PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update academic year" },
      { status: 500 }
    );
  }
}

// DELETE - Delete academic year
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Academic year ID is required" },
        { status: 400 }
      );
    }

    // Check if this academic year has any associated data
    const hasStudents = await prisma.student.count({
      where: { academicYearId: id },
    });

    const hasExams = await prisma.exam.count({
      where: { academicYearId: id },
    });

    if (hasStudents > 0 || hasExams > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete academic year with associated students or exams. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    await prisma.academicYear.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Academic year deleted successfully",
    });
  } catch (error) {
    console.error("Academic Years DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete academic year" },
      { status: 500 }
    );
  }
}
