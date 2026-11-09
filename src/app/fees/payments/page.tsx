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
import ReceivePaymentDialog from "@/components/dialogs/ReceivePaymentDialog";
import QuickReceiveButton from "@/components/fees/QuickReceiveButton";

interface Payment {
  id: string;
  receiptNo: string;
  receiptGroup?: string | null;
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
      const response = await fetch(`/api/payments?pageSize=100`);
      const data = await response.json();
      if (response.ok) {
        setPayments(data.data || []);
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

  // Opened as /fees/payments?voucherId=... (older links): receive for that voucher's student
  const [receiveFor, setReceiveFor] = useState<{ studentId: string; voucherId?: string } | null>(null);
  useEffect(() => {
    if (status !== "authenticated") return;
    const voucherId = new URLSearchParams(window.location.search).get("voucherId");
    if (!voucherId) return;
    (async () => {
      const res = await fetch(`/api/fee-vouchers/${voucherId}`);
      if (res.ok) {
        const v = await res.json();
        setReceiveFor({ studentId: v.student.id, voucherId });
      }
    })();
  }, [status]);

  const printReceipt = (p: Payment) =>
    window.open(`/fees/receipts/${encodeURIComponent(p.receiptGroup || p.receiptNo)}?print=1`, "_blank");

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
            onClick={() => printReceipt(row)}
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
          <QuickReceiveButton onSuccess={fetchPayments} />
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

        {/* Receive Payment (oldest dues first) */}
        <ReceivePaymentDialog
          open={!!receiveFor}
          studentId={receiveFor?.studentId ?? null}
          focusVoucherId={receiveFor?.voucherId}
          onClose={() => {
            setReceiveFor(null);
            window.history.replaceState(null, "", "/fees/payments");
          }}
          onSuccess={fetchPayments}
        />

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
              onClick={() => selectedPayment && printReceipt(selectedPayment)}
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
