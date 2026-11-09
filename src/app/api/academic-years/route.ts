import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

async function requireManage() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!hasPermission(session.user.role as string, Permission.MANAGE_ACADEMIC_YEAR)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

// GET - List all academic years. ?withCounts=1 adds the number of students enrolled.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const withCounts = request.nextUrl.searchParams.get("withCounts") === "1";
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      ...(withCounts
        ? {
        include: {
          _count: {
            select: {
              students: { where: { status: { in: ["ACTIVE", "INACTIVE"] } } },
              feeStructures: true,
              exams: true,
            },
          },
        },
      }
        : {}),
    });

    return NextResponse.json({ data: academicYears });
  } catch (error) {
    console.error("Academic Years GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch academic years" }, { status: 500 });
  }
}

// POST - Create new academic year.
// Optional: copyFeeStructuresFromId copies that session's active fee structures
// into the new one (monthly fee generation only uses the active session's fees).
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireManage();
    if (error) return error;

    const body = await request.json();
    const { name, startDate, endDate, isCurrent, copyFeeStructuresFromId } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, start date and end date are required" }, { status: 400 });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json({ error: "End date must be after the start date" }, { status: 400 });
    }
    const duplicate = await prisma.academicYear.findFirst({ where: { name: name.trim() } });
    if (duplicate) {
      return NextResponse.json({ error: `A session named ${name.trim()} already exists` }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const makeCurrent = isCurrent || (await tx.academicYear.count({ where: { isCurrent: true } })) === 0;
      if (makeCurrent) {
        await tx.academicYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
      }

      const academicYear = await tx.academicYear.create({
        data: {
          name: name.trim(),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isCurrent: makeCurrent,
          isActive: true,
        },
      });

      let copiedFeeStructures = 0;
      if (copyFeeStructuresFromId) {
        const source = await tx.feeStructure.findMany({
          where: { academicYearId: copyFeeStructuresFromId, isActive: true },
        });
        if (source.length > 0) {
          const created = await tx.feeStructure.createMany({
            data: source.map(({ id: _id, createdAt: _c, updatedAt: _u, academicYearId: _a, ...rest }) => ({
              ...rest,
              academicYearId: academicYear.id,
            })),
          });
          copiedFeeStructures = created.count;
        }
      }
      return { academicYear, copiedFeeStructures };
    });

    return NextResponse.json({
      message: "Academic session created",
      data: result.academicYear,
      copiedFeeStructures: result.copiedFeeStructures,
    });
  } catch (error) {
    console.error("Academic Years POST Error:", error);
    return NextResponse.json({ error: "Failed to create academic year" }, { status: 500 });
  }
}

// PUT - Update academic year (rename, dates, make active, close/reopen)
export async function PUT(request: NextRequest) {
  try {
    const { error } = await requireManage();
    if (error) return error;

    const body = await request.json();
    const { id, name, startDate, endDate, isCurrent, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Academic year ID is required" }, { status: 400 });
    }

    const existing = await prisma.academicYear.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    if (isActive === false && (isCurrent ?? existing.isCurrent)) {
      return NextResponse.json(
        { error: "The active session can't be closed. Make another session active first." },
        { status: 400 }
      );
    }

    const academicYear = await prisma.$transaction(async (tx) => {
      if (isCurrent) {
        await tx.academicYear.updateMany({
          where: { isCurrent: true, id: { not: id } },
          data: { isCurrent: false },
        });
      }
      return tx.academicYear.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(isCurrent !== undefined && { isCurrent }),
          // Making a session active also reopens it
          ...(isCurrent ? { isActive: true } : isActive !== undefined ? { isActive } : {}),
        },
      });
    });

    return NextResponse.json({ message: "Academic session updated", data: academicYear });
  } catch (error) {
    console.error("Academic Years PUT Error:", error);
    return NextResponse.json({ error: "Failed to update academic year" }, { status: 500 });
  }
}

// DELETE - Delete academic year (only when nothing is attached to it)
export async function DELETE(request: NextRequest) {
  try {
    const { error } = await requireManage();
    if (error) return error;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Academic year ID is required" }, { status: 400 });
    }

    const [students, exams, feeStructures, timetables] = await Promise.all([
      prisma.student.count({ where: { academicYearId: id } }),
      prisma.exam.count({ where: { academicYearId: id } }),
      prisma.feeStructure.count({ where: { academicYearId: id } }),
      prisma.timetable.count({ where: { academicYearId: id } }),
    ]);

    if (students + exams + feeStructures + timetables > 0) {
      return NextResponse.json(
        {
          error:
            "This session has students, exams, fee structures or timetables attached, so it can't be deleted. Close it instead.",
        },
        { status: 400 }
      );
    }

    await prisma.academicYear.delete({ where: { id } });
    return NextResponse.json({ message: "Academic session deleted" });
  } catch (error) {
    console.error("Academic Years DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete academic year" }, { status: 500 });
  }
}
