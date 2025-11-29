"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Avatar,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Close,
  Payment,
  AccountBalance,
  FilterList,
  Refresh,
  Visibility,
  CheckCircle,
  Cancel,
  PendingActions,
} from "@mui/icons-material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import MainLayout from "@/components/layout/MainLayout";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  monthlySalary: number;
  isActive: boolean;
}

interface Salary {
  id: string;
  teacherId: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  bonuses: number;
  netSalary: number;
  status: string;
  paidAt: string | null;
  paymentMethod: string | null;
  remarks: string | null;
  teacher: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
  };
}

const MONTHS = [
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

export default function SalaryPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    teacherId: "",
    month: 0,
    year: 0,
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    bonuses: 0,
    remarks: "",
  });

  const [paymentData, setPaymentData] = useState({
    paymentMethod: "BANK_TRANSFER",
    remarks: "",
  });

  const [generateData, setGenerateData] = useState({
    month: 0,
    year: 0,
  });

  // Initialize date-dependent values only on client side to prevent hydration mismatch
  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    setFormData((prev) => ({
      ...prev,
      month: currentMonth,
      year: currentYear,
    }));
    setGenerateData({ month: currentMonth, year: currentYear });
    setMounted(true);
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/teachers?status=active&limit=100");
      const data = await res.json();
      if (res.ok) {
        setTeachers(data.teachers || []);
      }
    } catch (error) {
      console.error("Failed to fetch teachers", error);
    }
  };

  const fetchSalaries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`/api/salaries?${params}`);
      const data = await res.json();

      if (res.ok) {
        setSalaries(data.salaries || []);
      } else {
        toast.error(data.error || "Failed to fetch salaries");
      }
    } catch (error) {
      toast.error("Failed to fetch salaries");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, statusFilter]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    // Only fetch salaries after the component is mounted and values are initialized
    if (mounted && selectedMonth > 0 && selectedYear > 0) {
      fetchSalaries();
    }
  }, [fetchSalaries, mounted, selectedMonth, selectedYear]);

  const handleOpenDialog = (salary?: Salary) => {
    if (salary) {
      setSelectedSalary(salary);
      setFormData({
        teacherId: salary.teacherId,
        month: salary.month,
        year: salary.year,
        baseSalary: salary.baseSalary,
        allowances: salary.allowances,
        deductions: salary.deductions,
        bonuses: salary.bonuses,
        remarks: salary.remarks || "",
      });
    } else {
      setSelectedSalary(null);
      setFormData({
        teacherId: "",
        month: selectedMonth,
        year: selectedYear,
        baseSalary: 0,
        allowances: 0,
        deductions: 0,
        bonuses: 0,
        remarks: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.teacherId) {
      toast.error("Please select a teacher");
      return;
    }

    setSaving(true);
    try {
      const url = selectedSalary
        ? `/api/salaries?id=${selectedSalary.id}`
        : "/api/salaries";
      const method = selectedSalary ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          selectedSalary
            ? "Salary record updated successfully"
            : "Salary record created successfully"
        );
        setDialogOpen(false);
        setSelectedSalary(null);
        fetchSalaries();
      } else {
        toast.error(data.error || "Failed to save salary record");
      }
    } catch (error) {
      toast.error("Failed to save salary record");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSalaries = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/salaries/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          `Generated ${data.count} salary records for ${
            MONTHS[generateData.month - 1]
          } ${generateData.year}`
        );
        setGenerateDialogOpen(false);
        if (
          selectedMonth === generateData.month &&
          selectedYear === generateData.year
        ) {
          fetchSalaries();
        } else {
          setSelectedMonth(generateData.month);
          setSelectedYear(generateData.year);
        }
      } else {
        toast.error(data.error || "Failed to generate salaries");
      }
    } catch (error) {
      toast.error("Failed to generate salaries");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedSalary) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/salaries?id=${selectedSalary.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          paidAt: new Date().toISOString(),
          paymentMethod: paymentData.paymentMethod,
          remarks: paymentData.remarks,
        }),
      });

      if (res.ok) {
        toast.success("Salary marked as paid");
        setPayDialogOpen(false);
        setSelectedSalary(null);
        fetchSalaries();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update salary");
      }
    } catch (error) {
      toast.error("Failed to update salary");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSalary) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/salaries?id=${selectedSalary.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Salary record deleted successfully");
        setDeleteDialogOpen(false);
        setSelectedSalary(null);
        fetchSalaries();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete salary record");
      }
    } catch (error) {
      toast.error("Failed to delete salary record");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "success";
      case "PENDING":
        return "warning";
      case "CANCELLED":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle color="success" />;
      case "PENDING":
        return <PendingActions color="warning" />;
      case "CANCELLED":
        return <Cancel color="error" />;
      default:
        return null;
    }
  };

  const filteredSalaries = salaries.filter((salary) => {
    if (!search) return true;
    const fullName =
      `${salary.teacher.firstName} ${salary.teacher.lastName}`.toLowerCase();
    return (
      fullName.includes(search.toLowerCase()) ||
      salary.teacher.employeeId.toLowerCase().includes(search.toLowerCase())
    );
  });

  const pendingSalaries = filteredSalaries.filter(
    (s) => s.status === "PENDING"
  );
  const paidSalaries = filteredSalaries.filter((s) => s.status === "PAID");

  const totalPending = pendingSalaries.reduce((sum, s) => sum + s.netSalary, 0);
  const totalPaid = paidSalaries.reduce((sum, s) => sum + s.netSalary, 0);

  // Prevent rendering until client-side hydration is complete
  if (!mounted) {
    return (
      <MainLayout>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "60vh",
          }}
        >
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
              Salary Management
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Payment />}
                onClick={() => setGenerateDialogOpen(true)}
              >
                Generate Salaries
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                Add Salary
              </Button>
            </Box>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: "primary.light" }}>
                      <AccountBalance color="primary" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Salary ({MONTHS[selectedMonth - 1]})
                      </Typography>
                      <Typography variant="h6">
                        {formatCurrency(totalPending + totalPaid)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: "warning.light" }}>
                      <PendingActions color="warning" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Pending
                      </Typography>
                      <Typography variant="h6">
                        {formatCurrency(totalPending)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: "success.light" }}>
                      <CheckCircle color="success" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Paid
                      </Typography>
                      <Typography variant="h6">
                        {formatCurrency(totalPaid)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: "info.light" }}>
                      <Payment color="info" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Teachers
                      </Typography>
                      <Typography variant="h6">
                        {salaries.length} / {teachers.length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search teachers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    label="Month"
                    onChange={(e) => setSelectedMonth(e.target.value as number)}
                  >
                    {MONTHS.map((month, index) => (
                      <MenuItem key={index} value={index + 1}>
                        {month}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={selectedYear}
                    label="Year"
                    onChange={(e) => setSelectedYear(e.target.value as number)}
                  >
                    {[2023, 2024, 2025, 2026].map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="PAID">Paid</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("");
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchSalaries}
                  >
                    Refresh
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Salaries Table */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredSalaries.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">
                No salary records found for {MONTHS[selectedMonth - 1]}{" "}
                {selectedYear}
              </Typography>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => {
                  setGenerateData({
                    month: selectedMonth,
                    year: selectedYear,
                  });
                  setGenerateDialogOpen(true);
                }}
              >
                Generate Salaries
              </Button>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.100" }}>
                    <TableCell>Employee</TableCell>
                    <TableCell>Month/Year</TableCell>
                    <TableCell align="right">Base Salary</TableCell>
                    <TableCell align="right">Allowances</TableCell>
                    <TableCell align="right">Deductions</TableCell>
                    <TableCell align="right">Bonuses</TableCell>
                    <TableCell align="right">Net Salary</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSalaries.map((salary) => (
                    <TableRow key={salary.id} hover>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {salary.teacher.firstName[0]}
                            {salary.teacher.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {salary.teacher.firstName}{" "}
                              {salary.teacher.lastName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {salary.teacher.employeeId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {MONTHS[salary.month - 1]} {salary.year}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(salary.baseSalary)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "success.main" }}>
                        +{formatCurrency(salary.allowances)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "error.main" }}>
                        -{formatCurrency(salary.deductions)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "info.main" }}>
                        +{formatCurrency(salary.bonuses)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold">
                          {formatCurrency(salary.netSalary)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={
                            getStatusIcon(salary.status) as React.ReactElement
                          }
                          label={salary.status}
                          size="small"
                          color={
                            getStatusColor(salary.status) as
                              | "success"
                              | "warning"
                              | "error"
                              | "default"
                          }
                        />
                        {salary.paidAt && (
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            Paid: {formatDate(salary.paidAt)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 0.5,
                          }}
                        >
                          {salary.status === "PENDING" && (
                            <Tooltip title="Mark as Paid">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => {
                                  setSelectedSalary(salary);
                                  setPaymentData({
                                    paymentMethod: "BANK_TRANSFER",
                                    remarks: "",
                                  });
                                  setPayDialogOpen(true);
                                }}
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(salary)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedSalary(salary);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Add/Edit Dialog */}
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                {selectedSalary ? "Edit Salary Record" : "Add Salary Record"}
                <IconButton onClick={() => setDialogOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Teacher</InputLabel>
                    <Select
                      value={formData.teacherId}
                      label="Teacher"
                      onChange={(e) => {
                        const teacher = teachers.find(
                          (t) => t.id === e.target.value
                        );
                        setFormData({
                          ...formData,
                          teacherId: e.target.value,
                          baseSalary: teacher?.monthlySalary || 0,
                        });
                      }}
                      disabled={!!selectedSalary}
                    >
                      {teachers.map((teacher) => (
                        <MenuItem key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName} (
                          {teacher.employeeId})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={formData.month}
                      label="Month"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          month: e.target.value as number,
                        })
                      }
                      disabled={!!selectedSalary}
                    >
                      {MONTHS.map((month, index) => (
                        <MenuItem key={index} value={index + 1}>
                          {month}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={formData.year}
                      label="Year"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          year: e.target.value as number,
                        })
                      }
                      disabled={!!selectedSalary}
                    >
                      {[2023, 2024, 2025, 2026].map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Base Salary"
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        baseSalary: parseFloat(e.target.value) || 0,
                      })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">PKR</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Allowances"
                    type="number"
                    value={formData.allowances}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowances: parseFloat(e.target.value) || 0,
                      })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">PKR</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Deductions"
                    type="number"
                    value={formData.deductions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deductions: parseFloat(e.target.value) || 0,
                      })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">PKR</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Bonuses"
                    type="number"
                    value={formData.bonuses}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bonuses: parseFloat(e.target.value) || 0,
                      })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">PKR</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Net Salary
                    </Typography>
                    <Typography variant="h5" color="primary">
                      {formatCurrency(
                        formData.baseSalary +
                          formData.allowances +
                          formData.bonuses -
                          formData.deductions
                      )}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    multiline
                    rows={2}
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : "Save"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Generate Salaries Dialog */}
          <Dialog
            open={generateDialogOpen}
            onClose={() => setGenerateDialogOpen(false)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                Generate Monthly Salaries
                <IconButton onClick={() => setGenerateDialogOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will generate salary records for all active teachers based
                on their base salary.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={generateData.month}
                      label="Month"
                      onChange={(e) =>
                        setGenerateData({
                          ...generateData,
                          month: e.target.value as number,
                        })
                      }
                    >
                      {MONTHS.map((month, index) => (
                        <MenuItem key={index} value={index + 1}>
                          {month}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={generateData.year}
                      label="Year"
                      onChange={(e) =>
                        setGenerateData({
                          ...generateData,
                          year: e.target.value as number,
                        })
                      }
                    >
                      {[2023, 2024, 2025, 2026].map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleGenerateSalaries}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : "Generate"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Pay Dialog */}
          <Dialog
            open={payDialogOpen}
            onClose={() => setPayDialogOpen(false)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                Mark Salary as Paid
                <IconButton onClick={() => setPayDialogOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {selectedSalary && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedSalary.teacher.firstName}{" "}
                    {selectedSalary.teacher.lastName}
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(selectedSalary.netSalary)}
                  </Typography>
                </Box>
              )}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={paymentData.paymentMethod}
                      label="Payment Method"
                      onChange={(e) =>
                        setPaymentData({
                          ...paymentData,
                          paymentMethod: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                      <MenuItem value="CASH">Cash</MenuItem>
                      <MenuItem value="CHEQUE">Cheque</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    multiline
                    rows={2}
                    value={paymentData.remarks}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        remarks: e.target.value,
                      })
                    }
                    placeholder="Transaction ID, reference, etc."
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPayDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleMarkAsPaid}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : "Confirm Payment"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
          >
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete the salary record for{" "}
                <strong>
                  {selectedSalary?.teacher.firstName}{" "}
                  {selectedSalary?.teacher.lastName}
                </strong>{" "}
                ({MONTHS[(selectedSalary?.month || 1) - 1]}{" "}
                {selectedSalary?.year})? This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : "Delete"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </MainLayout>
    </LocalizationProvider>
  );
}
