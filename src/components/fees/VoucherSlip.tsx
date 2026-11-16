"use client";

// 80 mm fee voucher slip (thermal printer) laid out as bordered tables.
// Unpaid balances on older vouchers are printed as one "Previous dues" line and
// added to the total payable, so parents see everything they owe on one slip.

import { Box } from "@mui/material";
import { PrintHeader, PrintRow, PrintSheet, PrintTable } from "@/components/print/PrintBlocks";
import { dueLabel, isSessionFeeVoucher, monthYearLabel, printPeriodLabel, rs, round2 } from "@/lib/fee-utils";

export interface SlipVoucher {
  id: string;
  voucherNo: string;
  month: number;
  year: number;
  isOpeningBalance?: boolean;
  isSessionFee?: boolean;
  subtotal: number;
  lateFee: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string;
  status: string;
  student: {
    registrationNo: string;
    rollNo?: string | null;
    firstName: string;
    lastName: string;
    fatherName?: string | null;
    guardianName?: string | null;
    class?: { name: string } | null;
    section?: { name: string } | null;
  };
  feeItems: { id: string; feeType: string; description?: string | null; amount: number }[];
  arrears?: { total: number; items: { voucherId: string; period: string; balanceDue: number }[] };
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });

export default function VoucherSlip({ voucher: v, id }: { voucher: SlipVoucher; id?: string }) {
  const arrears = v.arrears?.total ?? 0;
  const payable = round2(v.balanceDue + arrears);
  const isSession = isSessionFeeVoucher(v);
  const isOpening = !!v.isOpeningBalance || (v.month === 0 && v.year === 0);
  // "Previous dues up to Oct 2026": the month before this voucher's period
  const prevMonth = new Date(v.year, v.month - 2, 1);

  const feeRows: PrintRow[] = [
    ...v.feeItems.map((item) => ({
      label: isOpening ? "Previous dues" : item.description || item.feeType.replace(/_/g, " "),
      value: rs(item.amount),
    })),
    ...(v.lateFee > 0 ? [{ label: "Late fee", value: rs(v.lateFee) }] : []),
    ...(v.discount > 0 ? [{ label: "Discount", value: `- ${rs(v.discount)}` }] : []),
    ...(v.paidAmount > 0 ? [{ label: "Already paid", value: `- ${rs(v.paidAmount)}` }] : []),
    ...(arrears > 0
      ? [
          {
            label: isSession || v.month < 1 || v.month > 12 ? "Previous dues" : `Previous dues up to ${monthYearLabel(prevMonth)}`,
            value: rs(arrears),
          },
        ]
      : []),
    { label: "TOTAL PAYABLE", value: rs(payable), total: true },
  ];

  return (
    <Box className="voucher-slip">
      <PrintSheet id={id}>
        <PrintHeader
          title={isOpening ? "PREVIOUS DUES" : isSession ? "SESSION FEE VOUCHER" : "FEE VOUCHER"}
          subtitle={`Voucher # ${v.voucherNo}`}
        />
        <PrintTable
          rows={[
            { label: "Student", value: `${v.student.firstName} ${v.student.lastName}` },
            { label: "Reg #", value: v.student.registrationNo },
            ...(v.student.fatherName || v.student.guardianName
              ? [{ label: "Father/Guardian", value: v.student.fatherName || v.student.guardianName }]
              : []),
            {
              label: "Class",
              value: `${v.student.class?.name ?? "-"}${v.student.section ? ` - ${v.student.section.name}` : ""}${
                v.student.rollNo ? ` (Roll ${v.student.rollNo})` : ""
              }`,
            },
            { label: "For", value: printPeriodLabel(v) },
            { label: "Issued", value: fmtDate(v.issueDate) },
            { label: isSession ? "Payable" : "Due date", value: dueLabel(v) },
          ]}
        />
        <PrintTable header={["Description", "Amount"]} rows={feeRows} />
        {payable <= 0 && (
          <Box sx={{ textAlign: "center", fontWeight: 900, letterSpacing: 3, mb: 0.5 }}>*** PAID ***</Box>
        )}
        <Box sx={{ textAlign: "center", fontSize: "11px" }}>
          {isSession ? "Pay any time this session: in advance, in parts, or by the end." : "Please pay by the due date."}
        </Box>
      </PrintSheet>
    </Box>
  );
}
