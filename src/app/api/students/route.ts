import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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
          academicYear: true,
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

    const userRole = session.user.role as string;
    if (!hasPermission(userRole, Permission.CREATE_STUDENT)) {
      console.log("Permission denied for role:", userRole);
      return NextResponse.json(
        {
          error: `Forbidden - Role: ${userRole} does not have CREATE_STUDENT permission`,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      // Student info
      registrationNo: userRegistrationNo,
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
      monthlyFee,
      fees,
    } = body;

    // Get current academic year
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    if (!currentAcademicYear) {
      return NextResponse.json(
        {
          error:
            "No active academic year found. Please set up an academic year first.",
        },
        { status: 400 }
      );
    }

    // Use user-provided registration number or generate one automatically
    let registrationNo = userRegistrationNo?.trim();
    if (!registrationNo) {
      registrationNo = await getNextSequenceValue("student");
    } else {
      // Check if registration number already exists
      const existingStudent = await prisma.student.findUnique({
        where: { registrationNo },
      });
      if (existingStudent) {
        return NextResponse.json(
          { error: "Registration number already exists" },
          { status: 400 }
        );
      }
    }

    // Generate roll number based on class
    let rollNo: string | null = null;
    if (classId) {
      // Count existing students in this class to generate roll number
      const existingCount = await prisma.student.count({
        where: { classId, academicYearId: currentAcademicYear.id },
      });
      rollNo = String(existingCount + 1).padStart(3, "0");
    }

    // Create student in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create student with guardian info embedded
      const student = await tx.student.create({
        data: {
          registrationNo,
          firstName,
          lastName,
          fatherName:
            guardian?.relationship === "FATHER"
              ? `${guardian.firstName} ${guardian.lastName}`
              : guardian?.firstName || firstName, // Use guardian name as fallback
          dateOfBirth: new Date(dateOfBirth),
          gender,
          cnic: cnic || null,
          religion: religion ? religion.toUpperCase() : "ISLAM",
          nationality: nationality || "Pakistani",
          bloodGroup: bloodGroup ? bloodGroup.toUpperCase() : null,
          address,
          city: city || "Karachi",
          phone: phone || null,
          email: email || null,
          photo: photo || null,
          classId: classId || null,
          sectionId: sectionId || null,
          rollNo,
          academicYearId: currentAcademicYear.id,
          admissionDate: new Date(admissionDate || new Date()),
          previousSchool: previousSchool || null,
          previousClass: previousClass || null,
          // Guardian info - stored directly on student
          guardianName: guardian
            ? `${guardian.firstName} ${guardian.lastName}`
            : "",
          guardianRelation: guardian?.relationship || "FATHER",
          guardianCnic: guardian?.cnic || null,
          guardianPhone: guardian?.phone || "",
          guardianWhatsapp: guardian?.whatsapp || guardian?.phone || null,
          guardianEmail: guardian?.email || null,
          guardianOccupation: guardian?.occupation || null,
          guardianAddress: guardian?.address || null,
          monthlyFee: monthlyFee || 0,
          status: "ACTIVE",
          createdById: session.user.id,
        },
        include: {
          class: true,
          section: true,
          academicYear: true,
        },
      });

      return student;
    });

    // Log the transaction
    await logCreate(
      "STUDENT",
      result.id,
      { registrationNo, firstName, lastName, monthlyFee },
      session.user.id
    );

    return NextResponse.json(
      {
        ...result,
        studentId: result.registrationNo, // For backward compatibility
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Students POST Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create student",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
