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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Divider,
  Tooltip,
  Avatar,
  LinearProgress,
  alpha,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CalendarMonth as CalendarIcon,
  FilterList as FilterIcon,
  OpenInNew as OpenIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import SimpleTable, { SimpleColumn } from "@/components/common/SimpleTable";
import { debounce, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface FeeVoucher {
  id: string;
  voucherNo: string;
  subtotal: number;
  previousBalance: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  dueDate: string;
  month: number;
  year: number;
  createdAt: string;
  student: {
    id: string;
    registrationNo: string;
    firstName: string;
    lastName: string;
    class: { name: string };
    section?: { name: string };
  };
  feeItems: {
    id: string;
    feeType: string;
    amount: number;
  }[];
}

interface Class {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface Student {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  class: { id: string; name: string };
  section?: { id: string; name: string };
  customTuitionFee?: number;
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

const STATUS_COLORS: Record<
  string,
  "success" | "warning" | "error" | "default"
> = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "error",
  OVERDUE: "error",
};

export default function FeeVouchersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<FeeVoucher | null>(
    null
  );
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const fetchVouchers = useCallback(
    async (
      searchQuery = "",
      classId = "",
      sectionId = "",
      statusFilter = "",
      month = filterMonth,
      year = filterYear
    ) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.append("search", searchQuery);
        if (classId) params.append("classId", classId);
        if (sectionId) params.append("sectionId", sectionId);
        if (statusFilter) params.append("status", statusFilter);
        params.append("month", month.toString());
        params.append("year", year.toString());

        const response = await fetch(`/api/fee-vouchers?${params}`);
        const data = await response.json();
        if (response.ok) {
          setVouchers(data.vouchers || []);
        } else {
          toast.error(data.error || "Failed to fetch vouchers");
        }
      } catch (error) {
        toast.error("Failed to fetch vouchers");
      } finally {
        setLoading(false);
      }
    },
    [filterMonth, filterYear]
  );

  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/classes?includeSection=true&limit=100"
      );
      const data = await response.json();
      if (response.ok) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  }, []);

  const fetchStudents = useCallback(
    async (classId?: string, sectionId?: string) => {
      try {
        const params = new URLSearchParams();
        if (classId) params.append("classId", classId);
        if (sectionId) params.append("sectionId", sectionId);
        params.append("limit", "200");

        const response = await fetch(`/api/students?${params}`);
        const data = await response.json();
        if (response.ok) {
          setStudents(data.students || []);
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    },
    []
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchVouchers();
      fetchClasses();
    }
  }, [status, fetchVouchers, fetchClasses]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      fetchVouchers(value, filterClass, filterSection, filterStatus);
    }, 300),
    [fetchVouchers, filterClass, filterSection, filterStatus]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleFilterChange = (field: string, value: string | number) => {
    if (field === "class") {
      setFilterClass(value as string);
      setFilterSection("");
      fetchVouchers(search, value as string, "", filterStatus);
    } else if (field === "section") {
      setFilterSection(value as string);
      fetchVouchers(search, filterClass, value as string, filterStatus);
    } else if (field === "status") {
      setFilterStatus(value as string);
      fetchVouchers(search, filterClass, filterSection, value as string);
    } else if (field === "month") {
      setFilterMonth(value as number);
      fetchVouchers(
        search,
        filterClass,
        filterSection,
        filterStatus,
        value as number,
        filterYear
      );
    } else if (field === "year") {
      setFilterYear(value as number);
      fetchVouchers(
        search,
        filterClass,
        filterSection,
        filterStatus,
        filterMonth,
        value as number
      );
    }
  };

  const handleOpenGenerateDialog = () => {
    fetchStudents();
    setSelectedStudents([]);
    setGenerateDialogOpen(true);
  };

  const handleViewVoucher = (voucher: FeeVoucher) => {
    setSelectedVoucher(voucher);
    setViewDialogOpen(true);
  };

  const handleSelectAllStudents = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(students.map((s) => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
    }
  };

  const handleGenerateVouchers = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/fee-vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudents,
          month: filterMonth,
          year: filterYear,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(
          `Generated ${data.count || selectedStudents.length} vouchers`
        );
        setGenerateDialogOpen(false);
        fetchVouchers(search, filterClass, filterSection, filterStatus);
      } else {
        toast.error(data.error || "Failed to generate vouchers");
      }
    } catch (error) {
      toast.error("Failed to generate vouchers");
    } finally {
      setGenerating(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === filterClass);

  const columns: SimpleColumn[] = [
    {
      id: "voucherNo",
      label: "Voucher No",
      width: 130,
      render: (row: FeeVoucher) => (
        <Typography variant="body2" fontWeight="medium" color="primary.main">
          {row.voucherNo}
        </Typography>
      ),
    },
    {
      id: "student",
      label: "Student",
      render: (row: FeeVoucher) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: "primary.light",
              fontSize: 14,
            }}
          >
            {row.student.firstName[0]}
            {row.student.lastName[0]}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {row.student.firstName} {row.student.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.student.registrationNo}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: "class",
      label: "Class",
      render: (row: FeeVoucher) => (
        <Chip
          label={`${row.student.class?.name}${
            row.student.section?.name ? ` - ${row.student.section.name}` : ""
          }`}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: "period",
      label: "Period",
      render: (row: FeeVoucher) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <CalendarIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {MONTHS[row.month - 1]} {row.year}
          </Typography>
        </Box>
      ),
    },
    {
      id: "totalAmount",
      label: "Total",
      render: (row: FeeVoucher) => (
        <Typography variant="body2" fontWeight="bold">
          {formatCurrency(row.totalAmount)}
        </Typography>
      ),
    },
    {
      id: "paidAmount",
      label: "Paid",
      render: (row: FeeVoucher) => (
        <Typography variant="body2" color="success.main" fontWeight="medium">
          {formatCurrency(row.paidAmount)}
        </Typography>
      ),
    },
    {
      id: "balance",
      label: "Balance",
      render: (row: FeeVoucher) => (
        <Typography
          variant="body2"
          color={row.balanceDue > 0 ? "error.main" : "text.secondary"}
          fontWeight="medium"
        >
          {formatCurrency(row.balanceDue)}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "Status",
      render: (row: FeeVoucher) => (
        <Chip
          label={row.status}
          color={STATUS_COLORS[row.status] || "default"}
          size="small"
          variant="filled"
        />
      ),
    },
    {
      id: "actions",
      label: "Actions",
      width: 130,
      render: (row: FeeVoucher) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => handleViewVoucher(row)}
              sx={{ color: "primary.main" }}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open Full Page">
            <IconButton
              size="small"
              onClick={() => router.push(`/fees/vouchers/${row.id}`)}
              sx={{ color: "info.main" }}
            >
              <OpenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print Voucher">
            <IconButton
              size="small"
              onClick={() => toast.info("Print functionality coming soon")}
              sx={{ color: "text.secondary" }}
            >
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Calculate summary statistics
  const totalVouchers = vouchers.length;
  const paidVouchers = vouchers.filter((v) => v.status === "PAID").length;
  const unpaidVouchers = vouchers.filter((v) => v.status === "UNPAID").length;
  const partialVouchers = vouchers.filter((v) => v.status === "PARTIAL").length;
  const totalInvoiced = vouchers.reduce((sum, v) => sum + v.totalAmount, 0);
  const totalCollected = vouchers.reduce((sum, v) => sum + v.paidAmount, 0);
  const totalPending = vouchers.reduce((sum, v) => sum + v.balanceDue, 0);
  const collectionRate =
    totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

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
            <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48 }}>
              <ReceiptIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Fee Vouchers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {MONTHS[filterMonth - 1]} {filterYear}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={() =>
                  fetchVouchers(
                    search,
                    filterClass,
                    filterSection,
                    filterStatus
                  )
                }
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenGenerateDialog}
            >
              Generate Vouchers
            </Button>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(
                    theme.palette.primary.main,
                    0.1
                  )} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                border: 1,
                borderColor: "primary.light",
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography color="text.secondary" variant="body2">
                    Total Vouchers
                  </Typography>
                  <Avatar
                    sx={{ bgcolor: "primary.main", width: 36, height: 36 }}
                  >
                    <ReceiptIcon fontSize="small" />
                  </Avatar>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {totalVouchers}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Chip
                    label={`${paidVouchers} Paid`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={`${partialVouchers} Partial`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(
                    theme.palette.success.main,
                    0.1
                  )} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                border: 1,
                borderColor: "success.light",
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography color="text.secondary" variant="body2">
                    Collected
                  </Typography>
                  <Avatar
                    sx={{ bgcolor: "success.main", width: 36, height: 36 }}
                  >
                    <TrendingUpIcon fontSize="small" />
                  </Avatar>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {formatCurrency(totalCollected)}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Collection Rate
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {collectionRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={collectionRate}
                    color="success"
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(
                    theme.palette.error.main,
                    0.1
                  )} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                border: 1,
                borderColor: "error.light",
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography color="text.secondary" variant="body2">
                    Pending
                  </Typography>
                  <Avatar sx={{ bgcolor: "error.main", width: 36, height: 36 }}>
                    <TrendingDownIcon fontSize="small" />
                  </Avatar>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {formatCurrency(totalPending)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {unpaidVouchers} unpaid vouchers
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(
                    theme.palette.info.main,
                    0.1
                  )} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                border: 1,
                borderColor: "info.light",
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography color="text.secondary" variant="body2">
                    Total Invoiced
                  </Typography>
                  <Avatar sx={{ bgcolor: "info.main", width: 36, height: 36 }}>
                    <PaymentIcon fontSize="small" />
                  </Avatar>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {formatCurrency(totalInvoiced)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  For {MONTHS[filterMonth - 1]} {filterYear}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <FilterIcon fontSize="small" color="action" />
            <Typography variant="subtitle2">Filters</Typography>
          </Box>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by student name or voucher no..."
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
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Class</InputLabel>
                <Select
                  value={filterClass}
                  label="Class"
                  onChange={(e) => handleFilterChange("class", e.target.value)}
                >
                  <MenuItem value="">All Classes</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Section</InputLabel>
                <Select
                  value={filterSection}
                  label="Section"
                  onChange={(e) =>
                    handleFilterChange("section", e.target.value)
                  }
                  disabled={!filterClass}
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {selectedClass?.sections?.map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Month</InputLabel>
                <Select
                  value={filterMonth}
                  label="Month"
                  onChange={(e) => handleFilterChange("month", e.target.value)}
                >
                  {MONTHS.map((month, idx) => (
                    <MenuItem key={idx} value={idx + 1}>
                      {month}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 1 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Year"
                value={filterYear}
                onChange={(e) =>
                  handleFilterChange("year", parseInt(e.target.value))
                }
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="PAID">Paid</MenuItem>
                  <MenuItem value="PARTIAL">Partial</MenuItem>
                  <MenuItem value="UNPAID">Unpaid</MenuItem>
                  <MenuItem value="OVERDUE">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Vouchers Table */}
        <Paper sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" fontWeight="medium">
              Vouchers List
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {vouchers.length} vouchers
            </Typography>
          </Box>
          <SimpleTable
            columns={columns}
            rows={vouchers}
            loading={loading}
            emptyMessage="No vouchers found for the selected period. Try generating new vouchers or changing filters."
          />
        </Paper>

        {/* Generate Vouchers Dialog */}
        <Dialog
          open={generateDialogOpen}
          onClose={() => setGenerateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Generate Fee Vouchers for {MONTHS[filterMonth - 1]} {filterYear}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={filterClass}
                    label="Class"
                    onChange={(e) => {
                      setFilterClass(e.target.value);
                      fetchStudents(e.target.value);
                    }}
                  >
                    <MenuItem value="">All Classes</MenuItem>
                    {classes.map((cls) => (
                      <MenuItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={filterSection}
                    label="Section"
                    onChange={(e) => {
                      setFilterSection(e.target.value);
                      fetchStudents(filterClass, e.target.value);
                    }}
                    disabled={!filterClass}
                  >
                    <MenuItem value="">All Sections</MenuItem>
                    {selectedClass?.sections?.map((section) => (
                      <MenuItem key={section.id} value={section.id}>
                        {section.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={
                          students.length > 0 &&
                          selectedStudents.length === students.length
                        }
                        indeterminate={
                          selectedStudents.length > 0 &&
                          selectedStudents.length < students.length
                        }
                        onChange={(e) =>
                          handleSelectAllStudents(e.target.checked)
                        }
                      />
                    </TableCell>
                    <TableCell>Reg No</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Class</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) =>
                            handleSelectStudent(student.id, e.target.checked)
                          }
                        />
                      </TableCell>
                      <TableCell>{student.registrationNo}</TableCell>
                      <TableCell>
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell>
                        {student.class?.name}
                        {student.section?.name && ` - ${student.section.name}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Selected: {selectedStudents.length} students
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleGenerateVouchers}
              disabled={generating || selectedStudents.length === 0}
            >
              {generating ? "Generating..." : "Generate Vouchers"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Voucher Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Voucher Details - {selectedVoucher?.voucherNo}
          </DialogTitle>
          <DialogContent>
            {selectedVoucher && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Student
                    </Typography>
                    <Typography>
                      {selectedVoucher.student.firstName}{" "}
                      {selectedVoucher.student.lastName}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Registration No
                    </Typography>
                    <Typography>
                      {selectedVoucher.student.registrationNo}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Class
                    </Typography>
                    <Typography>
                      {selectedVoucher.student.class?.name}
                      {selectedVoucher.student.section?.name &&
                        ` - ${selectedVoucher.student.section.name}`}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Period
                    </Typography>
                    <Typography>
                      {MONTHS[selectedVoucher.month - 1]} {selectedVoucher.year}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Fee Items
                    </Typography>
                    {selectedVoucher.feeItems?.map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography>{item.feeType}</Typography>
                        <Typography>{formatCurrency(item.amount)}</Typography>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography fontWeight="bold">Total</Typography>
                      <Typography fontWeight="bold">
                        {formatCurrency(selectedVoucher.totalAmount)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography>Paid</Typography>
                      <Typography color="success.main">
                        {formatCurrency(selectedVoucher.paidAmount)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography>Balance</Typography>
                      <Typography color="error.main">
                        {formatCurrency(selectedVoucher.balanceDue)}
                      </Typography>
                    </Box>
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
              Print
            </Button>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
