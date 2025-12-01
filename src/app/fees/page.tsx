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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Print as PrintIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import SimpleTable, { SimpleColumn } from "@/components/common/SimpleTable";
import StatusBadge from "@/components/common/StatusBadge";
import {
  formatCurrency,
  formatDate,
  debounce,
  getMonthName,
} from "@/lib/utils";
import { toast } from "sonner";

interface FeeVoucher {
  id: string;
  voucherNumber: string;
  month: number;
  year: number;
  totalAmount: number;
  paidAmount: number;
  previousBalance: number;
  status: string;
  dueDate: string;
  student: {
    id: string;
    registrationNo: string;
    firstName: string;
    lastName: string;
    class: { name: string };
    section: { name: string };
  };
}

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

export default function FeesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(
    new Date().getFullYear().toString()
  );
  const [classes, setClasses] = useState<ClassOption[]>([]);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<FeeVoucher | null>(
    null
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Generate dialog state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(
    (new Date().getMonth() + 1).toString()
  );
  const [generateYear, setGenerateYear] = useState(
    new Date().getFullYear().toString()
  );
  const [generateClassId, setGenerateClassId] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch("/api/classes");
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      }
    };

    if (status === "authenticated") {
      fetchClasses();
    }
  }, [status]);

  // Fetch vouchers
  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (monthFilter) params.append("month", monthFilter);
      if (yearFilter) params.append("year", yearFilter);

      const response = await fetch(`/api/fee-vouchers?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setVouchers(data.data || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch vouchers:", error);
      toast.error("Failed to load fee vouchers");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, monthFilter, yearFilter]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchVouchers();
    }
  }, [status, fetchVouchers]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  const handlePayment = async () => {
    if (!selectedVoucher || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    const remaining = selectedVoucher.totalAmount - selectedVoucher.paidAmount;

    if (amount <= 0 || amount > remaining) {
      toast.error(
        `Invalid amount. Maximum allowed: ${formatCurrency(remaining)}`
      );
      return;
    }

    try {
      setPaymentProcessing(true);
      const response = await fetch("/api/fee-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherId: selectedVoucher.id,
          amount,
          paymentMethod,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Payment recorded. Receipt: ${data.receiptNumber}`);
        setPaymentDialogOpen(false);
        setSelectedVoucher(null);
        setPaymentAmount("");
        fetchVouchers();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to record payment");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleGenerateVouchers = async () => {
    try {
      setGenerating(true);
      const response = await fetch("/api/fee-vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: parseInt(generateMonth),
          year: parseInt(generateYear),
          classId: generateClassId || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setGenerateDialogOpen(false);
        fetchVouchers();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to generate vouchers");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setGenerating(false);
    }
  };

  const columns: SimpleColumn<FeeVoucher>[] = [
    {
      id: "voucherNumber",
      label: "Voucher #",
      minWidth: 130,
    },
    {
      id: "student",
      label: "Student",
      minWidth: 200,
      renderCell: (row: FeeVoucher) => (
        <Box>
          <Typography variant="body2" fontWeight="500">
            {row.student.firstName} {row.student.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.student.registrationNo} • {row.student.class.name}-
            {row.student.section.name}
          </Typography>
        </Box>
      ),
    },
    {
      id: "month",
      label: "Period",
      minWidth: 120,
      renderCell: (row: FeeVoucher) =>
        `${getMonthName(row.month - 1)} ${row.year}`,
    },
    {
      id: "totalAmount",
      label: "Total",
      minWidth: 120,
      renderCell: (row: FeeVoucher) => formatCurrency(row.totalAmount),
    },
    {
      id: "paidAmount",
      label: "Paid",
      minWidth: 120,
      renderCell: (row: FeeVoucher) => (
        <Typography
          color={row.paidAmount > 0 ? "success.main" : "text.secondary"}
        >
          {formatCurrency(row.paidAmount)}
        </Typography>
      ),
    },
    {
      id: "balance",
      label: "Balance",
      minWidth: 120,
      renderCell: (row: FeeVoucher) => (
        <Typography
          color={
            row.totalAmount - row.paidAmount > 0 ? "error.main" : "success.main"
          }
        >
          {formatCurrency(row.totalAmount - row.paidAmount)}
        </Typography>
      ),
    },
    {
      id: "dueDate",
      label: "Due Date",
      minWidth: 120,
      renderCell: (row: FeeVoucher) => formatDate(row.dueDate),
    },
    {
      id: "status",
      label: "Status",
      minWidth: 100,
      renderCell: (row: FeeVoucher) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      label: "Actions",
      minWidth: 150,
      renderCell: (row: FeeVoucher) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Collect Payment">
            <span>
              <IconButton
                size="small"
                color="primary"
                disabled={row.status === "PAID"}
                onClick={() => {
                  setSelectedVoucher(row);
                  setPaymentAmount(
                    (row.totalAmount - row.paidAmount).toString()
                  );
                  setPaymentDialogOpen(true);
                }}
              >
                <PaymentIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="View Student">
            <IconButton
              size="small"
              onClick={() => router.push(`/students/${row.student.id}`)}
            >
              <ReceiptIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print Voucher">
            <IconButton size="small">
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: getMonthName(i),
  }));

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
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              Fee Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage fee vouchers and collect payments
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<DownloadIcon />}>
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setGenerateDialogOpen(true)}
            >
              Generate Vouchers
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="All Vouchers" />
            <Tab label="Pending" onClick={() => setStatusFilter("PENDING")} />
            <Tab label="Partial" onClick={() => setStatusFilter("PARTIAL")} />
            <Tab label="Overdue" onClick={() => setStatusFilter("OVERDUE")} />
            <Tab label="Paid" onClick={() => setStatusFilter("PAID")} />
          </Tabs>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <TextField
              placeholder="Search by name or voucher..."
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              onChange={(e) => debouncedSearch(e.target.value)}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={monthFilter}
                label="Month"
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All Months</MenuItem>
                {months.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={yearFilter}
                label="Year"
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setPage(1);
                }}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y.toString()}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="PARTIAL">Partial</MenuItem>
                <MenuItem value="PAID">Paid</MenuItem>
                <MenuItem value="OVERDUE">Overdue</MenuItem>
              </Select>
            </FormControl>
            {(monthFilter || statusFilter) && (
              <Button
                size="small"
                onClick={() => {
                  setMonthFilter("");
                  setStatusFilter("");
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        </Paper>

        {/* Data Grid */}
        <SimpleTable<FeeVoucher>
          columns={columns}
          rows={vouchers}
          loading={loading}
          page={page}
          pageSize={limit}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size: number) => {
            setLimit(size);
            setPage(1);
          }}
        />

        {/* Payment Dialog */}
        <Dialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Collect Payment</DialogTitle>
          <DialogContent>
            {selectedVoucher && (
              <Box sx={{ pt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {selectedVoucher.student.firstName}{" "}
                  {selectedVoucher.student.lastName} (
                  {selectedVoucher.student.registrationNo})
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Voucher: {selectedVoucher.voucherNumber} •{" "}
                  {getMonthName(selectedVoucher.month - 1)}{" "}
                  {selectedVoucher.year}
                </Typography>
                <Box sx={{ display: "flex", gap: 2, my: 2 }}>
                  <Paper sx={{ p: 2, flex: 1, bgcolor: "grey.100" }}>
                    <Typography variant="caption">Total Amount</Typography>
                    <Typography variant="h6">
                      {formatCurrency(selectedVoucher.totalAmount)}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, flex: 1, bgcolor: "success.light" }}>
                    <Typography variant="caption">Paid</Typography>
                    <Typography variant="h6">
                      {formatCurrency(selectedVoucher.paidAmount)}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, flex: 1, bgcolor: "error.light" }}>
                    <Typography variant="caption">Balance</Typography>
                    <Typography variant="h6">
                      {formatCurrency(
                        selectedVoucher.totalAmount - selectedVoucher.paidAmount
                      )}
                    </Typography>
                  </Paper>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <TextField
                      label="Payment Amount"
                      type="number"
                      fullWidth
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">Rs</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={paymentMethod}
                        label="Payment Method"
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <MenuItem value="CASH">Cash</MenuItem>
                        <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                        <MenuItem value="CHEQUE">Cheque</MenuItem>
                        <MenuItem value="ONLINE">Online</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handlePayment}
              disabled={paymentProcessing || !paymentAmount}
            >
              {paymentProcessing ? "Processing..." : "Record Payment"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Generate Vouchers Dialog */}
        <Dialog
          open={generateDialogOpen}
          onClose={() => setGenerateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Generate Fee Vouchers</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Generate fee vouchers for all active students or a specific
                class.
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={generateMonth}
                      label="Month"
                      onChange={(e) => setGenerateMonth(e.target.value)}
                    >
                      {months.map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={generateYear}
                      label="Year"
                      onChange={(e) => setGenerateYear(e.target.value)}
                    >
                      {years.map((y) => (
                        <MenuItem key={y} value={y.toString()}>
                          {y}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Class (Optional)</InputLabel>
                    <Select
                      value={generateClassId}
                      label="Class (Optional)"
                      onChange={(e) => setGenerateClassId(e.target.value)}
                    >
                      <MenuItem value="">All Classes</MenuItem>
                      {classes.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleGenerateVouchers}
              disabled={generating}
            >
              {generating ? "Generating..." : "Generate Vouchers"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
