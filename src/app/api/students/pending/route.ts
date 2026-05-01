import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextSequenceValue } from "@/lib/sequences";
import { StudentStatus } from "@prisma/client";

// POST - Mobile App endpoint for student registration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      guardianName,
      guardianPhone,
      address,
      city,
    } = body;

    // Basic validation
    if (!firstName || !lastName || !guardianName || !guardianPhone) {
      return NextResponse.json(
        { error: "Missing required fields for registration." },
        { status: 400 }
      );
    }

    // Generate unique registration number
    const registrationNo = await getNextSequenceValue("student");

    // Generate unique student email
    const safeFirstName = (firstName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeLastName = (lastName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    let generatedEmail = `${safeFirstName}.${safeLastName}@stdatalhuda.com`;
    let emailCounter = 1;

    while (true) {
      const existingEmail = await prisma.student.findFirst({
        where: { email: generatedEmail },
        select: { id: true },
      });
      if (!existingEmail) break;
      generatedEmail = `${safeFirstName}.${safeLastName}${emailCounter}@stdatalhuda.com`;
      emailCounter++;
    }

    // Try to get current academic year, fallback if not exists
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    if (!currentAcademicYear) {
      return NextResponse.json(
        { error: "System Error: No active academic year found." },
        { status: 500 }
      );
    }

    // Default system user for createdBy if no session (since mobile app might hit this without session)
    let createdById = "default";
    const defaultUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (defaultUser) createdById = defaultUser.id;

    // Create student with PENDING_APPROVAL status
    const student = await prisma.student.create({
      data: {
        registrationNo,
        firstName,
        lastName,
        fatherName: guardianName, // Fallback
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
        gender: gender || "OTHER",
        address: address || "Not provided",
        city: city || "Karachi",
        email: generatedEmail,
        guardianName,
        guardianRelation: "FATHER", // Default
        guardianPhone,
        academicYearId: currentAcademicYear.id,
        status: StudentStatus.PENDING_APPROVAL,
        createdById,
      },
    });

    return NextResponse.json(
      { message: "Registration request submitted successfully.", studentId: student.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Pending Student POST Error:", error);
    return NextResponse.json(
      { error: "Failed to submit registration request." },
      { status: 500 }
    );
  }
}

// GET - Admin endpoint to fetch pending registrations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admins to view pending
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pendingStudents = await prisma.student.findMany({
      where: { status: StudentStatus.PENDING_APPROVAL },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: pendingStudents });
  } catch (error) {
    console.error("Pending Students GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending students." },
      { status: 500 }
    );
  }
}
