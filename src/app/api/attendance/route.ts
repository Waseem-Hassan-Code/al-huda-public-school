import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import { notifyAttendanceMarked } from "@/lib/notifications";

// GET - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_ATTENDANCE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const studentId = searchParams.get("studentId");

    const where: any = {};

    if (classId) {
      where.student = { classId };
    }

    if (sectionId) {
      where.student = { ...where.student, sectionId };
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (date) {
      const targetDate = new Date(date);
      where.date = {
        gte: new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate()
        ),
        lt: new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate() + 1
        ),
      };
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            registrationNo: true,
            firstName: true,
            lastName: true,
            section: {
              include: {
                class: true,
              },
            },
          },
        },
        markedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ date: "desc" }],
    });

    // Group by date if getting multiple dates
    if (!date && (startDate || endDate)) {
      const grouped = attendance.reduce((acc: any, record: any) => {
        const dateKey = record.date.toISOString().split("T")[0];
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(record);
        return acc;
      }, {});
      return NextResponse.json({ data: grouped, type: "grouped" });
    }

    return NextResponse.json({ data: attendance, type: "list" });
  } catch (error) {
    console.error("Attendance GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

// POST - Mark attendance (bulk)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.MARK_ATTENDANCE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { date, classId, sectionId, attendance } = body;

    // attendance is array of { studentId, status, remarks }

    if (!date || !attendance || !Array.isArray(attendance)) {
      return NextResponse.json(
        { error: "Date and attendance records are required" },
        { status: 400 }
      );
    }

    if (!sectionId) {
      return NextResponse.json(
        { error: "Section ID is required" },
        { status: 400 }
      );
    }

    // Check if the user is allowed to mark attendance for this section
    // Admins can mark attendance for any section
    // Teachers can only mark attendance for sections where they are the class teacher
    if (session.user.role === "TEACHER") {
      // Get teacher record for this user
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      // Check if this teacher is the class teacher of the section
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
        select: {
          classTeacherId: true,
          name: true,
          class: { select: { name: true } },
        },
      });

      if (!section) {
        return NextResponse.json(
          { error: "Section not found" },
          { status: 404 }
        );
      }

      if (section.classTeacherId !== teacher.id) {
        return NextResponse.json(
          {
            error: `Only the class teacher can mark attendance for ${section.class.name} - ${section.name}. Please contact the class teacher or an administrator.`,
          },
          { status: 403 }
        );
      }
    }

    const targetDate = new Date(date);

    // Use upsert to handle both new and existing records
    const results = await Promise.all(
      attendance.map(async (record: any) => {
        const { studentId, status, remarks } = record;

        // Find existing attendance for this student on this date
        const existing = await prisma.attendance.findFirst({
          where: {
            studentId,
            date: {
              gte: new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                targetDate.getDate()
              ),
              lt: new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                targetDate.getDate() + 1
              ),
            },
          },
        });

        if (existing) {
          // Update existing record
          return prisma.attendance.update({
            where: { id: existing.id },
            data: {
              status,
              remarks,
              markedById: session.user.id,
            },
          });
        } else {
          // Get student's section
          const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { sectionId: true },
          });

          if (!student?.sectionId) {
            throw new Error(`Student ${studentId} has no section assigned`);
          }

          // Create new record
          return prisma.attendance.create({
            data: {
              studentId,
              sectionId: student.sectionId,
              date: targetDate,
              status,
              remarks,
              markedById: session.user.id,
            },
          });
        }
      })
    );

    // Log the transaction
    await logTransaction({
      action: "CREATE",
      entityType: "Attendance",
      entityId: `bulk-${date}`,
      userId: session.user.id,
      details: {
        date,
        classId,
        sectionId,
        recordsCount: results.length,
      },
    });

    // Calculate summary
    const summary = {
      total: results.length,
      present: results.filter((r: any) => r.status === "PRESENT").length,
      absent: results.filter((r: any) => r.status === "ABSENT").length,
      late: results.filter((r: any) => r.status === "LATE").length,
      leave: results.filter((r: any) => r.status === "LEAVE").length,
      halfDay: results.filter((r: any) => r.status === "HALF_DAY").length,
    };

    // Send notification for attendance submission
    try {
      // Get class and section names
      const sectionInfo = await prisma.section.findUnique({
        where: { id: sectionId },
        include: {
          class: { select: { name: true } },
        },
      });

      if (sectionInfo) {
        await notifyAttendanceMarked(
          sectionInfo.class.name,
          sectionInfo.name,
          date,
          {
            total: summary.total,
            present: summary.present,
            absent: summary.absent,
            late: summary.late,
          },
          session.user.id
        );
      }
    } catch (notifyError) {
      // Don't fail the request if notification fails
      console.error("Failed to send attendance notification:", notifyError);
    }

    return NextResponse.json({
      message: "Attendance marked successfully",
      summary,
      data: results,
    });
  } catch (error) {
    console.error("Attendance POST Error:", error);
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 }
    );
  }
}
