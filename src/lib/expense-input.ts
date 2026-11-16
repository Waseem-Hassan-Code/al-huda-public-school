// Validates and normalises an expense from a request body (shared by the expense APIs).
import { PaymentMethod } from "@prisma/client";
import { round2 } from "./fee-utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseExpense(body: any): { data?: any; error?: string } {
  const amount = round2(parseFloat(body?.amount));
  const date = body?.date ? new Date(body.date) : null;
  const category = String(body?.category ?? "").trim();
  const description = String(body?.description ?? "").trim();
  if (!date || isNaN(date.getTime())) return { error: "Date is required" };
  if (!category) return { error: "Category is required" };
  if (!description) return { error: "Description is required" };
  if (!(amount > 0)) return { error: "Amount must be greater than 0" };
  const method = String(body?.paymentMethod || "CASH");
  if (!Object.keys(PaymentMethod).includes(method)) return { error: "Invalid payment method" };
  return {
    data: {
      date,
      category,
      description,
      amount,
      paymentMethod: method as PaymentMethod,
      paidTo: body?.paidTo?.trim() || null,
      reference: body?.reference?.trim() || null,
      notes: body?.notes?.trim() || null,
    },
  };
}
