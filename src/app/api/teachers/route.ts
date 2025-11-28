import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { getNextSequenceValue } from "@/lib/sequences";
import { logTransaction } from "@/lib/transaction-log";
import bcrypt from "bcryptjs";

// GET - List teachers with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_TEACHERS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { teacherId: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { cnic: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        include: {
          teacherSubjects: {
            include: {
              subject: true,
              class: true,
              section: true,
            },
          },
          _count: {
            select: {
              timetables: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.teacher.count({ where }),
    ]);

    return NextResponse.json({
      data: teachers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Teachers GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teachers" },
      { status: 500 }
    );
  }
}

// POST - Create new teacher
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.CREATE_TEACHER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      cnic,
      phone,
      email,
      address,
      city,
      photo,
      qualification,
      experience,
      joiningDate,
      baseSalary,
      subjects, // Array of { classId, sectionId, subjectId }
    } = body;

    // Generate teacher ID
    const teacherId = await getNextSequenceValue("TEACHER");

    // Create teacher in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create teacher
      const teacher = await tx.teacher.create({
        data: {
          teacherId,
          firstName,
          lastName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender,
          cnic,
          phone,
          email,
          address,
          city,
          photo,
          qualification,
          experience: experience || 0,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          baseSalary: baseSalary || 0,
          isActive: true,
        },
      });

      // Assign subjects if provided
      if (subjects && subjects.length > 0) {
        await tx.teacherSubject.createMany({
          data: subjects.map((s: any) => ({
            teacherId: teacher.id,
            classId: s.classId,
            sectionId: s.sectionId,
            subjectId: s.subjectId,
          })),
        });
      }

      // Create user account for teacher if email provided
      if (email) {
        const hashedPassword = await bcrypt.hash(teacherId, 10); // Default password is teacher ID
        await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: "TEACHER",
            isActive: true,
          },
        });
      }

      return tx.teacher.findUnique({
        where: { id: teacher.id },
        include: {
          teacherSubjects: {
            include: {
              subject: true,
              class: true,
              section: true,
            },
          },
        },
      });
    });

    // Log the transaction
    await logTransaction({
      action: "CREATE",
      entityType: "Teacher",
      entityId: result!.id,
      userId: session.user.id,
      details: { teacherId, firstName, lastName },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Teachers POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create teacher" },
      { status: 500 }
    );
  }
}
