import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// GET - Get subjects for a class/section
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_CLASSES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    // Build where clause - only use classId and isActive for now
    const where: any = {
      classId,
      isActive: true,
    };

    const classSubjects = await prisma.classSubject.findMany({
      where,
      include: {
        subject: true,
        class: true,
      },
      orderBy: { subject: { name: "asc" } },
    });

    return NextResponse.json({ data: classSubjects });
  } catch (error) {
    console.error("Class Subjects GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch class subjects" },
      { status: 500 }
    );
  }
}

// POST - Add subjects to a class/section
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_CLASS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { classId, sectionId, subjects } = body;

    if (!classId || !subjects || !Array.isArray(subjects)) {
      return NextResponse.json(
        { error: "Class ID and subjects array are required" },
        { status: 400 }
      );
    }

    // Validate class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // If sectionId provided, validate section exists
    if (sectionId) {
      const sectionExists = await prisma.section.findUnique({
        where: { id: sectionId },
      });

      if (!sectionExists) {
        return NextResponse.json(
          { error: "Section not found" },
          { status: 404 }
        );
      }
    }

    // Create class subjects - find existing first then update or create
    const createdSubjects = [];
    for (const subject of subjects) {
      // Check if already exists
      const existing = await prisma.classSubject.findFirst({
        where: {
          classId,
          subjectId: subject.subjectId,
        },
      });

      let result;
      if (existing) {
        result = await prisma.classSubject.update({
          where: { id: existing.id },
          data: {
            isOptional: subject.isOptional || false,
            isActive: true,
          },
          include: { subject: true },
        });
      } else {
        result = await prisma.classSubject.create({
          data: {
            classId,
            subjectId: subject.subjectId,
            isOptional: subject.isOptional || false,
          },
          include: { subject: true },
        });
      }
      createdSubjects.push(result);
    }

    return NextResponse.json(
      { data: createdSubjects, message: "Subjects added successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Class Subjects POST Error:", error);
    return NextResponse.json(
      { error: "Failed to add subjects" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a subject from class/section
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_CLASS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Class Subject ID is required" },
        { status: 400 }
      );
    }

    await prisma.classSubject.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Subject removed successfully" });
  } catch (error) {
    console.error("Class Subjects DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to remove subject" },
      { status: 500 }
    );
  }
}
