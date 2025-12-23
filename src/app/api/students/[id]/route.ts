import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logUpdate, logDelete } from "@/lib/transaction-log";

// GET - Get single student by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_STUDENTS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        section: true,
        academicYear: true,
        feeVouchers: {
          orderBy: { dueDate: "desc" },
          take: 12,
          include: {
            payments: true,
            feeItems: true,
          },
        },
        attendance: {
          orderBy: { date: "desc" },
          take: 30,
        },
        studentMarks: {
          include: {
            exam: true,
            subject: true,
          },
          orderBy: { exam: { examDate: "desc" } },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("Student GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student" },
      { status: 500 }
    );
  }
}

// PUT - Update student
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_STUDENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      fatherName,
      motherName,
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
      classId,
      sectionId,
      status,
      monthlyFee,
      // Guardian fields
      guardianName,
      guardianRelation,
      guardianCnic,
      guardianPhone,
      guardianWhatsapp,
      guardianPhone2,
      guardianEmail,
      guardianOccupation,
      guardianAddress,
      guardianMonthlyIncome,
    } = body;

    // Build update data object, only including defined fields
    const updateData: Record<string, any> = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (fatherName !== undefined) updateData.fatherName = fatherName;
    if (motherName !== undefined) updateData.motherName = motherName;
    if (dateOfBirth !== undefined)
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined) updateData.gender = gender;
    if (cnic !== undefined) updateData.cnic = cnic;
    if (religion !== undefined) updateData.religion = religion;
    if (nationality !== undefined) updateData.nationality = nationality;
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup || null;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (photo !== undefined) updateData.photo = photo;
    if (classId !== undefined) updateData.classId = classId || null;
    if (sectionId !== undefined) updateData.sectionId = sectionId || null;
    if (status !== undefined) updateData.status = status;
    if (monthlyFee !== undefined)
      updateData.monthlyFee = parseFloat(monthlyFee) || 0;

    // Guardian fields
    if (guardianName !== undefined) updateData.guardianName = guardianName;
    if (guardianRelation !== undefined)
      updateData.guardianRelation = guardianRelation;
    if (guardianCnic !== undefined) updateData.guardianCnic = guardianCnic;
    if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone;
    if (guardianWhatsapp !== undefined)
      updateData.guardianWhatsapp = guardianWhatsapp;
    if (guardianPhone2 !== undefined)
      updateData.guardianPhone2 = guardianPhone2;
    if (guardianEmail !== undefined) updateData.guardianEmail = guardianEmail;
    if (guardianOccupation !== undefined)
      updateData.guardianOccupation = guardianOccupation;
    if (guardianAddress !== undefined)
      updateData.guardianAddress = guardianAddress;
    if (guardianMonthlyIncome !== undefined)
      updateData.guardianMonthlyIncome = guardianMonthlyIncome;

    const result = await prisma.$transaction(async (tx: any) => {
      // Update student with only provided fields
      const student = await tx.student.update({
        where: { id },
        data: updateData,
        include: {
          class: true,
          section: true,
          academicYear: true,
        },
      });

      return student;
    });

    // Log the transaction
    await logUpdate(
      "STUDENT",
      id,
      {},
      { firstName, lastName },
      session.user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Student PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    );
  }
}

// DELETE - Delete student (soft delete by changing status)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.DELETE_STUDENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by changing status
    const student = await prisma.student.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    // Log the transaction
    await logDelete(
      "STUDENT",
      id,
      { registrationNo: student.registrationNo },
      session.user.id
    );

    return NextResponse.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Student DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 }
    );
  }
}
