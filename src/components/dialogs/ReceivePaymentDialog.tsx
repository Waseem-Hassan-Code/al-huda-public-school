"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  MenuItem,
  Alert,
  Divider,
  Chip,
} from "@mui/material";
import { toast } from "sonner";

interface FeeVoucher {
  id: string;
  voucherNo: string;
  month: number;
  year: number;
  subtotal: number;
  previousBalance: number;
  lateFee: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  dueDate: string;
}

interface Student {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  class?: { name: string };
  section?: { name: string };
}

interface ReceivePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  student: Student;
  voucher: FeeVoucher;
  onSuccess: () => void;
}

const paymentMethods = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
];

const monthNames = [
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

export default function ReceivePaymentDialog({
  open,
  onClose,
  student,
  voucher,
  onSuccess,
}: ReceivePaymentDialogProps) {
  const [amount, setAmount] = useState(voucher.balanceDue.toString());
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const paymentAmount = parseFloat(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (paymentAmount > voucher.balanceDue) {
      setError(
        `Amount cannot exceed balance due (Rs. ${voucher.balanceDue.toLocaleString()})`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          voucherId: voucher.id,
          amount: paymentAmount,
          paymentMethod,
          reference,
          remarks,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to receive payment");
      }

      const data = await response.json();
      toast.success("Payment Received Successfully!", {
        description: `Receipt: ${
          data.receiptNo
        } | Amount: Rs. ${paymentAmount.toLocaleString()}`,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to receive payment", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: "#1a237e", color: "white" }}>
        Receive Payment
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Student Info */}
          <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Student
            </Typography>
            <Typography fontWeight={600}>
              {student.registrationNo} - {student.firstName} {student.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {student.class?.name || "N/A"} - {student.section?.name || "N/A"}
            </Typography>
          </Box>

          {/* Voucher Info */}
          <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Fee Voucher
              </Typography>
              <Chip
                label={voucher.status}
                size="small"
                color={
                  voucher.status === "PAID"
                    ? "success"
                    : voucher.status === "PARTIAL"
                    ? "warning"
                    : "error"
                }
              />
            </Box>
            <Typography fontWeight={600}>{voucher.voucherNo}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {monthNames[voucher.month - 1]} {voucher.year}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography variant="body2">Total Amount:</Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatCurrency(voucher.totalAmount)}
              </Typography>
            </Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography variant="body2">Paid Amount:</Typography>
              <Typography variant="body2" color="success.main" fontWeight={500}>
                {formatCurrency(voucher.paidAmount)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" fontWeight={600}>
                Balance Due:
              </Typography>
              <Typography variant="body2" color="error.main" fontWeight={600}>
                {formatCurrency(voucher.balanceDue)}
              </Typography>
            </Box>
          </Box>

          {/* Payment Form */}
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            fullWidth
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>Rs.</Typography>,
            }}
            helperText={`Max: ${formatCurrency(voucher.balanceDue)}`}
          />

          <TextField
            select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            fullWidth
          >
            {paymentMethods.map((method) => (
              <MenuItem key={method.value} value={method.value}>
                {method.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Reference (Cheque #, Transaction ID, etc.)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            fullWidth
          />

          <TextField
            label="Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={loading || !amount}
        >
          {loading ? "Processing..." : "Receive Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
