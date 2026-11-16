import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import { parseExpense } from "@/lib/expense-input";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!hasPermission(session.user.role, Permission.MANAGE_FINANCE, (session.user as { permissions?: string[] }).permissions)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

// PUT - edit an expense
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error: denied } = await guard();
  if (denied) return denied;
  const { id } = await params;

  const { data, error } = parseExpense(await request.json());
  if (error) return NextResponse.json({ error }, { status: 400 });

  const before = await prisma.expense.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const expense = await prisma.expense.update({ where: { id }, data });
  await logTransaction({
    action: "UPDATE",
    entityType: "PAYMENT",
    entityId: id,
    userId: session!.user.id,
    details: {
      type: "EXPENSE",
      before: { category: before.category, amount: before.amount, date: before.date },
      after: { category: expense.category, amount: expense.amount, date: expense.date },
    },
  });
  return NextResponse.json(expense);
}

// DELETE - remove an expense
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error: denied } = await guard();
  if (denied) return denied;
  const { id } = await params;

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  await prisma.expense.delete({ where: { id } });
  await logTransaction({
    action: "DELETE",
    entityType: "PAYMENT",
    entityId: id,
    userId: session!.user.id,
    details: { type: "EXPENSE", category: expense.category, description: expense.description, amount: expense.amount },
  });
  return NextResponse.json({ success: true });
}
