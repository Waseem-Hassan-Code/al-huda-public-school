import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  getStudentMobileIdentity,
  provisionStudentMobileAccess,
  upsertStudentInFirebase,
} from "@/lib/firebase";

// GET - Check if student has a provisioned mobile identity
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

    const identity = await getStudentMobileIdentity(id);
    return NextResponse.json(identity);
  } catch (error) {
    console.error("Mobile access GET error:", error);
    return NextResponse.json(
      { error: "Failed to check mobile identity" },
      { status: 500 }
    );
  }
}

// POST - Provision or update mobile access for a student
export async function POST(
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

    const student = await prisma.student.findUnique({
      where: { id },
      include: { class: true, section: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!student.email) {
      return NextResponse.json(
        { error: "Student has no email address. Please add an email first." },
        { status: 400 }
      );
    }

    const result = await provisionStudentMobileAccess({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
    });

    // Ensure Firestore students doc has email so checkEmailInSchool works on mobile
    upsertStudentInFirebase(student).catch((err) =>
      console.error("Firebase student sync failed (non-critical):", err)
    );

    return NextResponse.json({
      created: result.created,
      message: result.created
        ? "Mobile access enabled successfully"
        : "Mobile access updated successfully",
    });
  } catch (error) {
    console.error("Mobile access POST error:", error);
    return NextResponse.json(
      { error: "Failed to provision mobile access" },
      { status: 500 }
    );
  }
}
