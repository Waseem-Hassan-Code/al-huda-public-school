import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import { round2 } from "@/lib/fee-utils";
import { parseExpense } from "@/lib/expense-input";

// GET ?from&to&category&search&page&limit - expenses in a date range ([from, to))
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, Permission.VIEW_FINANCE, (session.user as { permissions?: string[] }).permissions)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const where: any = {};
  const from = sp.get("from");
  const to = sp.get("to");
  if (from || to) where.date = { ...(from && { gte: new Date(from) }), ...(to && { lt: new Date(to) }) };
  if (sp.get("category")) where.category = sp.get("category");
  const search = sp.get("search")?.trim();
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { paidTo: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
    ];
  }
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(500, Math.max(1, parseInt(sp.get("limit") || "100")));

  const [data, total, sum] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return NextResponse.json({ data, total, totalAmount: round2(sum._sum.amount ?? 0), page, limit });
}

// POST - record an expense
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, Permission.MANAGE_FINANCE, (session.user as { permissions?: string[] }).permissions)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = parseExpense(await request.json());
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    const expense = await prisma.expense.create({ data: { ...data, createdById: session.user.id } });
    await logTransaction({
      action: "CREATE",
      entityType: "PAYMENT",
      entityId: expense.id,
      userId: session.user.id,
      details: { type: "EXPENSE", category: expense.category, description: expense.description, amount: expense.amount },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("Expense POST Error:", err);
    return NextResponse.json({ error: "Failed to save expense" }, { status: 500 });
  }
}
