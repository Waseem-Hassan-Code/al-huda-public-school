"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  Payment as PaymentIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Receipt as ReceiptIcon,
  CalendarMonth as CalendarIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { formatDate, formatCurrency } from "@/lib/utils";
import ReceivePaymentDialog from "@/components/dialogs/ReceivePaymentDialog";
import VoucherSlip from "@/components/fees/VoucherSlip";
import { periodLabel, rs, round2 } from "@/lib/fee-utils";

interface FeeItem {
  id: string;
  feeType: string;
  description?: string;
  amount: number;
}

interface Payment {
  id: string;
  receiptNo: string;
  receiptGroup?: string | null;
  createdBy?: { name: string } | null;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  remarks?: string;
}

interface Voucher {
  id: string;
  voucherNo: string;
  month: number;
  year: number;
  isOpeningBalance?: boolean;
  subtotal: number;
  previousBalance: number;
  lateFee: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string;
  status: string;
  remarks?: string;
  student: {
    id: string;
    registrationNo: string;
    firstName: string;
    lastName: string;
    fatherName: string;
    guardianName?: string;
    rollNo?: string | null;
    guardianPhone: string;
    class?: { name: string };
    section?: { name: string };
  };
  feeItems: FeeItem[];
  payments: Payment[];
  arrears?: { total: number; items: { voucherId: string; voucherNo: string; period: string; balanceDue: number }[] };
}

const getStatusColor = (
  status: string
): "success" | "warning" | "error" | "info" => {
  switch (status) {
    case "PAID":
      return "success";
    case "PARTIAL":
      return "warning";
    case "OVERDUE":
      return "error";
    default:
      return "info";
  }
};

export default function VoucherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const fetchVoucher = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/fee-vouchers/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch voucher");
      }
      const data = await response.json();
      setVoucher(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVoucher();
  }, [fetchVoucher]);

  const handlePrint = () => {
    window.print();
  };

  // Opened with ?print=1 (e.g. right after admission): print once loaded
  useEffect(() => {
    if (!voucher) return;
    if (new URLSearchParams(window.location.search).get("print") === "1") {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [voucher]);

  if (loading) {
    return (
      <MainLayout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error || !voucher) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error || "Voucher not found"}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
            sx={{ mt: 2 }}
          >
            Go Back
          </Button>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()}>
              Back
            </Button>
            <Typography variant="h4" fontWeight="bold">
              Fee Voucher Details
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
            >
              Print
            </Button>
            <Button
              variant="outlined"
              startIcon={<PersonIcon />}
              onClick={() => router.push(`/students/${voucher.student.id}`)}
            >
              Student
            </Button>
            {(voucher.balanceDue > 0 || (voucher.arrears?.total ?? 0) > 0) && (
              <Button
                variant="contained"
                color="success"
                startIcon={<PaymentIcon />}
                onClick={() => setReceiveOpen(true)}
              >
                Receive Payment
              </Button>
            )}
          </Box>
        </Box>

        {/* Voucher Info Card */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <ReceiptIcon sx={{ fontSize: 48, color: "primary.main" }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {voucher.voucherNo}
                  </Typography>
                  <Typography color="text.secondary">
                    {periodLabel(voucher)}
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={voucher.status}
                color={getStatusColor(voucher.status)}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CalendarIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Issue Date
                      </Typography>
                      <Typography>{formatDate(voucher.issueDate)}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CalendarIcon color="error" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Due Date
                      </Typography>
                      <Typography color="error.main">
                        {formatDate(voucher.dueDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3}>
          {/* Student Info */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <PersonIcon /> Student Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Name
                  </Typography>
                  <Typography fontWeight="bold">
                    {voucher.student.firstName} {voucher.student.lastName}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Registration No
                  </Typography>
                  <Typography>{voucher.student.registrationNo}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Father Name
                  </Typography>
                  <Typography>{voucher.student.fatherName}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Class / Section
                  </Typography>
                  <Typography>
                    {voucher.student.class?.name || "N/A"} -{" "}
                    {voucher.student.section?.name || "N/A"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Contact
                  </Typography>
                  <Typography>{voucher.student.guardianPhone}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Fee Details */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ReceiptIcon /> Fee Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fee Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {voucher.feeItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.feeType}</TableCell>
                          <TableCell>{item.description || "-"}</TableCell>
                          <TableCell align="right">
                            Rs. {item.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2}>
                          <strong>Subtotal</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>
                            Rs. {voucher.subtotal.toLocaleString()}
                          </strong>
                        </TableCell>
                      </TableRow>
                      {voucher.lateFee > 0 && (
                        <TableRow>
                          <TableCell colSpan={2}>Late Fee</TableCell>
                          <TableCell align="right" sx={{ color: "error.main" }}>
                            Rs. {voucher.lateFee.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )}
                      {voucher.discount > 0 && (
                        <TableRow>
                          <TableCell colSpan={2}>Discount</TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: "success.main" }}
                          >
                            - Rs. {voucher.discount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow sx={{ bgcolor: "primary.light" }}>
                        <TableCell colSpan={2}>
                          <strong>Total Amount</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>
                            Rs. {voucher.totalAmount.toLocaleString()}
                          </strong>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={2}>Paid Amount</TableCell>
                        <TableCell align="right" sx={{ color: "success.main" }}>
                          Rs. {voucher.paidAmount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                      <TableRow
                        sx={{
                          bgcolor:
                            voucher.balanceDue > 0
                              ? "error.light"
                              : "success.light",
                        }}
                      >
                        <TableCell colSpan={2}>
                          <strong>Balance Due</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>
                            Rs. {voucher.balanceDue.toLocaleString()}
                          </strong>
                        </TableCell>
                      </TableRow>
                      {(voucher.arrears?.total ?? 0) > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={2}>
                              Arrears (previous dues)
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                {voucher.arrears!.items
                                  .map((a) => `${a.period}: ${rs(a.balanceDue)}`)
                                  .join(" · ")}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ color: "error.main" }}>
                              {rs(voucher.arrears!.total)}
                            </TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: "warning.light" }}>
                            <TableCell colSpan={2}>
                              <strong>Total payable (incl. arrears)</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>{rs(round2(voucher.balanceDue + voucher.arrears!.total))}</strong>
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment History */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <PaymentIcon /> Payment History
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {voucher.payments && voucher.payments.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Receipt No</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Received by</TableCell>
                          <TableCell>Remarks</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {voucher.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <Button
                                size="small"
                                startIcon={<PrintIcon fontSize="small" />}
                                onClick={() =>
                                  router.push(`/fees/receipts/${encodeURIComponent(payment.receiptGroup || payment.receiptNo)}`)
                                }
                              >
                                {payment.receiptNo}
                              </Button>
                            </TableCell>
                            <TableCell>
                              {formatDate(payment.paymentDate)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={payment.paymentMethod}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              Rs. {payment.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>{payment.createdBy?.name || "-"}</TableCell>
                            <TableCell>{payment.remarks || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography
                    color="text.secondary"
                    sx={{ textAlign: "center", py: 3 }}
                  >
                    No payments recorded yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {voucher.remarks && (
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Remarks
            </Typography>
            <Typography>{voucher.remarks}</Typography>
          </Paper>
        )}
      </Box>

      {/* 80 mm slip used when printing (screen: off-screen) */}
      <Box sx={{ position: "fixed", left: "-9999px", top: 0 }}>
        <VoucherSlip id="fee-voucher-print" voucher={voucher as any} />
      </Box>

      <ReceivePaymentDialog
        open={receiveOpen}
        studentId={voucher.student.id}
        focusVoucherId={voucher.id}
        onClose={() => setReceiveOpen(false)}
        onSuccess={() => fetchVoucher(true)}
      />
    </MainLayout>
  );
}
