"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import SimpleTable, { SimpleColumn } from "@/components/common/SimpleTable";
import { debounce, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Payment {
  id: string;
  paymentNo: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
  remarks?: string;
  createdAt: string;
  voucher: {
    id: string;
    voucherNo: string;
    student: {
      id: string;
      registrationNo: string;
      firstName: string;
      lastName: string;
      class: { name: string };
    };
  };
  receivedBy?: {
    name: string;
  };
}

interface FeeVoucher {
  id: string;
  voucherNo: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  student: {
    id: string;
    registrationNo: string;
    firstName: string;
    lastName: string;
    class: { name: string };
  };
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online Payment" },
];

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<FeeVoucher | null>(
    null
  );
  const [searchVoucher, setSearchVoucher] = useState("");
  const [formData, setFormData] = useState({
    voucherId: "",
    amount: 0,
    paymentMethod: "CASH",
    reference: "",
    remarks: "",
  });

  const fetchPayments = useCallback(async (searchQuery = "", method = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (method) params.append("paymentMethod", method);

      const response = await fetch(`/api/fee-payments?${params}`);
      const data = await response.json();
      if (response.ok) {
        setPayments(data.payments || []);
      } else {
        toast.error(data.error || "Failed to fetch payments");
      }
    } catch (error) {
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  }, []);

  const searchVouchers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setVouchers([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append("search", query);
      params.append("status", "UNPAID,PARTIAL");

      const response = await fetch(`/api/fee-vouchers?${params}`);
      const data = await response.json();
      if (response.ok) {
        setVouchers(data.vouchers || []);
      }
    } catch (error) {
      console.error("Failed to search vouchers:", error);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPayments();
    }
  }, [status, fetchPayments]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      fetchPayments(value, filterMethod);
    }, 300),
    [fetchPayments, filterMethod]
  );

  const debouncedVoucherSearch = useCallback(
    debounce((value: string) => {
      searchVouchers(value);
    }, 300),
    [searchVouchers]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleVoucherSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchVoucher(e.target.value);
    debouncedVoucherSearch(e.target.value);
  };

  const handleMethodFilterChange = (method: string) => {
    setFilterMethod(method);
    fetchPayments(search, method);
  };

  const handleSelectVoucher = (voucher: FeeVoucher) => {
    setSelectedVoucher(voucher);
    setFormData({
      ...formData,
      voucherId: voucher.id,
      amount: voucher.totalAmount - voucher.paidAmount,
    });
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setViewDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!formData.voucherId || formData.amount <= 0) {
      toast.error("Please select a voucher and enter a valid amount");
      return;
    }

    try {
      const response = await fetch("/api/fee-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Payment recorded successfully");
        setAddDialogOpen(false);
        setSelectedVoucher(null);
        setFormData({
          voucherId: "",
          amount: 0,
          paymentMethod: "CASH",
          reference: "",
          remarks: "",
        });
        fetchPayments(search, filterMethod);
      } else {
        toast.error(data.error || "Failed to record payment");
      }
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  const columns: SimpleColumn[] = [
    { id: "paymentNo", label: "Payment No", width: 120 },
    {
      id: "student",
      label: "Student",
      render: (row: Payment) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {row.voucher.student.firstName} {row.voucher.student.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.voucher.student.registrationNo}
          </Typography>
        </Box>
      ),
    },
    {
      id: "voucher",
      label: "Voucher",
      render: (row: Payment) => row.voucher.voucherNo,
    },
    {
      id: "amount",
      label: "Amount",
      render: (row: Payment) => formatCurrency(row.amount),
    },
    {
      id: "paymentMethod",
      label: "Method",
      render: (row: Payment) => (
        <Chip
          label={
            PAYMENT_METHODS.find((m) => m.value === row.paymentMethod)?.label ||
            row.paymentMethod
          }
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: "paymentDate",
      label: "Date",
      render: (row: Payment) => formatDate(row.paymentDate),
    },
    {
      id: "receivedBy",
      label: "Received By",
      render: (row: Payment) => row.receivedBy?.name || "-",
    },
    {
      id: "actions",
      label: "Actions",
      width: 100,
      render: (row: Payment) => (
        <Box>
          <IconButton size="small" onClick={() => handleViewPayment(row)}>
            <ViewIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => toast.info("Print functionality coming soon")}
          >
            <PrintIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (status === "loading") {
    return (
      <MainLayout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <Typography>Loading...</Typography>
        </Box>
      </MainLayout>
    );
  }

  // Calculate totals
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const todayPayments = payments.filter(
    (p) => new Date(p.paymentDate).toDateString() === new Date().toDateString()
  );
  const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4" fontWeight="bold">
            Fee Payments
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Record Payment
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Payments
                </Typography>
                <Typography variant="h4">{payments.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Collected
                </Typography>
                <Typography variant="h5" color="success.main">
                  {formatCurrency(totalCollected)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Today's Payments
                </Typography>
                <Typography variant="h4">{todayPayments.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Today's Collection
                </Typography>
                <Typography variant="h5" color="primary.main">
                  {formatCurrency(todayTotal)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                placeholder="Search by payment no, student name..."
                value={search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={filterMethod}
                  label="Payment Method"
                  onChange={(e) => handleMethodFilterChange(e.target.value)}
                >
                  <MenuItem value="">All Methods</MenuItem>
                  {PAYMENT_METHODS.map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      {method.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Payments Table */}
        <Paper sx={{ p: 2 }}>
          <SimpleTable
            columns={columns}
            rows={payments}
            loading={loading}
            emptyMessage="No payments found"
          />
        </Paper>

        {/* Record Payment Dialog */}
        <Dialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Record Fee Payment</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Search Voucher (by voucher no or student name)"
                  value={searchVoucher}
                  onChange={handleVoucherSearchChange}
                  placeholder="Type to search..."
                />
              </Grid>

              {vouchers.length > 0 && !selectedVoucher && (
                <Grid size={{ xs: 12 }}>
                  <Paper
                    variant="outlined"
                    sx={{ maxHeight: 200, overflow: "auto" }}
                  >
                    {vouchers.map((voucher) => (
                      <Box
                        key={voucher.id}
                        sx={{
                          p: 2,
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                        onClick={() => handleSelectVoucher(voucher)}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {voucher.voucherNo} - {voucher.student.firstName}{" "}
                          {voucher.student.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Balance:{" "}
                          {formatCurrency(
                            voucher.totalAmount - voucher.paidAmount
                          )}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
              )}

              {selectedVoucher && (
                <Grid size={{ xs: 12 }}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: "action.hover" }}
                  >
                    <Typography variant="subtitle2">
                      Selected Voucher
                    </Typography>
                    <Typography>
                      {selectedVoucher.voucherNo} -{" "}
                      {selectedVoucher.student.firstName}{" "}
                      {selectedVoucher.student.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total: {formatCurrency(selectedVoucher.totalAmount)} |
                      Paid: {formatCurrency(selectedVoucher.paidAmount)} |
                      Balance:{" "}
                      {formatCurrency(
                        selectedVoucher.totalAmount - selectedVoucher.paidAmount
                      )}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedVoucher(null);
                        setFormData({ ...formData, voucherId: "", amount: 0 });
                      }}
                      sx={{ mt: 1 }}
                    >
                      Change Voucher
                    </Button>
                  </Paper>
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount (PKR)"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={formData.paymentMethod}
                    label="Payment Method"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: e.target.value,
                      })
                    }
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <MenuItem key={method.value} value={method.value}>
                        {method.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Reference (Cheque No / Transaction ID)"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSubmitPayment}
              disabled={!formData.voucherId || formData.amount <= 0}
            >
              Record Payment
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Payment Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Payment Details - {selectedPayment?.paymentNo}
          </DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Student
                    </Typography>
                    <Typography>
                      {selectedPayment.voucher.student.firstName}{" "}
                      {selectedPayment.voucher.student.lastName}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Registration No
                    </Typography>
                    <Typography>
                      {selectedPayment.voucher.student.registrationNo}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Voucher No
                    </Typography>
                    <Typography>{selectedPayment.voucher.voucherNo}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Amount
                    </Typography>
                    <Typography fontWeight="bold" color="success.main">
                      {formatCurrency(selectedPayment.amount)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Method
                    </Typography>
                    <Typography>
                      {
                        PAYMENT_METHODS.find(
                          (m) => m.value === selectedPayment.paymentMethod
                        )?.label
                      }
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Date
                    </Typography>
                    <Typography>
                      {formatDate(selectedPayment.paymentDate)}
                    </Typography>
                  </Grid>
                  {selectedPayment.reference && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary">
                        Reference
                      </Typography>
                      <Typography>{selectedPayment.reference}</Typography>
                    </Grid>
                  )}
                  {selectedPayment.remarks && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary">
                        Remarks
                      </Typography>
                      <Typography>{selectedPayment.remarks}</Typography>
                    </Grid>
                  )}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      Received By
                    </Typography>
                    <Typography>
                      {selectedPayment.receivedBy?.name || "-"}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<PrintIcon />}
              onClick={() => toast.info("Print functionality coming soon")}
            >
              Print Receipt
            </Button>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
