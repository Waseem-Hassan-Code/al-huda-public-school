"use client";

// Receive Payment: one amount for a student, applied to the oldest dues first
// (opening balance → oldest month → newest), with a live preview of where the
// money goes and a printable receipt afterwards.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import { previewAllocation, rs, round2 } from "@/lib/fee-utils";

interface DueVoucher {
  id: string;
  voucherNo: string;
  month: number;
  year: number;
  isOpeningBalance: boolean;
  period: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  dueDate: string;
}

interface DuesResponse {
  student: {
    id: string;
    registrationNo: string;
    firstName: string;
    lastName: string;
    photo?: string | null;
    guardianName?: string;
    guardianPhone?: string;
    monthlyFee: number;
    class?: { name: string } | null;
    section?: { name: string } | null;
  };
  vouchers: DueVoucher[];
  totalOutstanding: number;
  recentPayments: { id: string; receiptNo: string; receiptGroup?: string | null; amount: number; paymentDate: string; paymentMethod: string }[];
}

export interface PaymentResult {
  primaryReceiptNo: string;
  totalApplied: number;
  outstandingAfter: number;
  allocations: { voucherId: string; voucherNo: string; period: string; appliedAmount: number; newBalanceDue: number; newStatus: string }[];
}

interface ReceivePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  /** Student to receive from */
  studentId: string | null;
  /** Optional voucher the user clicked: offered as a "pay up to this month" shortcut */
  focusVoucherId?: string | null;
  /** Called after a payment is saved and the dialog is closed */
  onSuccess?: (result: PaymentResult) => void;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
];

const today = () => new Date().toISOString().split("T")[0];

export default function ReceivePaymentDialog({
  open,
  onClose,
  studentId,
  focusVoucherId,
  onSuccess,
}: ReceivePaymentDialogProps) {
  const [data, setData] = useState<DuesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(today());
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);

  // Amount needed to clear everything up to and including a voucher
  const amountThrough = useCallback((vouchers: DueVoucher[], voucherId: string) => {
    let sum = 0;
    for (const v of vouchers) {
      sum += v.balanceDue;
      if (v.id === voucherId) return round2(sum);
    }
    return null;
  }, []);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/dues`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load dues");
      setData(d);
      const through = focusVoucherId ? amountThrough(d.vouchers, focusVoucherId) : null;
      setAmount(String(through ?? d.totalOutstanding ?? 0));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [studentId, focusVoucherId, amountThrough]);

  // Fresh state every time the dialog opens
  useEffect(() => {
    if (!open) return;
    setData(null);
    setResult(null);
    setPaymentMethod("CASH");
    setPaymentDate(today());
    setReference("");
    setRemarks("");
    setError(null);
    void load();
  }, [open, load]);

  const numericAmount = round2(parseFloat(amount) || 0);
  const total = data?.totalOutstanding ?? 0;
  const preview = useMemo(
    () => previewAllocation(data?.vouchers ?? [], numericAmount),
    [data, numericAmount]
  );
  const remainingAfter = round2(Math.max(0, total - numericAmount));
  const tooMuch = numericAmount > total + 0.005;
  const canSubmit = !!data && numericAmount > 0 && !tooMuch && !submitting;

  const shortcuts = useMemo(() => {
    if (!data || data.vouchers.length === 0) return [];
    const list: { label: string; value: number }[] = [{ label: "Full balance", value: total }];
    if (focusVoucherId) {
      const through = amountThrough(data.vouchers, focusVoucherId);
      const v = data.vouchers.find((x) => x.id === focusVoucherId);
      if (through !== null && v && through !== total) list.push({ label: `Up to ${v.period}`, value: through });
    }
    const oldest = data.vouchers[0];
    if (oldest.balanceDue !== total) list.push({ label: `Oldest only (${oldest.period})`, value: round2(oldest.balanceDue) });
    if (data.student.monthlyFee > 0 && data.student.monthlyFee < total) {
      list.push({ label: "One month's fee", value: data.student.monthlyFee });
    }
    // Remove duplicates by value
    return list.filter((s, i) => list.findIndex((x) => x.value === s.value) === i);
  }, [data, total, focusVoucherId, amountThrough]);

  const handleSubmit = async () => {
    if (!canSubmit || !data) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/fee-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: data.student.id,
          amount: numericAmount,
          paymentMethod,
          paymentDate,
          transactionId: reference.trim() || undefined,
          notes: remarks.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to receive payment");
      setResult(d);
      toast.success(`Rs. ${d.totalApplied.toLocaleString()} received`, {
        description: `Receipt ${d.primaryReceiptNo}`,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (submitting) return;
    if (result) onSuccess?.(result);
    onClose();
  };

  const printReceipt = (receiptNo: string) =>
    window.open(`/fees/receipts/${encodeURIComponent(receiptNo)}?print=1`, "_blank");

  const s = data?.student;

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: "#1a237e", color: "white", display: "flex", alignItems: "center", gap: 1 }}>
        {result ? "Payment received" : "Receive Payment"}
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={close} sx={{ color: "white" }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: "16px !important" }}>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && !data && <Alert severity="error">{error}</Alert>}

        {!loading && s && (
          <>
            {/* Student */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Avatar src={s.photo || undefined} sx={{ width: 48, height: 48 }}>
                {s.firstName?.[0]}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700}>
                  {s.firstName} {s.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.registrationNo} · {s.class?.name ?? "No class"}
                  {s.section ? ` - ${s.section.name}` : ""}
                  {s.guardianName ? ` · ${s.guardianName}` : ""}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" color="text.secondary">
                  {result ? "Remaining balance" : "Total outstanding"}
                </Typography>
                <Typography variant="h5" fontWeight={800} color={(result ? result.outstandingAfter : total) > 0 ? "error.main" : "success.main"}>
                  {rs(result ? result.outstandingAfter : total)}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {/* ── After saving ─────────────────────────────── */}
            {result ? (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {rs(result.totalApplied)} received
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receipt {result.primaryReceiptNo}
                    </Typography>
                  </Box>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Applied to</TableCell>
                      <TableCell align="right">Paid now</TableCell>
                      <TableCell align="right">Left on it</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.allocations.map((a) => (
                      <TableRow key={a.voucherId}>
                        <TableCell>
                          {a.period}
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {a.voucherNo}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ color: "success.main", fontWeight: 600 }}>
                          {rs(a.appliedAmount)}
                        </TableCell>
                        <TableCell align="right">
                          {a.newBalanceDue > 0 ? rs(a.newBalanceDue) : <Chip size="small" color="success" label="Cleared" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : data && data.vouchers.length === 0 ? (
              <Alert severity="success">This student has no outstanding dues.</Alert>
            ) : (
              /* ── Before saving ─────────────────────────────── */
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Stack spacing={2}>
                    <TextField
                      label="Amount received"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      autoFocus
                      fullWidth
                      error={tooMuch}
                      helperText={tooMuch ? `More than the total outstanding (${rs(total)})` : `Up to ${rs(total)}`}
                      InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>Rs.</Typography> }}
                      inputProps={{ min: 0, step: "any", style: { fontSize: 22, fontWeight: 700 } }}
                    />
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {shortcuts.map((sc) => (
                        <Chip
                          key={sc.label}
                          label={`${sc.label}: ${rs(sc.value)}`}
                          onClick={() => setAmount(String(sc.value))}
                          color={numericAmount === sc.value ? "primary" : "default"}
                          variant={numericAmount === sc.value ? "filled" : "outlined"}
                          size="small"
                        />
                      ))}
                    </Box>
                    <TextField
                      select
                      label="Payment method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      fullWidth
                      size="small"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Payment date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      size="small"
                    />
                    {paymentMethod !== "CASH" && (
                      <TextField
                        label="Reference (cheque no. / transaction ID)"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    )}
                    <TextField
                      label="Remarks (optional)"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Where the money goes (oldest dues first)
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Due</TableCell>
                        <TableCell align="right">Owed</TableCell>
                        <TableCell align="right">Pays</TableCell>
                        <TableCell align="right">Left</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.allocations.map(({ voucher: v, applied, remaining, willBePaid }) => (
                        <TableRow
                          key={v.id}
                          selected={v.id === focusVoucherId}
                          sx={{ opacity: applied > 0 ? 1 : 0.55 }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={v.isOpeningBalance ? 700 : 500}>
                              {v.period}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {v.voucherNo}
                              {v.status === "PARTIAL" ? " · part paid" : ""}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{rs(v.balanceDue)}</TableCell>
                          <TableCell align="right" sx={{ color: applied > 0 ? "success.main" : "text.disabled", fontWeight: 600 }}>
                            {applied > 0 ? rs(applied) : "-"}
                          </TableCell>
                          <TableCell align="right">
                            {applied > 0 && willBePaid ? (
                              <Chip size="small" color="success" label="Cleared" />
                            ) : (
                              rs(remaining)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: (t) => alpha(remainingAfter > 0 ? t.palette.warning.main : t.palette.success.main, 0.08),
                      border: 1,
                      borderColor: remainingAfter > 0 ? "warning.light" : "success.light",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="body2">
                      Paying <strong>{rs(Math.min(numericAmount, total))}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Balance after: <strong>{rs(remainingAfter)}</strong>
                    </Typography>
                  </Box>
                  {data && data.recentPayments.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                      Last payment: {rs(data.recentPayments[0].amount)} on{" "}
                      {new Date(data.recentPayments[0].paymentDate).toLocaleDateString("en-PK")} (
                      {data.recentPayments[0].receiptGroup || data.recentPayments[0].receiptNo})
                    </Typography>
                  )}
                </Grid>
              </Grid>
            )}

            {error && data && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {result ? (
          <>
            <Button startIcon={<PrintIcon />} onClick={() => printReceipt(result.primaryReceiptNo)}>
              Print receipt
            </Button>
            <Button variant="contained" onClick={close}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              disabled={!canSubmit}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {submitting ? "Saving…" : `Receive ${numericAmount > 0 ? rs(numericAmount) : ""}`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
