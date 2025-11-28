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

    const where: any = { isActive: true };

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
      where.dayOfWeek = parseInt(dayOfWeek);
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
            teacherId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    // Group by day if getting full timetable
    if (!dayOfWeek) {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const grouped = timetable.reduce((acc: any, slot: any) => {
        const day = days[slot.dayOfWeek];
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(slot);
        return acc;
      }, {});
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
      classId,
      sectionId,
      subjectId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      roomNumber,
    } = body;

    // Check for conflicts
    const conflict = await prisma.timetable.findFirst({
      where: {
        isActive: true,
        dayOfWeek,
        OR: [
          // Same class/section at same time
          {
            classId,
            sectionId,
            startTime: { lte: endTime },
            endTime: { gte: startTime },
          },
          // Same teacher at same time
          {
            teacherId,
            startTime: { lte: endTime },
            endTime: { gte: startTime },
          },
          // Same room at same time
          ...(roomNumber
            ? [
                {
                  roomNumber,
                  startTime: { lte: endTime },
                  endTime: { gte: startTime },
                },
              ]
            : []),
        ],
      },
    });

    if (conflict) {
      return NextResponse.json(
        {
          error:
            "Timetable conflict detected. Please check class, teacher, or room availability.",
        },
        { status: 400 }
      );
    }

    const timetableEntry = await prisma.timetable.create({
      data: {
        classId,
        sectionId,
        subjectId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        roomNumber,
        isActive: true,
      },
      include: {
        class: true,
        section: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            teacherId: true,
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
      details: { classId, sectionId, dayOfWeek, startTime, endTime },
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

// PUT - Bulk update timetable
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_TIMETABLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { classId, sectionId, entries } = body;

    // entries is array of { dayOfWeek, startTime, endTime, subjectId, teacherId, roomNumber }

    if (!classId || !sectionId || !entries) {
      return NextResponse.json(
        { error: "Class, section, and entries are required" },
        { status: 400 }
      );
    }

    // Delete existing timetable for this class/section
    await prisma.timetable.updateMany({
      where: { classId, sectionId },
      data: { isActive: false },
    });

    // Create new entries
    const created = await prisma.timetable.createMany({
      data: entries.map((entry: any) => ({
        classId,
        sectionId,
        subjectId: entry.subjectId,
        teacherId: entry.teacherId,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        roomNumber: entry.roomNumber,
        isActive: true,
      })),
    });

    await logTransaction({
      action: "UPDATE",
      entityType: "Timetable",
      entityId: `bulk-${classId}-${sectionId}`,
      userId: session.user.id,
      details: { classId, sectionId, entriesCount: entries.length },
    });

    return NextResponse.json({
      message: "Timetable updated successfully",
      entriesCreated: created.count,
    });
  } catch (error) {
    console.error("Timetable PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update timetable" },
      { status: 500 }
    );
  }
}
