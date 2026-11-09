"use client";

// Printable receipt for one counter transaction (all vouchers it paid).
// Prints on the 80 mm thermal printer like the other receipts (#payment-receipt-print).

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, CircularProgress, Divider, Paper, Typography } from "@mui/material";
import { ArrowBack as BackIcon, Print as PrintIcon } from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { rs } from "@/lib/fee-utils";

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

const Row = ({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, fontWeight: bold ? 800 : 600 }}>
    <span>{label}</span>
    <span style={{ textAlign: "right" }}>{value}</span>
  </Box>
);

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

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
          <Button startIcon={<BackIcon />} onClick={() => router.back()}>
            Back
          </Button>
          <Box sx={{ flex: 1 }} />
          {receipt && (
            <>
              <Button variant="outlined" onClick={() => router.push(`/students/${receipt.student.id}`)}>
                Student profile
              </Button>
              <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
                Print
              </Button>
            </>
          )}
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {!receipt && !error && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {receipt && (
          <Paper sx={{ width: "80mm", mx: "auto", p: 0 }} elevation={3}>
            <Box
              id="payment-receipt-print"
              sx={{ p: "10px", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.6, fontWeight: 600 }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontFamily: "inherit", fontWeight: 800, fontSize: "15px", textTransform: "uppercase" }}>
                  Al-Huda Public School and College Meithakheil
                </Typography>
                <Typography sx={{ fontFamily: "inherit", fontWeight: 700 }}>Fee Payment Receipt</Typography>
              </Box>
              <Divider sx={{ my: 1, borderStyle: "dashed" }} />
              <Row label="Receipt #" value={receipt.receiptNo} />
              <Row
                label="Date"
                value={new Date(receipt.paymentDate).toLocaleDateString("en-PK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              />
              <Divider sx={{ my: 1, borderStyle: "dashed" }} />
              <Row label="Student" value={`${receipt.student.firstName} ${receipt.student.lastName}`} />
              <Row label="Reg #" value={receipt.student.registrationNo} />
              {(receipt.student.fatherName || receipt.student.guardianName) && (
                <Row label="Father/Guardian" value={receipt.student.fatherName || receipt.student.guardianName} />
              )}
              <Row
                label="Class"
                value={`${receipt.student.class?.name ?? "-"}${receipt.student.section ? ` - ${receipt.student.section.name}` : ""}`}
              />
              <Divider sx={{ my: 1, borderStyle: "dashed" }} />
              <Typography sx={{ fontFamily: "inherit", fontWeight: 800 }}>Paid for</Typography>
              {receipt.lines.map((l) => (
                <Row key={l.receiptNo} label={l.period} value={rs(l.amount)} />
              ))}
              <Divider sx={{ my: 1 }} />
              <Row label="TOTAL PAID" value={rs(receipt.total)} bold />
              <Row
                label="Method"
                value={`${METHOD_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod}${receipt.reference ? ` (${receipt.reference})` : ""}`}
              />
              <Divider sx={{ my: 1, borderStyle: "dashed" }} />
              <Row label="Balance remaining" value={rs(receipt.outstandingNow)} bold />
              {receipt.remarks && (
                <Typography sx={{ fontFamily: "inherit", fontSize: "12px", mt: 0.5 }}>Note: {receipt.remarks}</Typography>
              )}
              <Divider sx={{ my: 1, borderStyle: "dashed" }} />
              <Box sx={{ textAlign: "center", fontSize: "11px" }}>
                {receipt.receivedBy ? `Received by ${receipt.receivedBy}` : ""}
                <br />
                Thank you!
              </Box>
            </Box>
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
}
