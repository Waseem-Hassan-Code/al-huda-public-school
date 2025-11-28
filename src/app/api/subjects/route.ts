import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - List all subjects
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const classId = searchParams.get("classId") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    if (classId) {
      where.classSubjects = {
        some: { classId },
      };
    }

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          classSubjects: {
            include: {
              class: {
                select: { id: true, name: true, displayOrder: true },
              },
            },
          },
          teacherSubjects: {
            include: {
              teacher: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      prisma.subject.count({ where }),
    ]);

    return NextResponse.json({
      subjects: subjects.map((s) => ({
        ...s,
        classes: s.classSubjects.map((cs) => cs.class),
        teachers: s.teacherSubjects.map((ts) => ts.teacher),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch subjects:", error);
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}

// POST - Create a new subject
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, nameUrdu, description, classIds } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingSubject = await prisma.subject.findUnique({
      where: { code },
    });

    if (existingSubject) {
      return NextResponse.json(
        { error: "Subject code already exists" },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        nameUrdu,
        description: description || null,
      },
    });

    // Create class-subject associations if classIds provided
    if (classIds?.length) {
      await prisma.classSubject.createMany({
        data: classIds.map((classId: string) => ({
          classId,
          subjectId: subject.id,
        })),
      });
    }

    // Fetch updated subject with relations
    const updatedSubject = await prisma.subject.findUnique({
      where: { id: subject.id },
      include: {
        classSubjects: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      subject: {
        ...updatedSubject,
        classes: updatedSubject?.classSubjects.map((cs) => cs.class) || [],
      },
    });
  } catch (error) {
    console.error("Failed to create subject:", error);
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    );
  }
}

// PUT - Update a subject
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Subject ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, code, nameUrdu, description, classIds, isActive } = body;

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!existingSubject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Check if new code already exists
    if (code && code !== existingSubject.code) {
      const codeExists = await prisma.subject.findUnique({
        where: { code },
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Subject code already exists" },
          { status: 400 }
        );
      }
    }

    // Update subject
    const subject = await prisma.subject.update({
      where: { id },
      data: {
        name: name || existingSubject.name,
        code: code || existingSubject.code,
        nameUrdu: nameUrdu !== undefined ? nameUrdu : existingSubject.nameUrdu,
        description:
          description !== undefined ? description : existingSubject.description,
        isActive: isActive !== undefined ? isActive : existingSubject.isActive,
      },
    });

    // Update class associations if classIds provided
    if (classIds !== undefined) {
      // Remove existing associations
      await prisma.classSubject.deleteMany({
        where: { subjectId: id },
      });

      // Create new associations
      if (classIds.length > 0) {
        await prisma.classSubject.createMany({
          data: classIds.map((classId: string) => ({
            classId,
            subjectId: id,
          })),
        });
      }
    }

    // Fetch updated subject with relations
    const updatedSubject = await prisma.subject.findUnique({
      where: { id },
      include: {
        classSubjects: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      subject: {
        ...updatedSubject,
        classes: updatedSubject?.classSubjects.map((cs) => cs.class) || [],
      },
    });
  } catch (error) {
    console.error("Failed to update subject:", error);
    return NextResponse.json(
      { error: "Failed to update subject" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a subject
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Subject ID is required" },
        { status: 400 }
      );
    }

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: { timetables: true, studentMarks: true },
        },
      },
    });

    if (!existingSubject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Check if subject has related data
    if (
      existingSubject._count.timetables > 0 ||
      existingSubject._count.studentMarks > 0
    ) {
      return NextResponse.json(
        {
          error: "Cannot delete subject with existing timetable or exam data",
        },
        { status: 400 }
      );
    }

    // Delete class associations first
    await prisma.classSubject.deleteMany({
      where: { subjectId: id },
    });

    // Delete teacher associations
    await prisma.teacherSubject.deleteMany({
      where: { subjectId: id },
    });

    // Delete subject
    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.error("Failed to delete subject:", error);
    return NextResponse.json(
      { error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}
