"use client";

// Short fee statement (80 mm thermal, #remaining-balance-print): one table with
// older dues rolled into "Total dues up to <last month>", this month's fee,
// any current session fee, and the total payable.

import { PrintHeader, PrintRow, PrintSheet, PrintTable } from "@/components/print/PrintBlocks";
import { isOutstanding, isSessionFeeVoucher, monthYearLabel, periodLabel, rs, round2 } from "@/lib/fee-utils";

interface FeeVoucher {
  id: string;
  voucherNo: string;
  month: number;
  year: number;
  isOpeningBalance?: boolean;
  isSessionFee?: boolean;
  subtotal: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  dueDate: string;
  status: string;
}

interface Student {
  registrationNo: string;
  firstName: string;
  lastName: string;
  fatherName?: string;
  class?: { name: string };
  section?: { name: string };
}

interface RemainingBalancePrintProps {
  student: Student;
  vouchers: FeeVoucher[];
  totalBalance: number;
}

export default function RemainingBalancePrint({ student, vouchers }: RemainingBalancePrintProps) {
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const lastMonth = new Date(thisYear, now.getMonth() - 1, 1);

  const due = vouchers.filter((v) => isOutstanding(v.status) && v.balanceDue > 0);
  const isThisMonth = (v: FeeVoucher) => v.month === thisMonth && v.year === thisYear;
  // Session fee still running (due date not passed): shown on its own line
  const isCurrentSession = (v: FeeVoucher) => isSessionFeeVoucher(v) && new Date(v.dueDate) >= now;

  const current = due.filter(isThisMonth);
  const sessions = due.filter(isCurrentSession);
  const older = due.filter((v) => !isThisMonth(v) && !isCurrentSession(v));

  const sum = (list: FeeVoucher[]) => round2(list.reduce((s, v) => s + v.balanceDue, 0));
  const olderTotal = sum(older);
  const currentTotal = sum(current);
  const total = round2(olderTotal + currentTotal + sum(sessions));

  const rows: PrintRow[] = [];
  if (olderTotal > 0) rows.push({ label: `Total dues up to ${monthYearLabel(lastMonth)}`, value: rs(olderTotal) });
  if (currentTotal > 0) rows.push({ label: `${monthYearLabel(now)} fee`, value: rs(currentTotal) });
  for (const v of sessions) {
    rows.push({ label: `${periodLabel(v)} (due up to ${monthYearLabel(v.dueDate)})`, value: rs(v.balanceDue) });
  }
  rows.push(
    total > 0
      ? { label: "TOTAL PAYABLE", value: rs(total), total: true }
      : { label: "No dues. Thank you!", value: rs(0), total: true }
  );

  return (
    <PrintSheet id="remaining-balance-print">
      <PrintHeader
        title="FEE STATEMENT"
        subtitle={now.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
      />
      <PrintTable
        rows={[
          { label: "Student", value: `${student.firstName} ${student.lastName}` },
          { label: "Reg #", value: student.registrationNo },
          ...(student.fatherName ? [{ label: "Father", value: student.fatherName }] : []),
          {
            label: "Class",
            value: `${student.class?.name ?? "-"}${student.section ? ` - ${student.section.name}` : ""}`,
          },
        ]}
      />
      <PrintTable header={["Description", "Amount"]} rows={rows} />
      <div style={{ fontSize: "11px", textAlign: "center" }}>Please pay at the school office. Thank you!</div>
    </PrintSheet>
  );
}
