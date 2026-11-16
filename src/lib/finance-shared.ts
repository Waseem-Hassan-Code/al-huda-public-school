// Finance constants and helpers safe for both client and server.

export const EXPENSE_CATEGORIES = [
  "Utilities (electricity, gas, water)",
  "Rent",
  "Non-teaching staff pay",
  "Maintenance & repairs",
  "Stationery & supplies",
  "Furniture & equipment",
  "Transport & fuel",
  "Internet & phone",
  "Cleaning & security",
  "Events & functions",
  "Printing & advertising",
  "Taxes, fees & bank charges",
  "Other",
] as const;

// Teacher salaries come from the Salary module and are shown under this name
export const SALARIES_CATEGORY = "Teacher salaries";

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "CREDIT_CARD", label: "Card" },
];

export type PeriodKey = "this_month" | "last_month" | "this_year" | "session" | "custom";

/** [from, to) for a named period. `to` is exclusive (start of the next day/month). */
export function periodRange(
  key: PeriodKey,
  opts: { session?: { startDate: string; endDate: string } | null; from?: string; to?: string } = {}
): { from: Date; to: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "last_month":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
    case "this_year":
      return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
    case "session":
      if (opts.session) {
        const end = new Date(opts.session.endDate);
        return {
          from: new Date(opts.session.startDate),
          to: new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1),
        };
      }
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
    case "custom": {
      const from = opts.from ? new Date(opts.from) : new Date(y, m, 1);
      const toDay = opts.to ? new Date(opts.to) : now;
      return { from, to: new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate() + 1) };
    }
    case "this_month":
    default:
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
  }
}
