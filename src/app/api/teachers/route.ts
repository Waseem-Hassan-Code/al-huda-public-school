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

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
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
          subjects: {
            include: {
              subject: true,
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
      teachers,
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
      fatherName,
      dateOfBirth,
      gender,
      cnic,
      phone,
      email,
      address,
      city,
      photo,
      qualification,
      specialization,
      experience,
      joiningDate,
      designation,
      basicSalary,
      allowances,
      deductions,
      bankName,
      bankAccountNo,
      bankBranch,
      subjects, // Array of subjectIds (legacy support)
      classSubjectAssignments, // Array of { classId, subjectId }
    } = body;

    // Generate employee ID
    const employeeId = await getNextSequenceValue("TEACHER");

    // Create teacher in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user account for teacher if email provided
      let userId: string | null = null;
      if (email) {
        const hashedPassword = await bcrypt.hash(employeeId, 10); // Default password is employee ID
        const user = await tx.user.create({
          data: {
            email,
            username: email.split("@")[0],
            password: hashedPassword,
            name: `${firstName} ${lastName}`,
            role: "TEACHER",
            isActive: true,
            createdById: session.user.id,
          },
        });
        userId = user.id;
      }

      // Create teacher
      const teacher = await tx.teacher.create({
        data: {
          employeeId,
          userId,
          firstName,
          lastName,
          fatherName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender,
          cnic,
          phone,
          email,
          address,
          city: city || "Karachi",
          photo,
          qualification,
          specialization,
          experience: experience || 0,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          designation: designation || "Teacher",
          basicSalary: basicSalary || 0,
          allowances: allowances || 0,
          deductions: deductions || 0,
          bankName,
          bankAccountNo,
          bankBranch,
          isActive: true,
          createdById: session.user.id,
        },
      });

      // Assign subjects if provided (with class assignments)
      if (classSubjectAssignments && classSubjectAssignments.length > 0) {
        // For now, just extract unique subject IDs until Prisma client is regenerated
        const subjectIds: string[] = classSubjectAssignments.map(
          (a: { subjectId: string }) => a.subjectId
        );
        const uniqueSubjectIds = Array.from(new Set(subjectIds));
        await tx.teacherSubject.createMany({
          data: uniqueSubjectIds.map((subjectId) => ({
            teacherId: teacher.id,
            subjectId,
          })),
        });
      } else if (subjects && subjects.length > 0) {
        // Legacy support: just subject IDs without class
        await tx.teacherSubject.createMany({
          data: subjects.map((subjectId: string) => ({
            teacherId: teacher.id,
            subjectId,
          })),
        });
      }

      return tx.teacher.findUnique({
        where: { id: teacher.id },
        include: {
          subjects: {
            include: {
              subject: true,
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
      details: { employeeId, firstName, lastName },
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

// PUT - Update teacher
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_TEACHER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      fatherName,
      dateOfBirth,
      gender,
      cnic,
      phone,
      email,
      address,
      city,
      photo,
      qualification,
      specialization,
      experience,
      joiningDate,
      designation,
      basicSalary,
      allowances,
      deductions,
      bankName,
      bankAccountNo,
      bankBranch,
      isActive,
      subjects, // Array of subjectIds (legacy support)
      classSubjectAssignments, // Array of { classId, subjectId }
    } = body;

    // Update teacher in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Build update data object - only include fields that are provided
      const updateData: Record<string, unknown> = {
        updatedById: session.user.id,
      };

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (fatherName !== undefined) updateData.fatherName = fatherName;
      if (dateOfBirth !== undefined)
        updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (gender !== undefined) updateData.gender = gender;
      if (cnic !== undefined) updateData.cnic = cnic;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (photo !== undefined) updateData.photo = photo;
      if (qualification !== undefined) updateData.qualification = qualification;
      if (specialization !== undefined)
        updateData.specialization = specialization;
      if (experience !== undefined) updateData.experience = experience;
      if (joiningDate !== undefined)
        updateData.joiningDate = joiningDate ? new Date(joiningDate) : null;
      if (designation !== undefined) updateData.designation = designation;
      if (basicSalary !== undefined) updateData.basicSalary = basicSalary;
      if (allowances !== undefined) updateData.allowances = allowances;
      if (deductions !== undefined) updateData.deductions = deductions;
      if (bankName !== undefined) updateData.bankName = bankName;
      if (bankAccountNo !== undefined) updateData.bankAccountNo = bankAccountNo;
      if (bankBranch !== undefined) updateData.bankBranch = bankBranch;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Update teacher
      await tx.teacher.update({
        where: { id },
        data: updateData,
      });

      // Delete existing subject assignments
      await tx.teacherSubject.deleteMany({
        where: { teacherId: id },
      });

      // Recreate subject assignments
      if (classSubjectAssignments && classSubjectAssignments.length > 0) {
        // For now, just extract unique subject IDs until Prisma client is regenerated
        const subjectIds: string[] = classSubjectAssignments.map(
          (a: { subjectId: string }) => a.subjectId
        );
        const uniqueSubjectIds = Array.from(new Set(subjectIds));
        await tx.teacherSubject.createMany({
          data: uniqueSubjectIds.map((subjectId) => ({
            teacherId: id,
            subjectId,
          })),
        });
      } else if (subjects && subjects.length > 0) {
        // Legacy support: just subject IDs without class
        await tx.teacherSubject.createMany({
          data: subjects.map((subjectId: string) => ({
            teacherId: id,
            subjectId,
          })),
        });
      }

      return tx.teacher.findUnique({
        where: { id },
        include: {
          subjects: {
            include: {
              subject: true,
            },
          },
        },
      });
    });

    // Log the transaction
    await logTransaction({
      action: "UPDATE",
      entityType: "Teacher",
      entityId: id,
      userId: session.user.id,
      details: { firstName, lastName },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Teachers PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update teacher" },
      { status: 500 }
    );
  }
}

// DELETE - Delete teacher
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.DELETE_TEACHER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    // Delete teacher in transaction
    await prisma.$transaction(async (tx) => {
      // Delete subject assignments first
      await tx.teacherSubject.deleteMany({
        where: { teacherId: id },
      });

      // Delete teacher
      await tx.teacher.delete({
        where: { id },
      });
    });

    // Log the transaction
    await logTransaction({
      action: "DELETE",
      entityType: "Teacher",
      entityId: id,
      userId: session.user.id,
      details: {},
    });

    return NextResponse.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Teachers DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete teacher" },
      { status: 500 }
    );
  }
}
