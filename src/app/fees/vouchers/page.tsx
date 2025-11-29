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
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import SimpleTable, { SimpleColumn } from "@/components/common/SimpleTable";
import { debounce, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface FeeVoucher {
  id: string;
  voucherNo: string;
  totalAmount: number;
  paidAmount: number;
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
  items: {
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
    { id: "voucherNo", label: "Voucher No", width: 120 },
    {
      id: "student",
      label: "Student",
      render: (row: FeeVoucher) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {row.student.firstName} {row.student.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.student.registrationNo}
          </Typography>
        </Box>
      ),
    },
    {
      id: "class",
      label: "Class",
      render: (row: FeeVoucher) => (
        <span>
          {row.student.class?.name}
          {row.student.section?.name && ` - ${row.student.section.name}`}
        </span>
      ),
    },
    {
      id: "period",
      label: "Period",
      render: (row: FeeVoucher) => `${MONTHS[row.month - 1]} ${row.year}`,
    },
    {
      id: "totalAmount",
      label: "Total",
      render: (row: FeeVoucher) => formatCurrency(row.totalAmount),
    },
    {
      id: "paidAmount",
      label: "Paid",
      render: (row: FeeVoucher) => formatCurrency(row.paidAmount),
    },
    {
      id: "status",
      label: "Status",
      render: (row: FeeVoucher) => (
        <Chip
          label={row.status}
          color={STATUS_COLORS[row.status] || "default"}
          size="small"
        />
      ),
    },
    {
      id: "dueDate",
      label: "Due Date",
      render: (row: FeeVoucher) => formatDate(row.dueDate),
    },
    {
      id: "actions",
      label: "Actions",
      width: 120,
      render: (row: FeeVoucher) => (
        <Box>
          <IconButton size="small" onClick={() => handleViewVoucher(row)}>
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
            Fee Vouchers
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenGenerateDialog}
          >
            Generate Vouchers
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Vouchers
                </Typography>
                <Typography variant="h4">{vouchers.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Paid
                </Typography>
                <Typography variant="h4" color="success.main">
                  {vouchers.filter((v) => v.status === "PAID").length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Unpaid
                </Typography>
                <Typography variant="h4" color="error.main">
                  {vouchers.filter((v) => v.status === "UNPAID").length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Amount
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(
                    vouchers.reduce((sum, v) => sum + v.totalAmount, 0)
                  )}
                </Typography>
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
              <FormControl fullWidth>
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
              <FormControl fullWidth>
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
              <FormControl fullWidth>
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
                type="number"
                label="Year"
                value={filterYear}
                onChange={(e) =>
                  handleFilterChange("year", parseInt(e.target.value))
                }
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth>
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
          <SimpleTable
            columns={columns}
            rows={vouchers}
            loading={loading}
            emptyMessage="No vouchers found"
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
                    {selectedVoucher.items?.map((item) => (
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
                        {formatCurrency(
                          selectedVoucher.totalAmount -
                            selectedVoucher.paidAmount
                        )}
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
