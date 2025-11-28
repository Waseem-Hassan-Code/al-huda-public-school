import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { getNextSequenceValue } from "@/lib/sequences";
import { logCreate } from "@/lib/transaction-log";

// GET - List students with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_STUDENTS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { studentId: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { cnic: { contains: search, mode: "insensitive" } },
      ];
    }

    if (classId) {
      where.classId = classId;
    }

    if (sectionId) {
      where.sectionId = sectionId;
    }

    if (status) {
      where.status = status;
    }

    // Get students with pagination
    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: true,
          section: true,
          guardian: true,
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Students GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

// POST - Create new student (admission)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.CREATE_STUDENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      // Student info
      firstName,
      lastName,
      dateOfBirth,
      gender,
      cnic,
      religion,
      nationality,
      bloodGroup,
      address,
      city,
      phone,
      email,
      photo,
      // Academic info
      classId,
      sectionId,
      admissionDate,
      previousSchool,
      previousClass,
      // Guardian info
      guardian,
      // Fee info
      fees,
    } = body;

    // Generate student ID
    const studentId = await getNextSequenceValue("student");

    // Create student in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create or find guardian
      let guardianRecord;
      if (guardian) {
        // Check if guardian exists by CNIC
        guardianRecord = await tx.guardian.findFirst({
          where: { cnic: guardian.cnic },
        });

        if (!guardianRecord) {
          guardianRecord = await tx.guardian.create({
            data: {
              name: guardian.firstName,
              lastName: guardian.lastName,
              relationship: guardian.relationship,
              cnic: guardian.cnic,
              phone: guardian.phone,
              email: guardian.email,
              occupation: guardian.occupation,
              address: guardian.address,
              city: guardian.city,
            },
          });
        }
      }

      // Create student
      const student = await tx.student.create({
        data: {
          studentId,
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          cnic,
          religion,
          nationality: nationality || "Pakistani",
          bloodGroup,
          address,
          city,
          phone,
          email,
          photo,
          classId,
          sectionId,
          guardianId: guardianRecord?.id,
          admissionDate: new Date(admissionDate || new Date()),
          previousSchool,
          previousClass,
          status: "ACTIVE",
        },
        include: {
          class: true,
          section: true,
          guardian: true,
        },
      });

      // Create student fees if provided
      if (fees && fees.length > 0) {
        await tx.studentFee.createMany({
          data: fees.map((fee: any) => ({
            studentId: student.id,
            feeStructureId: fee.feeStructureId,
            amount: fee.amount,
            discount: fee.discount || 0,
            discountReason: fee.discountReason,
          })),
        });
      }

      // Create user account for student if email provided
      if (email) {
        const hashedPassword = await bcrypt.hash(studentId, 10); // Default password is student ID
        await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: "STUDENT",
            isActive: true,
          },
        });
      }

      return student;
    });

    // Log the transaction
    await logCreate(
      "STUDENT",
      result.id,
      { studentId, firstName, lastName },
      session.user.id
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Students POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 }
    );
  }
}
