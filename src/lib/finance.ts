// Server-side finance figures: fees collected (income), recorded expenses,
// teacher salaries paid (from the Salary module), and net = income - spending.

import { prisma } from "./prisma";
import { round2 } from "./fee-utils";
import { SALARIES_CATEGORY } from "./finance-shared";

export interface FinanceSummary {
  from: string;
  to: string;
  income: number;
  expenses: number;
  salaries: number;
  totalSpending: number;
  net: number;
  byCategory: { category: string; amount: number; count: number }[];
}

export async function getFinanceSummary(from: Date, to: Date): Promise<FinanceSummary> {
  const [income, expenses, byCategory, salaries] = await Promise.all([
    prisma.payment.aggregate({
      where: { paymentDate: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { date: { gte: from, lt: to } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    // Salaries are counted when paid (paidAmount, by payment date)
    prisma.teacherSalary.aggregate({
      where: { paymentDate: { gte: from, lt: to }, status: { in: ["PAID", "PARTIAL"] } },
      _sum: { paidAmount: true },
      _count: { _all: true },
    }),
  ]);

  const inc = round2(income._sum.amount ?? 0);
  const exp = round2(expenses._sum.amount ?? 0);
  const sal = round2(salaries._sum.paidAmount ?? 0);
  const categories = byCategory
    .map((c) => ({ category: c.category, amount: round2(c._sum.amount ?? 0), count: c._count._all }))
    .concat(sal > 0 ? [{ category: SALARIES_CATEGORY, amount: sal, count: salaries._count._all }] : [])
    .sort((a, b) => b.amount - a.amount);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    income: inc,
    expenses: exp,
    salaries: sal,
    totalSpending: round2(exp + sal),
    net: round2(inc - exp - sal),
    byCategory: categories,
  };
}

/** Income vs spending for each of the last `months` months (ending this month). */
export async function getMonthlyTrend(months = 12) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [payments, expenses, salaries] = await Promise.all([
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lt: end } },
      select: { amount: true, paymentDate: true },
    }),
    prisma.expense.findMany({ where: { date: { gte: start, lt: end } }, select: { amount: true, date: true } }),
    prisma.teacherSalary.findMany({
      where: { paymentDate: { gte: start, lt: end }, status: { in: ["PAID", "PARTIAL"] } },
      select: { paidAmount: true, paymentDate: true },
    }),
  ]);

  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const buckets = new Map<string, { label: string; income: number; expenses: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    buckets.set(key(d), {
      label: d.toLocaleDateString("en-PK", { month: "short", year: "2-digit" }),
      income: 0,
      expenses: 0,
    });
  }
  for (const p of payments) {
    const b = buckets.get(key(new Date(p.paymentDate)));
    if (b) b.income += p.amount;
  }
  for (const e of expenses) {
    const b = buckets.get(key(new Date(e.date)));
    if (b) b.expenses += e.amount;
  }
  for (const s of salaries) {
    if (!s.paymentDate) continue;
    const b = buckets.get(key(new Date(s.paymentDate)));
    if (b) b.expenses += s.paidAmount;
  }
  return [...buckets.values()].map((b) => ({
    month: b.label,
    income: round2(b.income),
    expenses: round2(b.expenses),
    net: round2(b.income - b.expenses),
  }));
}
