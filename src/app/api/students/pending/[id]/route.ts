import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudentStatus } from "@prisma/client";

// PUT - Approve or Reject a pending registration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admins to approve
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body; // "APPROVE" or "REJECT"

    if (action === "APPROVE") {
      const student = await prisma.student.update({
        where: { id },
        data: {
          status: StudentStatus.ACTIVE,
          updatedById: session.user.id,
        },
      });

      // Firebase Trigger for Real-Time Update
      try {
        // Send a ping to Firebase to notify the mobile app
        const firebaseSyncUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/firebase-sync/notify`;
        await fetch(firebaseSyncUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "STUDENT_APPROVED",
            studentId: student.id,
            registrationNo: student.registrationNo,
          }),
        });
      } catch (err) {
        console.error("Firebase sync failed:", err);
        // Do not fail the request if firebase sync fails
      }

      return NextResponse.json({ message: "Student approved successfully", data: student });
    } else if (action === "REJECT") {
      // Hard delete or change status to REJECTED?
      // Since it's not active, we can just delete it or mark it DROPPED_OUT/INACTIVE
      const student = await prisma.student.update({
        where: { id },
        data: {
          status: StudentStatus.INACTIVE,
          updatedById: session.user.id,
        },
      });
      return NextResponse.json({ message: "Student rejected successfully", data: student });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Pending Student PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to process registration request." },
      { status: 500 }
    );
  }
}
