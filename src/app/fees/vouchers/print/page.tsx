"use client";

// Bulk print: /fees/vouchers/print?ids=a,b,c  → one 80 mm slip per voucher,
// with a page break (paper cut) between them.

import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { ArrowBack as BackIcon, Print as PrintIcon } from "@mui/icons-material";
import VoucherSlip, { SlipVoucher } from "@/components/fees/VoucherSlip";

export default function BulkVoucherPrintPage() {
  const [vouchers, setVouchers] = useState<SlipVoucher[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = new URLSearchParams(window.location.search).get("ids") || "";
    if (!ids) {
      setError("No vouchers selected");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/fee-vouchers/print?ids=${encodeURIComponent(ids)}`);
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to load vouchers");
        setVouchers(d.vouchers || []);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    if (vouchers && vouchers.length > 0) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [vouchers]);

  return (
    <Box sx={{ bgcolor: "#eef1f6", minHeight: "100vh", pb: 4 }}>
      <Box
        className="no-print"
        sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: "white", boxShadow: 1, p: 1.5, display: "flex", gap: 1, alignItems: "center" }}
      >
        <Button startIcon={<BackIcon />} onClick={() => window.history.back()}>
          Back
        </Button>
        <Typography sx={{ flex: 1 }} fontWeight={600}>
          {vouchers ? `${vouchers.length} voucher${vouchers.length === 1 ? "" : "s"}` : "Loading…"}
        </Typography>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()} disabled={!vouchers?.length}>
          Print
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 3 }}>
          {error}
        </Alert>
      )}
      {!vouchers && !error && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {vouchers && (
        <Box id="bulk-voucher-print" sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pt: 2 }}>
          {vouchers.map((v) => (
            <Box key={v.id} sx={{ boxShadow: 2 }}>
              <VoucherSlip voucher={v} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
