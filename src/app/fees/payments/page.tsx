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
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Payment as PaymentIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import SimpleTable, { SimpleColumn } from "@/components/common/SimpleTable";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Payment {
  id: string;
  receiptNo: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
  remarks?: string;
  createdAt: string;
  voucher: {
    id: string;
    voucherNo: string;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
    month: number;
    year: number;
    student: {
      id: string;
      registrationNo: string;
      firstName: string;
      lastName: string;
      class?: { name: string };
      section?: { name: string };
    };
  };
  student: {
    id: string;
    registrationNo: string;
    firstName: string;
    lastName: string;
    class?: { name: string };
    section?: { name: string };
  };
}

interface ClassOption {
  id: string;
  name: string;
}

interface SectionOption {
  id: string;
  name: string;
}

interface Student {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  photo?: string;
  class?: { id: string; name: string };
  section?: { id: string; name: string };
  monthlyFee: number;
}

interface FeeVoucher {
  id: string;
  voucherNo: string;
  month: number;
  year: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  dueDate: string;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online Payment" },
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

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Payments list state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // View payment dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Receive payment dialog state
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<
    "select" | "voucher" | "payment"
  >("select");

  // Selection state for dialog
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<FeeVoucher | null>(
    null
  );
  const [studentSearch, setStudentSearch] = useState("");

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payments`);
      const data = await response.json();
      if (response.ok) {
        setPayments(data.payments || data || []);
      } else {
        toast.error(data.error || "Failed to fetch payments");
      }
    } catch (error) {
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch classes
  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/classes");
      const data = await response.json();
      if (response.ok) {
        setClasses(data.classes || data || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  // Fetch sections for a class
  const fetchSections = async (classId: string) => {
    try {
      const response = await fetch(`/api/sections?classId=${classId}`);
      const data = await response.json();
      if (response.ok) {
        setSections(data.sections || data || []);
      }
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  };

  // Fetch students for class/section
  const fetchStudents = async (classId: string, sectionId?: string) => {
    try {
      const params = new URLSearchParams();
      params.append("classId", classId);
      if (sectionId) params.append("sectionId", sectionId);
      params.append("status", "ACTIVE");

      const response = await fetch(`/api/students?${params}`);
      const data = await response.json();
      if (response.ok) {
        setStudents(data.students || data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  // Fetch vouchers for student
  const fetchStudentVouchers = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}`);
      const data = await response.json();
      if (response.ok && data.feeVouchers) {
        // Filter to show only unpaid/partial vouchers
        const unpaidVouchers = data.feeVouchers.filter(
          (v: FeeVoucher) => v.status !== "PAID" && v.status !== "CANCELLED"
        );
        setVouchers(unpaidVouchers);
      }
    } catch (error) {
      console.error("Failed to fetch vouchers:", error);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchPayments();
    }
  }, [status, fetchPayments]);

  // Handle class change
  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedSection("");
    setSelectedStudent(null);
    setSections([]);
    setStudents([]);
    if (classId) {
      fetchSections(classId);
      fetchStudents(classId);
    }
  };

  // Handle section change
  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    setSelectedStudent(null);
    if (selectedClass) {
      fetchStudents(selectedClass, sectionId);
    }
  };

  // Handle student selection
  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setDialogStep("voucher");
    fetchStudentVouchers(student.id);
  };

  // Handle voucher selection
  const handleSelectVoucher = (voucher: FeeVoucher) => {
    setSelectedVoucher(voucher);
    setPaymentAmount(voucher.balanceDue.toString());
    setDialogStep("payment");
  };

  // Open receive payment dialog
  const handleOpenReceiveDialog = () => {
    setReceiveDialogOpen(true);
    setDialogStep("select");
    setSelectedClass("");
    setSelectedSection("");
    setSelectedStudent(null);
    setSelectedVoucher(null);
    setStudentSearch("");
    setPaymentAmount("");
    setPaymentMethod("CASH");
    setPaymentReference("");
    setPaymentRemarks("");
    setError(null);
    fetchClasses();
  };

  // Close dialog and reset
  const handleCloseDialog = () => {
    setReceiveDialogOpen(false);
    setDialogStep("select");
    setSelectedClass("");
    setSelectedSection("");
    setSelectedStudent(null);
    setSelectedVoucher(null);
    setStudentSearch("");
    setVouchers([]);
    setError(null);
  };

  // Go back in dialog
  const handleDialogBack = () => {
    if (dialogStep === "payment") {
      setDialogStep("voucher");
      setSelectedVoucher(null);
    } else if (dialogStep === "voucher") {
      setDialogStep("select");
      setSelectedStudent(null);
      setVouchers([]);
    }
  };

  // Submit payment
  const handleSubmitPayment = async () => {
    if (!selectedStudent || !selectedVoucher) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amount > selectedVoucher.balanceDue) {
      setError(
        `Amount cannot exceed balance due (${formatCurrency(
          selectedVoucher.balanceDue
        )})`
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          voucherId: selectedVoucher.id,
          amount,
          paymentMethod,
          reference: paymentReference,
          remarks: paymentRemarks,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Payment Received Successfully!", {
          description: `Receipt: ${data.receiptNo} | Amount: ${formatCurrency(
            amount
          )}`,
        });
        handleCloseDialog();
        fetchPayments();
      } else {
        setError(data.error || "Failed to receive payment");
      }
    } catch (err) {
      setError("An error occurred while processing payment");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle view payment
  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setViewDialogOpen(true);
  };

  // Filter students by search
  const filteredStudents = students.filter((s) => {
    if (!studentSearch) return true;
    const searchLower = studentSearch.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(searchLower) ||
      s.lastName.toLowerCase().includes(searchLower) ||
      s.registrationNo.toLowerCase().includes(searchLower)
    );
  });

  const columns: SimpleColumn[] = [
    {
      id: "receiptNo",
      label: "Receipt #",
      width: 130,
      render: (row: Payment) => (
        <Typography fontWeight={500}>{row.receiptNo}</Typography>
      ),
    },
    {
      id: "student",
      label: "Student",
      render: (row: Payment) => {
        const student = row.student || row.voucher?.student;
        return (
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {student?.firstName} {student?.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {student?.registrationNo} • {student?.class?.name}
              {student?.section?.name && ` - ${student.section.name}`}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: "voucher",
      label: "Voucher",
      render: (row: Payment) => (
        <Chip
          label={row.voucher?.voucherNo || "-"}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: "amount",
      label: "Amount",
      render: (row: Payment) => (
        <Typography color="success.main" fontWeight={500}>
          {formatCurrency(row.amount)}
        </Typography>
      ),
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
          color="primary"
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
          <CircularProgress />
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
              Fee Payments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Receive and manage student fee payments
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PaymentIcon />}
            onClick={handleOpenReceiveDialog}
            sx={{ bgcolor: "#4caf50", "&:hover": { bgcolor: "#388e3c" } }}
          >
            Receive Payment
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Payments
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {payments.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Collected
                </Typography>
                <Typography variant="h5" color="success.main" fontWeight="bold">
                  {formatCurrency(totalCollected)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Today's Payments
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {todayPayments.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Today's Collection
                </Typography>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  {formatCurrency(todayTotal)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Payments Table */}
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <SimpleTable
            columns={columns}
            rows={payments}
            loading={loading}
            emptyMessage="No payments found"
          />
        </Paper>

        {/* Receive Payment Dialog */}
        <Dialog
          open={receiveDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: "#1a237e", color: "white" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PaymentIcon />
              Receive Payment
            </Box>
          </DialogTitle>
          <DialogContent sx={{ minHeight: 400 }}>
            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
                {error}
              </Alert>
            )}

            {/* Step 1: Select Class, Section, Student */}
            {dialogStep === "select" && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Select Class</InputLabel>
                      <Select
                        value={selectedClass}
                        label="Select Class"
                        onChange={(e) => handleClassChange(e.target.value)}
                      >
                        {classes.map((cls) => (
                          <MenuItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth disabled={!selectedClass}>
                      <InputLabel>Select Section</InputLabel>
                      <Select
                        value={selectedSection}
                        label="Select Section"
                        onChange={(e) => handleSectionChange(e.target.value)}
                      >
                        <MenuItem value="">All Sections</MenuItem>
                        {sections.map((sec) => (
                          <MenuItem key={sec.id} value={sec.id}>
                            {sec.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {selectedClass && (
                  <Box sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search student by name or registration..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 2 }}
                    />

                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Select Student ({filteredStudents.length} found)
                    </Typography>

                    <Paper
                      variant="outlined"
                      sx={{ maxHeight: 250, overflow: "auto" }}
                    >
                      <List dense>
                        {filteredStudents.length === 0 ? (
                          <ListItem>
                            <ListItemText
                              primary="No students found"
                              secondary="Try selecting a different class or section"
                            />
                          </ListItem>
                        ) : (
                          filteredStudents.map((student) => (
                            <ListItemButton
                              key={student.id}
                              onClick={() => handleSelectStudent(student)}
                            >
                              <ListItemAvatar>
                                <Avatar src={student.photo || undefined}>
                                  {student.firstName[0]}
                                  {student.lastName[0]}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={`${student.firstName} ${student.lastName}`}
                                secondary={`${student.registrationNo} • ${
                                  student.class?.name || ""
                                }${
                                  student.section?.name
                                    ? ` - ${student.section.name}`
                                    : ""
                                }`}
                              />
                            </ListItemButton>
                          ))
                        )}
                      </List>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}

            {/* Step 2: Select Voucher */}
            {dialogStep === "voucher" && selectedStudent && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 2, mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Selected Student
                  </Typography>
                  <Typography fontWeight={600}>
                    {selectedStudent.registrationNo} -{" "}
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedStudent.class?.name || "N/A"} -{" "}
                    {selectedStudent.section?.name || "N/A"}
                  </Typography>
                </Box>

                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Select Voucher to Pay
                </Typography>

                {vouchers.length === 0 ? (
                  <Alert severity="info">
                    No unpaid vouchers found for this student.
                  </Alert>
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{ maxHeight: 250, overflow: "auto" }}
                  >
                    <List>
                      {vouchers.map((voucher) => (
                        <ListItemButton
                          key={voucher.id}
                          onClick={() => handleSelectVoucher(voucher)}
                        >
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <Typography fontWeight={500}>
                                  {voucher.voucherNo}
                                </Typography>
                                <Chip
                                  label={voucher.status}
                                  size="small"
                                  color={
                                    voucher.status === "PARTIAL"
                                      ? "warning"
                                      : "error"
                                  }
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="body2">
                                  {monthNames[voucher.month - 1]} {voucher.year}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="error.main"
                                  fontWeight={500}
                                >
                                  Balance Due:{" "}
                                  {formatCurrency(voucher.balanceDue)}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
            )}

            {/* Step 3: Payment Form */}
            {dialogStep === "payment" && selectedStudent && selectedVoucher && (
              <Box sx={{ mt: 2 }}>
                {/* Student Info */}
                <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 2, mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Student
                  </Typography>
                  <Typography fontWeight={600}>
                    {selectedStudent.registrationNo} -{" "}
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </Typography>
                </Box>

                {/* Voucher Info */}
                <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 2, mb: 3 }}>
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
                      label={selectedVoucher.status}
                      size="small"
                      color={
                        selectedVoucher.status === "PARTIAL"
                          ? "warning"
                          : "error"
                      }
                    />
                  </Box>
                  <Typography fontWeight={600}>
                    {selectedVoucher.voucherNo}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {monthNames[selectedVoucher.month - 1]}{" "}
                    {selectedVoucher.year}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">Total Amount:</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatCurrency(selectedVoucher.totalAmount)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">Paid Amount:</Typography>
                    <Typography
                      variant="body2"
                      color="success.main"
                      fontWeight={500}
                    >
                      {formatCurrency(selectedVoucher.paidAmount)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      Balance Due:
                    </Typography>
                    <Typography
                      variant="body2"
                      color="error.main"
                      fontWeight={600}
                    >
                      {formatCurrency(selectedVoucher.balanceDue)}
                    </Typography>
                  </Box>
                </Box>

                {/* Payment Form */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Amount"
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1 }}>Rs.</Typography>
                        ),
                      }}
                      helperText={`Max: ${formatCurrency(
                        selectedVoucher.balanceDue
                      )}`}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={paymentMethod}
                        label="Payment Method"
                        onChange={(e) => setPaymentMethod(e.target.value)}
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
                      label="Reference (Cheque #, Transaction ID, etc.)"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Remarks"
                      value={paymentRemarks}
                      onChange={(e) => setPaymentRemarks(e.target.value)}
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            {dialogStep !== "select" && (
              <Button onClick={handleDialogBack} disabled={submitting}>
                Back
              </Button>
            )}
            <Button onClick={handleCloseDialog} disabled={submitting}>
              Cancel
            </Button>
            {dialogStep === "payment" && (
              <Button
                variant="contained"
                color="success"
                onClick={handleSubmitPayment}
                disabled={submitting || !paymentAmount}
              >
                {submitting ? "Processing..." : "Receive Payment"}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* View Payment Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: "#1a237e", color: "white" }}>
            Payment Details - {selectedPayment?.receiptNo}
          </DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Receipt Number
                    </Typography>
                    <Typography fontWeight={600}>
                      {selectedPayment.receiptNo}
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
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Student
                    </Typography>
                    <Typography>
                      {selectedPayment.student?.firstName ||
                        selectedPayment.voucher?.student?.firstName}{" "}
                      {selectedPayment.student?.lastName ||
                        selectedPayment.voucher?.student?.lastName}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Registration No
                    </Typography>
                    <Typography>
                      {selectedPayment.student?.registrationNo ||
                        selectedPayment.voucher?.student?.registrationNo}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Voucher No
                    </Typography>
                    <Typography>
                      {selectedPayment.voucher?.voucherNo || "-"}
                    </Typography>
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
                      {PAYMENT_METHODS.find(
                        (m) => m.value === selectedPayment.paymentMethod
                      )?.label || selectedPayment.paymentMethod}
                    </Typography>
                  </Grid>
                  {selectedPayment.reference && (
                    <Grid size={{ xs: 6 }}>
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
