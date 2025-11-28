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
      where.classes = {
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
          classes: {
            include: {
              class: {
                select: { id: true, name: true, grade: true },
              },
            },
          },
          teachers: {
            select: { id: true, name: true, lastName: true },
          },
        },
      }),
      prisma.subject.count({ where }),
    ]);

    return NextResponse.json({
      subjects: subjects.map((s: any) => ({
        ...s,
        classes: s.classes.map((c: any) => c.class),
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
    const { name, code, description, classIds } = body;

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
        description: description || null,
        classes: classIds?.length
          ? {
              create: classIds.map((classId: string) => ({ classId })),
            }
          : undefined,
      },
      include: {
        classes: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      subject: {
        ...subject,
        classes: subject.classes.map((c: any) => c.class),
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
    const { name, code, description, classIds } = body;

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!existingSubject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Check if new code already exists for different subject
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

    // Update subject with class relationships
    const subject = await prisma.$transaction(async (tx: any) => {
      // Delete existing class relationships
      if (classIds !== undefined) {
        await tx.classSubject.deleteMany({
          where: { subjectId: id },
        });
      }

      // Update subject
      return tx.subject.update({
        where: { id },
        data: {
          name: name || existingSubject.name,
          code: code || existingSubject.code,
          description:
            description !== undefined
              ? description
              : existingSubject.description,
          classes: classIds?.length
            ? {
                create: classIds.map((classId: string) => ({ classId })),
              }
            : undefined,
        },
        include: {
          classes: {
            include: {
              class: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    return NextResponse.json({
      subject: {
        ...subject,
        classes: subject.classes.map((c: any) => c.class),
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
    });

    if (!existingSubject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Delete subject (cascade will handle relations)
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
