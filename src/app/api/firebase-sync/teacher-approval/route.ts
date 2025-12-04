import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  getPendingRegistrations,
  approveTeacherRegistration,
  rejectTeacherRegistration,
} from "@/lib/firebase";

// GET - Get pending teacher registrations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_TEACHER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pendingRegistrations = await getPendingRegistrations();

    // Enrich with teacher data from local DB
    const enrichedRegistrations = await Promise.all(
      pendingRegistrations.map(async (reg) => {
        const teacher = await prisma.teacher.findFirst({
          where: { email: reg.email },
          include: {
            subjects: {
              include: {
                subject: true,
                class: true,
              },
            },
            classSections: {
              include: {
                class: true,
              },
            },
          },
        });

        return {
          ...reg,
          teacher: teacher
            ? {
                id: teacher.id,
                name: `${teacher.firstName} ${teacher.lastName}`,
                employeeId: teacher.employeeId,
                designation: teacher.designation,
                phone: teacher.phone,
                assignedClasses: teacher.classSections.map((cs) => ({
                  className: cs.class.name,
                  sectionName: cs.name,
                })),
                assignedSubjects: teacher.subjects.map((ts) => ({
                  subjectName: ts.subject.name,
                  className: ts.class?.name || "N/A",
                })),
              }
            : null,
          requestedAt: reg.requestedAt.toDate().toISOString(),
        };
      })
    );

    return NextResponse.json({ registrations: enrichedRegistrations });
  } catch (error) {
    console.error("Teacher Approval GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending registrations" },
      { status: 500 }
    );
  }
}

// POST - Approve or reject teacher registration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_TEACHER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { registrationId, action, teacherId, rejectionReason } = body;

    if (!registrationId || !action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    if (action === "APPROVE") {
      if (!teacherId) {
        return NextResponse.json(
          { error: "Teacher ID is required for approval" },
          { status: 400 }
        );
      }

      await approveTeacherRegistration(
        registrationId,
        teacherId,
        session.user.name || session.user.email || "Admin"
      );

      return NextResponse.json({
        message: "Teacher registration approved successfully",
      });
    } else {
      await rejectTeacherRegistration(
        registrationId,
        session.user.name || session.user.email || "Admin",
        rejectionReason || "Registration rejected by admin"
      );

      return NextResponse.json({
        message: "Teacher registration rejected",
      });
    }
  } catch (error) {
    console.error("Teacher Approval POST Error:", error);
    return NextResponse.json(
      { error: "Failed to process registration" },
      { status: 500 }
    );
  }
}
