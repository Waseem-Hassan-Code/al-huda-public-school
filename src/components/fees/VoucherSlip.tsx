"use client";

// 80 mm fee voucher slip (thermal printer), including an arrears line:
// unpaid balances on older vouchers are shown separately and added to the
// total payable, so parents see everything they owe on one slip.

import { Box, Divider, Typography } from "@mui/material";
import { periodLabel, rs, round2 } from "@/lib/fee-utils";

export interface SlipVoucher {
  id: string;
  voucherNo: string;
  month: number;
  year: number;
  isOpeningBalance?: boolean;
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

const Row = ({ label, value, bold, small }: { label: string; value: React.ReactNode; bold?: boolean; small?: boolean }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      gap: 1,
      fontWeight: bold ? 800 : 600,
      fontSize: small ? "11px" : "inherit",
    }}
  >
    <span>{label}</span>
    <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>{value}</span>
  </Box>
);

export default function VoucherSlip({ voucher: v, id }: { voucher: SlipVoucher; id?: string }) {
  const arrears = v.arrears?.total ?? 0;
  const payable = round2(v.balanceDue + arrears);
  const isPaid = payable <= 0;

  return (
    <Box
      id={id}
      className="voucher-slip"
      sx={{ width: "80mm", p: "10px", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.55, fontWeight: 600, bgcolor: "white" }}
    >
      <Box sx={{ textAlign: "center" }}>
        <Typography sx={{ fontFamily: "inherit", fontWeight: 800, fontSize: "15px", textTransform: "uppercase" }}>
          Al-Huda Public School and College Meithakheil
        </Typography>
        <Typography sx={{ fontFamily: "inherit", fontWeight: 800 }}>
          {v.isOpeningBalance ? "OPENING BALANCE" : "FEE VOUCHER"}
        </Typography>
      </Box>
      <Divider sx={{ my: 1, borderStyle: "dashed" }} />
      <Row label="Voucher #" value={v.voucherNo} />
      <Row label="For" value={periodLabel(v)} />
      <Row label="Issued" value={fmtDate(v.issueDate)} />
      <Row label="Due date" value={fmtDate(v.dueDate)} bold />
      <Divider sx={{ my: 1, borderStyle: "dashed" }} />
      <Row label="Student" value={`${v.student.firstName} ${v.student.lastName}`} />
      <Row label="Reg #" value={v.student.registrationNo} />
      {(v.student.fatherName || v.student.guardianName) && (
        <Row label="Father/Guardian" value={v.student.fatherName || v.student.guardianName} />
      )}
      <Row
        label="Class"
        value={`${v.student.class?.name ?? "-"}${v.student.section ? ` - ${v.student.section.name}` : ""}${
          v.student.rollNo ? ` (Roll ${v.student.rollNo})` : ""
        }`}
      />
      <Divider sx={{ my: 1, borderStyle: "dashed" }} />

      {v.feeItems.map((item) => (
        <Row key={item.id} label={item.description || item.feeType.replace(/_/g, " ")} value={rs(item.amount)} />
      ))}
      {v.lateFee > 0 && <Row label="Late fee" value={rs(v.lateFee)} />}
      {v.discount > 0 && <Row label="Discount" value={`- ${rs(v.discount)}`} />}
      <Divider sx={{ my: 0.5 }} />
      <Row label={v.isOpeningBalance ? "Opening balance" : "This month"} value={rs(v.totalAmount)} />
      {v.paidAmount > 0 && <Row label="Already paid" value={`- ${rs(v.paidAmount)}`} />}

      {/* Arrears: unpaid balances on older vouchers */}
      {arrears > 0 && (
        <>
          <Row label="Arrears (previous dues)" value={rs(arrears)} />
          {v.arrears!.items.slice(0, 6).map((a) => (
            <Row key={a.voucherId} label={`  · ${a.period}`} value={rs(a.balanceDue)} small />
          ))}
          {v.arrears!.items.length > 6 && <Row label={`  · ${v.arrears!.items.length - 6} more`} value="" small />}
        </>
      )}

      <Box sx={{ border: "2px solid #000", borderRadius: "4px", px: 1, py: 0.5, mt: 1 }}>
        <Row label="TOTAL PAYABLE" value={rs(payable)} bold />
      </Box>
      {isPaid && (
        <Typography sx={{ fontFamily: "inherit", textAlign: "center", fontWeight: 800, mt: 1, letterSpacing: 3 }}>
          *** PAID ***
        </Typography>
      )}
      <Divider sx={{ my: 1, borderStyle: "dashed" }} />
      <Box sx={{ textAlign: "center", fontSize: "11px" }}>
        Please pay by the due date.
        {arrears > 0 ? " Payments clear the oldest dues first." : ""}
      </Box>
    </Box>
  );
}
