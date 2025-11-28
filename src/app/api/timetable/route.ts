import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - Get timetable
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_TIMETABLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const teacherId = searchParams.get("teacherId");
    const dayOfWeek = searchParams.get("dayOfWeek");
    const academicYearId = searchParams.get("academicYearId");

    const where: Record<string, unknown> = { isActive: true };

    if (classId) {
      where.classId = classId;
    }

    if (sectionId) {
      where.sectionId = sectionId;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (dayOfWeek) {
      where.dayOfWeek = dayOfWeek;
    }

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const timetable = await prisma.timetable.findMany({
      where,
      include: {
        class: true,
        section: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
    });

    // Group by day if getting full timetable
    if (!dayOfWeek) {
      const days = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ];
      const grouped = timetable.reduce(
        (acc: Record<string, typeof timetable>, slot) => {
          const day = slot.dayOfWeek;
          if (!acc[day]) {
            acc[day] = [];
          }
          acc[day].push(slot);
          return acc;
        },
        {}
      );
      return NextResponse.json({ data: grouped, type: "grouped" });
    }

    return NextResponse.json({ data: timetable, type: "list" });
  } catch (error) {
    console.error("Timetable GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch timetable" },
      { status: 500 }
    );
  }
}

// POST - Create timetable entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.CREATE_TIMETABLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      academicYearId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      dayOfWeek,
      periodNo,
      startTime,
      endTime,
    } = body;

    // Validate required fields
    if (
      !academicYearId ||
      !classId ||
      !sectionId ||
      !subjectId ||
      !teacherId ||
      !dayOfWeek ||
      !periodNo ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check for conflicts - same section, day, and period
    const sectionConflict = await prisma.timetable.findFirst({
      where: {
        isActive: true,
        sectionId,
        dayOfWeek,
        periodNo,
      },
    });

    if (sectionConflict) {
      return NextResponse.json(
        { error: "This period is already assigned for this section" },
        { status: 400 }
      );
    }

    // Check for teacher conflict - same teacher, day, and period
    const teacherConflict = await prisma.timetable.findFirst({
      where: {
        isActive: true,
        teacherId,
        dayOfWeek,
        periodNo,
      },
    });

    if (teacherConflict) {
      return NextResponse.json(
        { error: "Teacher is already assigned to another class at this time" },
        { status: 400 }
      );
    }

    const timetableEntry = await prisma.timetable.create({
      data: {
        academicYearId,
        classId,
        sectionId,
        subjectId,
        teacherId,
        dayOfWeek,
        periodNo,
        startTime,
        endTime,
        isActive: true,
      },
      include: {
        class: true,
        section: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await logTransaction({
      action: "CREATE",
      entityType: "Timetable",
      entityId: timetableEntry.id,
      userId: session.user.id,
      details: { classId, sectionId, dayOfWeek, periodNo },
    });

    return NextResponse.json(timetableEntry, { status: 201 });
  } catch (error) {
    console.error("Timetable POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create timetable entry" },
      { status: 500 }
    );
  }
}

// PUT - Update timetable entry
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_TIMETABLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { subjectId, teacherId, startTime, endTime, isActive } = body;

    const existing = await prisma.timetable.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Timetable entry not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (subjectId !== undefined) updateData.subjectId = subjectId;
    if (teacherId !== undefined) updateData.teacherId = teacherId;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (isActive !== undefined) updateData.isActive = isActive;

    const timetableEntry = await prisma.timetable.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
        section: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await logTransaction({
      action: "UPDATE",
      entityType: "Timetable",
      entityId: id,
      userId: session.user.id,
      details: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json(timetableEntry);
  } catch (error) {
    console.error("Timetable PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update timetable entry" },
      { status: 500 }
    );
  }
}

// DELETE - Delete timetable entry
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.DELETE_TIMETABLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.timetable.delete({
      where: { id },
    });

    await logTransaction({
      action: "DELETE",
      entityType: "Timetable",
      entityId: id,
      userId: session.user.id,
      details: {},
    });

    return NextResponse.json({ message: "Timetable entry deleted" });
  } catch (error) {
    console.error("Timetable DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete timetable entry" },
      { status: 500 }
    );
  }
}
