import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { getFinanceSummary, getMonthlyTrend } from "@/lib/finance";

// GET ?from&to - income (fees collected), expenses, salaries paid and net for
// [from, to), plus the last 12 months' trend.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, Permission.VIEW_FINANCE, (session.user as { permissions?: string[] }).permissions)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const now = new Date();
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  try {
    const [summary, trend] = await Promise.all([getFinanceSummary(from, to), getMonthlyTrend(12)]);
    return NextResponse.json({ summary, trend });
  } catch (err) {
    console.error("Finance summary Error:", err);
    return NextResponse.json({ error: "Failed to load finance summary" }, { status: 500 });
  }
}
