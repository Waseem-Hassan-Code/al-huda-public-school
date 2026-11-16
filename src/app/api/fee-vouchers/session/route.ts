import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import { createSessionFeeVoucher, resolveSession, SessionFeeResult } from "@/lib/session-fee";
import { SESSION_FEE_MONTH } from "@/lib/fee-utils";

// GET ?academicYearId= - Session-plan students in the session and who still
// needs a session fee voucher (for the "Generate session fees" dialog).
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, Permission.VIEW_FEES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const academicYear = await resolveSession(request.nextUrl.searchParams.get("academicYearId"));
  if (!academicYear) return NextResponse.json({ error: "No active session" }, { status: 400 });
  const startYear = new Date(academicYear.startDate).getFullYear();

  const students = await prisma.student.findMany({
    where: { feePlan: "SESSION", status: "ACTIVE", academicYearId: academicYear.id },
    select: {
      id: true,
      registrationNo: true,
      firstName: true,
      lastName: true,
      sessionFee: true,
      class: { select: { name: true } },
      section: { select: { name: true } },
      feeVouchers: {
        where: { month: SESSION_FEE_MONTH, year: startYear },
        select: { id: true, voucherNo: true, totalAmount: true, balanceDue: true, status: true },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return NextResponse.json({
    academicYear: { id: academicYear.id, name: academicYear.name, startDate: academicYear.startDate, endDate: academicYear.endDate },
    students: students.map(({ feeVouchers, ...s }) => ({ ...s, voucher: feeVouchers[0] ?? null })),
  });
}

// POST - Create session fee vouchers.
// Body: { studentId?, amount?, studentIds?, academicYearId? }
//   studentId (+ optional amount): one student (works even if they're on the monthly plan)
//   studentIds: these session-plan students; neither: every session-plan student in the session
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, Permission.CREATE_FEE_VOUCHER)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { studentId, studentIds, academicYearId, amount } = await request.json();
    const academicYear = await resolveSession(academicYearId);
    if (!academicYear) {
      return NextResponse.json({ error: "No active session. Set one up on the Academic Sessions page." }, { status: 400 });
    }

    let ids: string[];
    if (studentId) {
      ids = [studentId];
    } else if (Array.isArray(studentIds) && studentIds.length > 0) {
      ids = studentIds;
    } else {
      const students = await prisma.student.findMany({
        where: { feePlan: "SESSION", status: "ACTIVE", academicYearId: academicYear.id },
        select: { id: true },
      });
      ids = students.map((s) => s.id);
    }

    const results: SessionFeeResult[] = [];
    for (const id of ids) {
      results.push(
        await createSessionFeeVoucher({
          studentId: id,
          academicYear,
          createdById: session.user.id,
          amount: studentId && amount !== undefined ? parseFloat(amount) : undefined,
          force: !!studentId,
        })
      );
    }

    const created = results.filter((r) => r.status === "created");
    if (created.length > 0) {
      await logTransaction({
        action: "FEE_GENERATED",
        entityType: "FEE",
        entityId: academicYear.id,
        userId: session.user.id,
        details: {
          type: "SESSION_FEE",
          session: academicYear.name,
          created: created.map((r) => ({ studentId: r.studentId, voucherNo: r.voucherNo, amount: r.amount })),
        },
      });
    }

    const count = (s: string) => results.filter((r) => r.status === s).length;
    return NextResponse.json({
      message: `Created ${created.length} session fee voucher(s) for ${academicYear.name}.${
        count("exists") ? ` ${count("exists")} already had one.` : ""
      }${count("no_fee") ? ` ${count("no_fee")} have no session fee amount set.` : ""}`,
      results,
    });
  } catch (error) {
    console.error("Session fee POST Error:", error);
    return NextResponse.json({ error: "Failed to create session fee vouchers" }, { status: 500 });
  }
}
