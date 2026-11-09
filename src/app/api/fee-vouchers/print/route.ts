import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { getVoucherArrears } from "@/lib/fee-payment";

// GET ?ids=a,b,c - Vouchers ready for printing, each with its live arrears.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, Permission.VIEW_FEES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ids = (request.nextUrl.searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 500);
  if (ids.length === 0) return NextResponse.json({ vouchers: [] });

  try {
    const vouchers = await prisma.feeVoucher.findMany({
      where: { id: { in: ids } },
      include: {
        student: {
          select: {
            id: true,
            registrationNo: true,
            rollNo: true,
            firstName: true,
            lastName: true,
            fatherName: true,
            guardianName: true,
            guardianPhone: true,
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        feeItems: true,
      },
    });

    // Keep the order the user selected
    const order = new Map<string, number>(ids.map((id, i) => [id, i] as [string, number]));
    vouchers.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const withArrears = await Promise.all(
      vouchers.map(async (v) => ({ ...v, arrears: await getVoucherArrears(v) }))
    );
    return NextResponse.json({ vouchers: withArrears });
  } catch (error) {
    console.error("Voucher print GET Error:", error);
    return NextResponse.json({ error: "Failed to load vouchers" }, { status: 500 });
  }
}
