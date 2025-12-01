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
          select: {
            id: true,
            name: true,
            capacity: true,
            isActive: true,
            classTeacherId: true,
            classTeacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
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

    // Transform subjects to flatten the structure
    const transformedClasses = classes.map((cls) => ({
      ...cls,
      subjects: cls.subjects.map((cs) => cs.subject),
    }));

    return NextResponse.json({
      classes: transformedClasses,
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

// PUT - Update class
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_CLASS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, displayOrder, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        sections: true,
        subjects: {
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
    });

    await logTransaction({
      action: "UPDATE",
      entityType: "CLASS",
      entityId: id,
      userId: session.user.id,
      details: { name: updatedClass.name },
    });

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error("Classes PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update class" },
      { status: 500 }
    );
  }
}

// DELETE - Delete class (only if no students)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.DELETE_CLASS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    // Check if there are students in this class
    const studentCount = await prisma.student.count({
      where: { classId: id },
    });

    if (studentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete class. There are ${studentCount} student(s) enrolled in this class. Please transfer or remove students first.`,
        },
        { status: 400 }
      );
    }

    // Get class name for logging before deletion
    const classToDelete = await prisma.class.findUnique({
      where: { id },
      select: { name: true },
    });

    // Delete related data in transaction
    await prisma.$transaction(async (tx: any) => {
      // Delete class subjects
      await tx.classSubject.deleteMany({
        where: { classId: id },
      });

      // Delete sections
      await tx.section.deleteMany({
        where: { classId: id },
      });

      // Delete the class
      await tx.class.delete({
        where: { id },
      });
    });

    await logTransaction({
      action: "DELETE",
      entityType: "CLASS",
      entityId: id,
      userId: session.user.id,
      details: { name: classToDelete?.name },
    });

    return NextResponse.json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("Classes DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 }
    );
  }
}
