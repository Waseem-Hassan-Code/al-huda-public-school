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
      guardian,
      fees,
    } = body;

    const result = await prisma.$transaction(async (tx: any) => {
      // Update guardian if provided
      if (guardian && guardian.id) {
        await tx.guardian.update({
          where: { id: guardian.id },
          data: {
            firstName: guardian.firstName,
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

      // Update student
      const student = await tx.student.update({
        where: { id },
        data: {
          firstName,
          lastName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
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
        },
        include: {
          class: true,
          section: true,
          guardian: true,
        },
      });

      // Update student fees if provided
      if (fees && fees.length > 0) {
        // Remove existing fees
        await tx.studentFee.deleteMany({
          where: { studentId: id },
        });

        // Create new fees
        await tx.studentFee.createMany({
          data: fees.map((fee: any) => ({
            studentId: id,
            feeStructureId: fee.feeStructureId,
            amount: fee.amount,
            discount: fee.discount || 0,
            discountReason: fee.discountReason,
          })),
        });
      }

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
