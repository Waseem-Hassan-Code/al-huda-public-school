import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - List all sections or sections by class
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId") || "";

    const where: Record<string, unknown> = {};

    if (classId) {
      where.classId = classId;
    }

    const sections = await prisma.section.findMany({
      where,
      orderBy: [{ class: { grade: "asc" } }, { name: "asc" }],
      include: {
        class: {
          select: { id: true, name: true, grade: true },
        },
        classTeacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { students: true },
        },
      },
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Failed to fetch sections:", error);
    return NextResponse.json(
      { error: "Failed to fetch sections" },
      { status: 500 }
    );
  }
}

// POST - Create a new section
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, classId, capacity, classTeacherId } = body;

    if (!name || !classId) {
      return NextResponse.json(
        { error: "Name and classId are required" },
        { status: 400 }
      );
    }

    // Check if class exists
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!existingClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check if section name already exists in this class
    const existingSection = await prisma.section.findFirst({
      where: {
        name,
        classId,
      },
    });

    if (existingSection) {
      return NextResponse.json(
        { error: "Section already exists in this class" },
        { status: 400 }
      );
    }

    const section = await prisma.section.create({
      data: {
        name,
        classId,
        capacity: capacity || 30,
        classTeacherId: classTeacherId || null,
      },
      include: {
        class: {
          select: { id: true, name: true },
        },
        classTeacher: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Failed to create section:", error);
    return NextResponse.json(
      { error: "Failed to create section" },
      { status: 500 }
    );
  }
}

// PUT - Update a section
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
        { error: "Section ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, capacity, classTeacherId } = body;

    // Check if section exists
    const existingSection = await prisma.section.findUnique({
      where: { id },
    });

    if (!existingSection) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Check if new name already exists in the same class
    if (name && name !== existingSection.name) {
      const nameExists = await prisma.section.findFirst({
        where: {
          name,
          classId: existingSection.classId,
          id: { not: id },
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: "Section name already exists in this class" },
          { status: 400 }
        );
      }
    }

    const section = await prisma.section.update({
      where: { id },
      data: {
        name: name || existingSection.name,
        capacity: capacity !== undefined ? capacity : existingSection.capacity,
        classTeacherId:
          classTeacherId !== undefined
            ? classTeacherId || null
            : existingSection.classTeacherId,
      },
      include: {
        class: {
          select: { id: true, name: true },
        },
        classTeacher: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Failed to update section:", error);
    return NextResponse.json(
      { error: "Failed to update section" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a section
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
        { error: "Section ID is required" },
        { status: 400 }
      );
    }

    // Check if section exists
    const existingSection = await prisma.section.findUnique({
      where: { id },
      include: {
        _count: { select: { students: true } },
      },
    });

    if (!existingSection) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Check if section has students
    if (existingSection._count.students > 0) {
      return NextResponse.json(
        { error: "Cannot delete section with enrolled students" },
        { status: 400 }
      );
    }

    await prisma.section.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Section deleted successfully" });
  } catch (error) {
    console.error("Failed to delete section:", error);
    return NextResponse.json(
      { error: "Failed to delete section" },
      { status: 500 }
    );
  }
}
