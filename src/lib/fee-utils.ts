// Fee helpers that are safe to use in both client components and API routes
// (no database access here).

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Session fee vouchers are stored as month 13 of the session's start year
// (opening balances use month 0 / year 0). Keeps one voucher per student per session.
export const SESSION_FEE_MONTH = 13;

type PeriodLike = { month: number; year: number; isOpeningBalance?: boolean; isSessionFee?: boolean };

export function isSessionFeeVoucher(v: PeriodLike): boolean {
  return !!v.isSessionFee || v.month === SESSION_FEE_MONTH;
}

/** "2026-27" for a session starting in 2026 */
export function sessionYearsLabel(startYear: number): string {
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

/**
 * Due date wording: session fees are payable any time during the session,
 * so they read "Due up to Mar 2027"; other vouchers show the date.
 */
export function dueLabel(v: PeriodLike & { dueDate: string | Date }): string {
  const d = new Date(v.dueDate);
  if (isSessionFeeVoucher(v)) {
    return `Due up to ${d.toLocaleDateString("en-PK", { month: "short", year: "numeric" })}`;
  }
  return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

/** "Nov 2026" */
export function monthYearLabel(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-PK", { month: "short", year: "numeric" });
}

/**
 * Period wording for printed slips/receipts: the opening balance is printed as
 * "Previous dues" (parents don't know the term "opening balance").
 */
export function printPeriodLabel(v: PeriodLike): string {
  if (v.isOpeningBalance || (v.month === 0 && v.year === 0)) return "Previous dues";
  return periodLabel(v);
}

// Voucher statuses that still have money owed on them
export const OUTSTANDING_STATUSES = ["UNPAID", "PARTIAL", "OVERDUE"] as const;

export function isOutstanding(status: string): boolean {
  return (OUTSTANDING_STATUSES as readonly string[]).includes(status);
}

/** Human label for a voucher's period, e.g. "March 2026" or "Opening Balance". */
export function periodLabel(v: PeriodLike): string {
  if (v.isOpeningBalance || (v.month === 0 && v.year === 0)) return "Opening Balance";
  if (isSessionFeeVoucher(v)) return `Session fee ${sessionYearsLabel(v.year)}`;
  if (v.month < 1 || v.month > 12) return `Period ${v.month}/${v.year}`;
  return `${MONTH_NAMES[v.month - 1]} ${v.year}`;
}

/** Short label, e.g. "Mar 2026" or "Opening". */
export function shortPeriodLabel(v: PeriodLike): string {
  if (v.isOpeningBalance || (v.month === 0 && v.year === 0)) return "Opening";
  if (isSessionFeeVoucher(v)) return `Session ${sessionYearsLabel(v.year)}`;
  if (v.month < 1 || v.month > 12) return `${v.month}/${v.year}`;
  return `${MONTH_NAMES[v.month - 1].slice(0, 3)} ${v.year}`;
}

/** Rounds to paisa (2 decimals) to avoid floating point drift in balances. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** "Rs. 12,500" */
export function rs(amount: number): string {
  return `Rs. ${round2(amount || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

/**
 * Oldest-dues-first order: opening balance, then by year and month.
 * Same order the server uses when applying a payment.
 */
export function fifoCompare(
  a: { isOpeningBalance?: boolean; month: number; year: number },
  b: { isOpeningBalance?: boolean; month: number; year: number }
): number {
  const ao = a.isOpeningBalance ? 1 : 0;
  const bo = b.isOpeningBalance ? 1 : 0;
  if (ao !== bo) return bo - ao;
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

export interface PreviewAllocation<T> {
  voucher: T;
  applied: number;
  remaining: number;
  willBePaid: boolean;
}

/**
 * Shows how an amount would be split across outstanding vouchers (oldest
 * first) without saving anything. Used for the live preview in the
 * receive-payment dialog.
 */
export function previewAllocation<
  T extends { balanceDue: number; isOpeningBalance?: boolean; month: number; year: number }
>(vouchers: T[], amount: number): { allocations: PreviewAllocation<T>[]; unapplied: number } {
  let left = round2(Math.max(0, amount || 0));
  const allocations = [...vouchers].sort(fifoCompare).map((v) => {
    const applied = round2(Math.min(left, v.balanceDue));
    left = round2(left - applied);
    const remaining = round2(v.balanceDue - applied);
    return { voucher: v, applied, remaining, willBePaid: remaining <= 0 };
  });
  return { allocations, unapplied: left };
}

/** Net amount a voucher charges for its own period (arrears are tracked separately). */
export function voucherCharge(v: { subtotal: number; lateFee?: number; discount?: number }): number {
  return round2((v.subtotal || 0) + (v.lateFee || 0) - (v.discount || 0));
}
