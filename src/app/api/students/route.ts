import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { getNextSequenceValue } from "@/lib/sequences";
import { logCreate, logTransaction } from "@/lib/transaction-log";
import { notifyStudentRegistered } from "@/lib/notifications";
import { FeeStatus, FeeType } from "@prisma/client";

// Blood group mapping from display format to enum format
const bloodGroupMap: Record<string, string> = {
  "A+": "A_POSITIVE",
  "A-": "A_NEGATIVE",
  "B+": "B_POSITIVE",
  "B-": "B_NEGATIVE",
  "O+": "O_POSITIVE",
  "O-": "O_NEGATIVE",
  "AB+": "AB_POSITIVE",
  "AB-": "AB_NEGATIVE",
  A_POSITIVE: "A_POSITIVE",
  A_NEGATIVE: "A_NEGATIVE",
  B_POSITIVE: "B_POSITIVE",
  B_NEGATIVE: "B_NEGATIVE",
  O_POSITIVE: "O_POSITIVE",
  O_NEGATIVE: "O_NEGATIVE",
  AB_POSITIVE: "AB_POSITIVE",
  AB_NEGATIVE: "AB_NEGATIVE",
};

// Convert blood group to enum format
const convertBloodGroup = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const mapped = bloodGroupMap[value.toUpperCase()];
  return mapped || null;
};

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
          bloodGroup: convertBloodGroup(bloodGroup),
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

      // Generate admission fee voucher if there are fees
      // Note: The admission page already filters selected fees, so we use fees directly
      let admissionVoucher = null;
      const selectedFees = fees || [];
      const hasAdmissionFees = selectedFees.length > 0 || monthlyFee > 0;

      if (hasAdmissionFees) {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const dueDate = new Date(
          currentYear,
          currentDate.getMonth(),
          currentDate.getDate() + 15
        ); // Due in 15 days

        // Calculate totals
        const additionalFeesTotal = selectedFees.reduce(
          (sum: number, f: any) => sum + (f.amount - (f.discount || 0)),
          0
        );
        const subtotal = (monthlyFee || 0) + additionalFeesTotal;

        // Generate voucher number
        const voucherNo = await getNextSequenceValue("VOUCHER");

        // Create fee voucher with items
        const feeItems = [];

        // Add monthly fee as first item if > 0
        if (monthlyFee > 0) {
          feeItems.push({
            feeType: FeeType.MONTHLY_FEE,
            description: `Monthly Tuition Fee - ${currentMonth}/${currentYear}`,
            amount: monthlyFee,
          });
        }

        // Add selected additional fees with their proper fee types
        for (const fee of selectedFees) {
          const netAmount = fee.amount - (fee.discount || 0);
          if (netAmount > 0) {
            // Use the fee type from the fee structure, fallback to ADMISSION_FEE
            const feeTypeValue =
              fee.feeType && FeeType[fee.feeType as keyof typeof FeeType]
                ? FeeType[fee.feeType as keyof typeof FeeType]
                : FeeType.ADMISSION_FEE;

            feeItems.push({
              feeType: feeTypeValue,
              description:
                fee.name +
                (fee.discountReason
                  ? ` (Discount: ${fee.discountReason})`
                  : ""),
              amount: netAmount,
            });
          }
        }

        admissionVoucher = await tx.feeVoucher.create({
          data: {
            voucherNo,
            studentId: student.id,
            month: currentMonth,
            year: currentYear,
            dueDate,
            subtotal,
            totalAmount: subtotal,
            balanceDue: subtotal,
            paidAmount: 0,
            status: FeeStatus.UNPAID,
            remarks:
              "Admission Fee Voucher - Auto-generated on student registration",
            createdById: session.user.id,
            feeItems: {
              create: feeItems,
            },
          },
        });
      }

      return { student, admissionVoucher };
    });

    // Log the student creation
    await logCreate(
      "STUDENT",
      result.student.id,
      { registrationNo, firstName, lastName, monthlyFee },
      session.user.id
    );

    // Log the voucher creation if generated
    if (result.admissionVoucher) {
      await logTransaction({
        action: "FEE_GENERATED",
        entityType: "FEE",
        entityId: result.admissionVoucher.id,
        userId: session.user.id,
        details: {
          voucherNo: result.admissionVoucher.voucherNo,
          studentId: result.student.id,
          studentName: `${firstName} ${lastName}`,
          registrationNo,
          type: "ADMISSION",
          totalAmount: result.admissionVoucher.totalAmount,
        },
      });
    }

    // Send notification for new student registration
    try {
      // Get class and section names
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        select: { name: true },
      });
      const sectionInfo = sectionId
        ? await prisma.section.findUnique({
            where: { id: sectionId },
            select: { name: true },
          })
        : null;

      await notifyStudentRegistered(
        `${firstName} ${lastName}`,
        registrationNo,
        classInfo?.name || "Unknown Class",
        sectionInfo?.name,
        session.user.id
      );
    } catch (notifyError) {
      // Don't fail the request if notification fails
      console.error("Failed to send registration notification:", notifyError);
    }

    return NextResponse.json(
      {
        ...result.student,
        studentId: result.student.registrationNo, // For backward compatibility
        admissionVoucher: result.admissionVoucher,
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
