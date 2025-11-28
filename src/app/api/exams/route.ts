import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - List exams
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
    const classId = searchParams.get("classId");
    const academicYear = searchParams.get("academicYear");
    const type = searchParams.get("type");

    const where: any = {};

    if (classId) {
      where.classId = classId;
    }

    if (academicYear) {
      where.academicYear = academicYear;
    }

    if (type) {
      where.examType = type;
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        class: true,
        _count: {
          select: { results: true },
        },
      },
      orderBy: { examDate: "desc" },
    });

    return NextResponse.json({ data: exams });
  } catch (error) {
    console.error("Exams GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exams" },
      { status: 500 }
    );
  }
}

// POST - Create exam
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
    const { name, examType, classId, examDate, academicYear, description } =
      body;

    const exam = await prisma.exam.create({
      data: {
        name,
        examType,
        classId,
        examDate: new Date(examDate),
        academicYear,
        description,
        isPublished: false,
      },
      include: {
        class: true,
      },
    });

    await logTransaction({
      action: "CREATE",
      entityType: "Exam",
      entityId: exam.id,
      userId: session.user.id,
      details: { name, examType, classId },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    console.error("Exams POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create exam" },
      { status: 500 }
    );
  }
}
