import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// GET - List exam schedules
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_EXAMS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get("examId");

    if (!examId) {
      return NextResponse.json(
        { error: "Exam ID is required" },
        { status: 400 }
      );
    }

    const schedules = await prisma.examSchedule.findMany({
      where: { examId },
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
    });

    return NextResponse.json({ data: schedules });
  } catch (error) {
    console.error("Exam Schedules GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam schedules" },
      { status: 500 }
    );
  }
}

// POST - Create exam schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.CREATE_EXAM)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      examId,
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

    if (!examId || !subjectId || !examDate || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if exam exists
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check for duplicate schedule
    const existing = await prisma.examSchedule.findFirst({
      where: { examId, subjectId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This subject is already scheduled for this exam" },
        { status: 400 }
      );
    }

    const schedule = await prisma.examSchedule.create({
      data: {
        examId,
        subjectId,
        examDate: new Date(examDate),
        startTime,
        endTime,
        totalMarks: totalMarks || 100,
        passingMarks: passingMarks || 33,
        venue: venue || null,
        invigilatorId: invigilatorId || null,
        remarks: remarks || null,
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

    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch (error) {
    console.error("Exam Schedule POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create exam schedule" },
      { status: 500 }
    );
  }
}
