"use client";

// Printable receipt for one counter transaction (all vouchers it paid), laid out
// as bordered tables on the 80 mm thermal printer (#payment-receipt-print).

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, CircularProgress, Paper } from "@mui/material";
import { ArrowBack as BackIcon, Print as PrintIcon } from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { PrintHeader, PrintSheet, PrintTable } from "@/components/print/PrintBlocks";
import { monthYearLabel, rs, round2 } from "@/lib/fee-utils";

interface Receipt {
  receiptNo: string;
  paymentDate: string;
  paymentMethod: string;
  reference?: string | null;
  remarks?: string | null;
  receivedBy?: string | null;
  student: {
    id: string;
    registrationNo: string;
    firstName: string;
    lastName: string;
    fatherName?: string;
    guardianName?: string;
    class?: { name: string } | null;
    section?: { name: string } | null;
  };
  lines: { receiptNo: string; voucherNo: string; period: string; amount: number; voucherBalanceNow: number }[];
  total: number;
  outstandingNow: number;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  ONLINE: "Online",
  EASYPAISA: "Easypaisa",
  JAZZCASH: "JazzCash",
  CREDIT_CARD: "Card",
};

export default function ReceiptPage({ params }: { params: Promise<{ receiptNo: string }> }) {
  const { receiptNo } = use(params);
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/receipts/${encodeURIComponent(decodeURIComponent(receiptNo))}`);
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Receipt not found");
        setReceipt(d);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [receiptNo]);

  // Opened with ?print=1 (e.g. right after receiving a payment)
  useEffect(() => {
    if (!receipt) return;
    if (new URLSearchParams(window.location.search).get("print") === "1") {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [receipt]);

  const r = receipt;
  // Everything owed before this payment = paid now + still outstanding
  const duesBefore = r ? round2(r.total + r.outstandingNow) : 0;

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
          <Button startIcon={<BackIcon />} onClick={() => router.back()}>
            Back
          </Button>
          <Box sx={{ flex: 1 }} />
          {r && (
            <>
              <Button variant="outlined" onClick={() => router.push(`/students/${r.student.id}`)}>
                Student profile
              </Button>
              <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
                Print
              </Button>
            </>
          )}
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {!r && !error && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {r && (
          <Paper sx={{ width: "80mm", mx: "auto" }} elevation={3}>
            <PrintSheet id="payment-receipt-print">
              <PrintHeader
                title="FEE RECEIPT"
                subtitle={`Receipt # ${r.receiptNo} · ${new Date(r.paymentDate).toLocaleDateString("en-PK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}`}
              />

              <PrintTable
                rows={[
                  { label: "Student", value: `${r.student.firstName} ${r.student.lastName}` },
                  { label: "Reg #", value: r.student.registrationNo },
                  ...(r.student.fatherName || r.student.guardianName
                    ? [{ label: "Father/Guardian", value: r.student.fatherName || r.student.guardianName }]
                    : []),
                  {
                    label: "Class",
                    value: `${r.student.class?.name ?? "-"}${r.student.section ? ` - ${r.student.section.name}` : ""}`,
                  },
                ]}
              />

              <PrintTable
                header={["Paid for", "Amount"]}
                rows={[
                  ...r.lines.map((l) => ({
                    label: l.period === "Opening Balance" ? "Previous dues" : l.period,
                    value: rs(l.amount),
                  })),
                ]}
              />

              <PrintTable
                rows={[
                  { label: `Total dues up to ${monthYearLabel(r.paymentDate)}`, value: rs(duesBefore) },
                  {
                    label: `Paid (${METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}${r.reference ? `, ${r.reference}` : ""})`,
                    value: rs(r.total),
                  },
                  { label: "BALANCE REMAINING", value: rs(r.outstandingNow), total: true },
                ]}
              />

              {r.remarks && <Box sx={{ fontSize: "12px", mb: 0.5 }}>Note: {r.remarks}</Box>}
              <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "11px", mt: 1 }}>
                <span>{r.receivedBy ? `Received by: ${r.receivedBy}` : ""}</span>
                <span>Thank you!</span>
              </Box>
            </PrintSheet>
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
}
