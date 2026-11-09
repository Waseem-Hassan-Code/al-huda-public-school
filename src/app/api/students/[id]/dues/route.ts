import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { getStudentDues } from "@/lib/fee-payment";

// GET - What a student owes right now, in the order a payment will clear it,
// plus their last few payments. Used by the Receive Payment dialog.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, Permission.VIEW_FEES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        registrationNo: true,
        firstName: true,
        lastName: true,
        photo: true,
        guardianName: true,
        guardianPhone: true,
        monthlyFee: true,
        status: true,
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const [dues, recentPayments] = await Promise.all([
      getStudentDues(id),
      prisma.payment.findMany({
        where: { studentId: id },
        orderBy: { paymentDate: "desc" },
        take: 5,
        select: {
          id: true,
          receiptNo: true,
          receiptGroup: true,
          amount: true,
          paymentDate: true,
          paymentMethod: true,
        },
      }),
    ]);

    return NextResponse.json({ student, ...dues, recentPayments });
  } catch (error) {
    console.error("Student dues GET Error:", error);
    return NextResponse.json({ error: "Failed to load dues" }, { status: 500 });
  }
}
