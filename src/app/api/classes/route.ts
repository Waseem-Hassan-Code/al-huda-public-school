import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - List classes with sections
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        sections: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { name: "asc" },
        },
        subjects: {
          where: includeInactive ? {} : { isActive: true },
          include: {
            subject: true,
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({
      classes,
    });
  } catch (error) {
    console.error("Classes GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}

// POST - Create new class
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.CREATE_CLASS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, displayOrder, sections, subjects } = body;

    // Create class with sections and subjects
    const result = await prisma.$transaction(async (tx: any) => {
      const classRecord = await tx.class.create({
        data: {
          name,
          displayOrder: displayOrder || 0,
          isActive: true,
        },
      });

      // Create sections if provided
      if (sections && sections.length > 0) {
        await tx.section.createMany({
          data: sections.map((s: any) => ({
            name: s.name,
            classId: classRecord.id,
            capacity: s.capacity || 40,
            isActive: true,
          })),
        });
      }

      // Create subjects if provided
      if (subjects && subjects.length > 0) {
        await tx.subject.createMany({
          data: subjects.map((s: any) => ({
            name: s.name,
            code: s.code,
            classId: classRecord.id,
            isOptional: s.isOptional || false,
            totalMarks: s.totalMarks || 100,
            passingMarks: s.passingMarks || 33,
            isActive: true,
          })),
        });
      }

      return tx.class.findUnique({
        where: { id: classRecord.id },
        include: {
          sections: true,
          subjects: true,
        },
      });
    });

    // Log the transaction
    await logTransaction({
      action: "CREATE",
      entityType: "Class",
      entityId: result!.id,
      userId: session.user.id,
      details: { name },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Classes POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}
