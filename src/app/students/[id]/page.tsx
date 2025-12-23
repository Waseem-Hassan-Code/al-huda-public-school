"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Avatar,
  Chip,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Card,
  CardContent,
  Divider,
  Stack,
  CircularProgress,
} from "@mui/material";
import {
  Edit,
  Print,
  Download,
  ArrowBack,
  Receipt,
  Add,
  Delete,
  School,
  Phone,
  Person,
  Badge,
  CalendarMonth,
  AttachMoney,
  PhotoCamera,
  Save,
  Check,
  Close,
  Payment as PaymentIcon,
  Visibility,
  AccountBalanceWallet,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ImageUpload from "@/components/common/ImageUpload";
import MainLayout from "@/components/layout/MainLayout";
import ReceivePaymentDialog from "@/components/dialogs/ReceivePaymentDialog";
import ResultCardsTab from "@/components/students/ResultCardsTab";
import AttendanceCalendar from "@/components/common/AttendanceCalendar";
import RemainingBalancePrint from "@/components/students/RemainingBalancePrint";

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
  payments: Payment[];
}

interface Payment {
  id: string;
  receiptNo: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
}

interface Attendance {
  id: string;
  date: string;
  status: string;
  remarks?: string;
}

interface ExamResult {
  id: string;
  exam: {
    id: string;
    name: string;
    examDate: string;
    totalMarks: number;
    passingMarks: number;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  marksObtained: number | null;
  totalMarks: number;
  isAbsent: boolean;
  grade?: string;
  remarks?: string;
}

interface StudentDetail {
  id: string;
  registrationNo: string;
  rollNo?: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  motherName?: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  religion: string;
  nationality: string;
  cnic?: string;
  photo?: string;
  phone?: string;
  email?: string;
  address: string;
  city: string;
  province?: string;
  postalCode?: string;
  guardianName: string;
  guardianRelation: string;
  guardianCnic?: string;
  guardianPhone: string;
  guardianWhatsapp?: string;
  guardianPhone2?: string;
  guardianEmail?: string;
  guardianOccupation?: string;
  guardianAddress?: string;
  guardianMonthlyIncome?: string;
  class?: { id: string; name: string };
  section?: { id: string; name: string };
  academicYear?: { id: string; name: string };
  admissionType: string;
  admissionDate: string;
  previousSchool?: string;
  previousClass?: string;
  monthlyFee: number;
  status: string;
  statusReason?: string;
  statusDate?: string;
  remarks?: string;
  feeVouchers: FeeVoucher[];
  attendance: Attendance[];
  studentMarks: ExamResult[];
}

interface FeeItem {
  feeType: string;
  description: string;
  amount: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

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

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  const [editingPhoto, setEditingPhoto] = useState(false);
  const [editingFee, setEditingFee] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [tempFee, setTempFee] = useState<string>("");
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savingFee, setSavingFee] = useState(false);

  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [voucherMonth, setVoucherMonth] = useState(new Date().getMonth() + 1);
  const [voucherYear, setVoucherYear] = useState(new Date().getFullYear());
  const [feeItems, setFeeItems] = useState<FeeItem[]>([
    { feeType: "MONTHLY_FEE", description: "Monthly Tuition Fee", amount: 0 },
  ]);
  const [generatingVoucher, setGeneratingVoucher] = useState(false);

  // Edit voucher state
  const [editVoucherDialogOpen, setEditVoucherDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<FeeVoucher | null>(
    null
  );
  const [editVoucherItems, setEditVoucherItems] = useState<FeeItem[]>([]);
  const [editVoucherDiscount, setEditVoucherDiscount] = useState<string>("0");
  const [editVoucherLateFee, setEditVoucherLateFee] = useState<string>("0");
  const [savingVoucher, setSavingVoucher] = useState(false);

  // Receive payment state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentVoucher, setPaymentVoucher] = useState<FeeVoucher | null>(null);

  // Print remaining balance state
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => {
    fetchStudent();
  }, [id]);

  useEffect(() => {
    if (student) {
      setTempPhoto(student.photo || null);
      setTempFee(student.monthlyFee?.toString() || "0");
      setFeeItems([
        {
          feeType: "MONTHLY_FEE",
          description: "Monthly Tuition Fee",
          amount: student.monthlyFee || 0,
        },
      ]);
    }
  }, [student]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/students/${id}`);
      if (!res.ok) throw new Error("Failed to fetch student");
      const data = await res.json();
      setStudent(data);
    } catch (error) {
      toast.error("Failed to load student details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (photoPath: string | null) => {
    setTempPhoto(photoPath);
  };

  const savePhoto = async () => {
    if (!student) return;
    setSavingPhoto(true);
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: tempPhoto }),
      });
      if (!res.ok) throw new Error("Failed to update photo");
      setStudent({ ...student, photo: tempPhoto || undefined });
      setEditingPhoto(false);
      toast.success("Photo updated successfully");
    } catch (error) {
      toast.error("Failed to update photo");
    } finally {
      setSavingPhoto(false);
    }
  };

  const saveMonthlyFee = async () => {
    if (!student) return;
    const newFee = parseFloat(tempFee) || 0;
    setSavingFee(true);
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyFee: newFee }),
      });
      if (!res.ok) throw new Error("Failed to update monthly fee");
      setStudent({ ...student, monthlyFee: newFee });
      setEditingFee(false);
      setFeeItems((items) =>
        items.map((item) =>
          item.feeType === "MONTHLY_FEE" ? { ...item, amount: newFee } : item
        )
      );
      toast.success("Monthly fee updated successfully");
    } catch (error) {
      toast.error("Failed to update monthly fee");
    } finally {
      setSavingFee(false);
    }
  };

  const handleOpenVoucherDialog = () => {
    // Initialize feeItems with student's monthly fee
    if (student) {
      setFeeItems([
        {
          feeType: "MONTHLY_FEE",
          description: "Monthly Tuition Fee",
          amount: student.monthlyFee || 0,
        },
      ]);
    } else {
      setFeeItems([
        {
          feeType: "MONTHLY_FEE",
          description: "Monthly Tuition Fee",
          amount: 0,
        },
      ]);
    }
    setVoucherDialogOpen(true);
  };

  const addFeeItem = () => {
    setFeeItems([
      ...feeItems,
      { feeType: "OTHER", description: "", amount: 0 },
    ]);
  };

  const removeFeeItem = (index: number) => {
    if (feeItems.length === 1) {
      toast.error("At least one fee item is required");
      return;
    }
    setFeeItems(feeItems.filter((_, i) => i !== index));
  };

  const updateFeeItem = (
    index: number,
    field: keyof FeeItem,
    value: string | number
  ) => {
    setFeeItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const getTotalVoucherAmount = () => {
    return feeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleGenerateVoucher = async () => {
    if (!student) return;

    // Filter out items with zero or negative amounts
    const validFeeItems = feeItems.filter((item) => (item.amount || 0) > 0);

    // Validate that there's at least one valid item
    if (validFeeItems.length === 0) {
      toast.error(
        "Please add at least one fee item with amount greater than 0"
      );
      return;
    }

    // Validate total amount
    const totalAmount = validFeeItems.reduce(
      (sum, item) => sum + (item.amount || 0),
      0
    );
    if (totalAmount <= 0) {
      toast.error(
        "Please add at least one fee item with amount greater than 0"
      );
      return;
    }

    setGeneratingVoucher(true);
    try {
      const res = await fetch("/api/fee-vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          month: voucherMonth,
          year: voucherYear,
          feeItems: validFeeItems, // Send only valid fee items
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate voucher");
      toast.success(data.message || "Voucher generated successfully");
      setVoucherDialogOpen(false);
      // Reset feeItems for next time
      setFeeItems([
        {
          feeType: "MONTHLY_FEE",
          description: "Monthly Tuition Fee",
          amount: student.monthlyFee || 0,
        },
      ]);
      fetchStudent();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate voucher");
    } finally {
      setGeneratingVoucher(false);
    }
  };

  // Edit voucher functions
  const canEditVoucher = (status: string) => {
    return status === "UNPAID" || status === "PARTIAL" || status === "OVERDUE";
  };

  const handleOpenEditVoucher = (voucher: FeeVoucher) => {
    setSelectedVoucher(voucher);
    setEditVoucherDiscount(voucher.discount.toString());
    setEditVoucherLateFee(voucher.lateFee.toString());
    // Set fee items - we'll load from subtotal since we don't have items in the list
    setEditVoucherItems([
      {
        feeType: "MONTHLY_FEE",
        description: "Monthly Fee",
        amount: voucher.subtotal,
      },
    ]);
    setEditVoucherDialogOpen(true);
  };

  const addEditVoucherItem = () => {
    setEditVoucherItems([
      ...editVoucherItems,
      { feeType: "OTHER", description: "", amount: 0 },
    ]);
  };

  const removeEditVoucherItem = (index: number) => {
    if (editVoucherItems.length === 1) return;
    setEditVoucherItems(editVoucherItems.filter((_, i) => i !== index));
  };

  const updateEditVoucherItem = (
    index: number,
    field: keyof FeeItem,
    value: string | number
  ) => {
    setEditVoucherItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const getEditVoucherTotal = () => {
    const subtotal = editVoucherItems.reduce(
      (sum, item) => sum + (item.amount || 0),
      0
    );
    const discount = parseFloat(editVoucherDiscount) || 0;
    const lateFee = parseFloat(editVoucherLateFee) || 0;
    const previousBalance = selectedVoucher?.previousBalance || 0;
    return subtotal + previousBalance + lateFee - discount;
  };

  const handleSaveVoucher = async () => {
    if (!selectedVoucher) return;
    setSavingVoucher(true);
    try {
      const res = await fetch(`/api/fee-vouchers/${selectedVoucher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeItems: editVoucherItems,
          discount: parseFloat(editVoucherDiscount) || 0,
          lateFee: parseFloat(editVoucherLateFee) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update voucher");
      toast.success("Voucher updated successfully");
      setEditVoucherDialogOpen(false);
      fetchStudent();
    } catch (error: any) {
      toast.error(error.message || "Failed to update voucher");
    } finally {
      setSavingVoucher(false);
    }
  };

  // Payment handling functions
  const handleReceivePayment = (voucher: FeeVoucher) => {
    setPaymentVoucher(voucher);
    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setPaymentVoucher(null);
    fetchStudent();
  };

  const handlePrintRemainingBalance = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setShowPrintView(false);
      }, 100);
    }, 100);
  };

  // Build ledger data (combined vouchers and payments)
  const buildLedgerData = () => {
    if (!student) return [];

    const ledgerData: Array<{
      date: Date;
      type: "VOUCHER" | "PAYMENT";
      reference: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }> = [];

    let runningBalance = 0;

    // Combine and sort by date
    // Use subtotal for vouchers to show actual amount charged (not including previousBalance)
    const allTransactions = [
      ...(student.feeVouchers || []).map((v) => ({
        date: new Date(v.dueDate),
        type: "VOUCHER" as const,
        reference: v.voucherNo,
        description: `Fee Voucher - ${monthNames[v.month - 1]} ${v.year}`,
        amount: v.subtotal, // Use subtotal to avoid double-counting previousBalance
        id: v.id,
      })),
      ...(student.feeVouchers || []).flatMap((v) =>
        (v.payments || []).map((pay) => ({
          date: new Date(pay.paymentDate),
          type: "PAYMENT" as const,
          reference: pay.receiptNo,
          description: `Payment - ${pay.paymentMethod}`,
          amount: pay.amount,
          id: pay.id,
        }))
      ),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    allTransactions.forEach((tx) => {
      if (tx.type === "VOUCHER") {
        runningBalance += tx.amount;
        ledgerData.push({
          date: tx.date,
          type: tx.type,
          reference: tx.reference,
          description: tx.description,
          debit: tx.amount,
          credit: 0,
          balance: runningBalance,
        });
      } else {
        runningBalance -= tx.amount;
        ledgerData.push({
          date: tx.date,
          type: tx.type,
          reference: tx.reference,
          description: tx.description,
          debit: 0,
          credit: tx.amount,
          balance: runningBalance,
        });
      }
    });

    return ledgerData;
  };

  const ledgerData = buildLedgerData();

  // Calculate totals
  // Use subtotal for actual invoiced amount (not including carried forward balances)
  const totalInvoiced =
    student?.feeVouchers?.reduce((sum, v) => sum + v.subtotal, 0) || 0;
  const totalPaid =
    student?.feeVouchers?.reduce(
      (sum, v) =>
        sum + (v.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0),
      0
    ) || 0;
  // Balance due is totalInvoiced - totalPaid (or sum of all balanceDue)
  const totalBalance =
    student?.feeVouchers?.reduce((sum, v) => sum + v.balanceDue, 0) || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "INACTIVE":
        return "default";
      case "SUSPENDED":
        return "warning";
      case "EXPELLED":
        return "error";
      case "GRADUATED":
        return "info";
      case "TRANSFERRED":
        return "secondary";
      default:
        return "default";
    }
  };

  const getVoucherStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "success";
      case "PARTIAL":
        return "warning";
      case "UNPAID":
        return "error";
      case "OVERDUE":
        return "error";
      case "CANCELLED":
        return "default";
      default:
        return "default";
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "success";
      case "ABSENT":
        return "error";
      case "LATE":
        return "warning";
      case "LEAVE":
        return "info";
      case "HALF_DAY":
        return "warning";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Check if student is a defaulter (has unpaid fees older than 2 months)
  const isDefaulter = (): boolean => {
    if (!student?.feeVouchers || student.feeVouchers.length === 0) {
      return false;
    }

    const today = new Date();
    const twoMonthsAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 2,
      today.getDate()
    );

    return student.feeVouchers.some((voucher) => {
      if (voucher.balanceDue <= 0) return false;

      // Create date from voucher month and year
      const voucherDate = new Date(voucher.year, voucher.month - 1, 1);

      // Check if voucher is older than 2 months
      return voucherDate < twoMonthsAgo;
    });
  };

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

  if (!student) {
    return (
      <MainLayout>
        <Box textAlign="center" py={5}>
          <Typography variant="h6" color="text.secondary">
            Student not found
          </Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push("/students")}
            sx={{ mt: 2 }}
          >
            Back to Students
          </Button>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 3,
          }}
        >
          <Box>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => router.push("/students")}
              sx={{ mb: 1 }}
            >
              Back to Students
            </Button>
            <Typography variant="h4" fontWeight="bold">
              Student Profile
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => router.push(`/students/${id}/edit`)}
            >
              Edit Student
            </Button>
          </Box>
        </Box>

        {/* Profile Header Card */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: "center" }}>
                {editingPhoto ? (
                  <Box>
                    <ImageUpload
                      value={tempPhoto}
                      onChange={handlePhotoChange}
                      type="student"
                      size={150}
                      name={`${student.firstName} ${student.lastName}`}
                    />
                    <Box
                      sx={{
                        mt: 2,
                        display: "flex",
                        justifyContent: "center",
                        gap: 1,
                      }}
                    >
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={
                          savingPhoto ? (
                            <CircularProgress size={16} />
                          ) : (
                            <Save />
                          )
                        }
                        onClick={savePhoto}
                        disabled={savingPhoto}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.9)",
                          color: "success.main",
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        startIcon={<Close />}
                        onClick={() => {
                          setEditingPhoto(false);
                          setTempPhoto(student.photo || null);
                        }}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.9)",
                          color: "error.main",
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ position: "relative", display: "inline-block" }}>
                    <Avatar
                      src={student.photo ? student.photo : undefined}
                      sx={{
                        width: 150,
                        height: 150,
                        fontSize: "3rem",
                        bgcolor: "rgba(255,255,255,0.2)",
                        border: "4px solid rgba(255,255,255,0.5)",
                      }}
                    >
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </Avatar>
                    <Tooltip title="Change Photo">
                      <IconButton
                        onClick={() => setEditingPhoto(true)}
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          bgcolor: "white",
                          "&:hover": { bgcolor: "grey.100" },
                        }}
                        size="small"
                      >
                        <PhotoCamera fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Typography variant="h4" fontWeight="bold">
                  {student.firstName} {student.lastName}
                </Typography>
                {isDefaulter() && (
                  <Chip
                    label="Defaulter"
                    size="small"
                    color="error"
                    sx={{
                      height: "28px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      bgcolor: "rgba(255,255,255,0.95)",
                    }}
                  />
                )}
              </Box>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Chip
                  icon={<Badge />}
                  label={student.registrationNo}
                  sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
                />
                <Chip
                  label={student.status}
                  color={getStatusColor(student.status) as any}
                  size="small"
                />
              </Stack>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                <School sx={{ fontSize: 18, mr: 1, verticalAlign: "middle" }} />
                {student.class?.name || "N/A"} -{" "}
                {student.section?.name || "N/A"}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                Academic Year: {student.academicYear?.name || "N/A"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <CardContent>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "rgba(255,255,255,0.8)", mb: 1 }}
                  >
                    Monthly Tuition Fee
                  </Typography>
                  {editingFee ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TextField
                        value={tempFee}
                        onChange={(e) => setTempFee(e.target.value)}
                        type="number"
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              Rs.
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          bgcolor: "white",
                          borderRadius: 1,
                          "& .MuiOutlinedInput-root": { borderRadius: 1 },
                        }}
                      />
                      <IconButton
                        onClick={saveMonthlyFee}
                        disabled={savingFee}
                        sx={{
                          bgcolor: "success.main",
                          color: "white",
                          "&:hover": { bgcolor: "success.dark" },
                        }}
                        size="small"
                      >
                        {savingFee ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Check />
                        )}
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setEditingFee(false);
                          setTempFee(student.monthlyFee?.toString() || "0");
                        }}
                        sx={{
                          bgcolor: "error.main",
                          color: "white",
                          "&:hover": { bgcolor: "error.dark" },
                        }}
                        size="small"
                      >
                        <Close />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="h4" fontWeight="bold">
                        {formatCurrency(student.monthlyFee || 0)}
                      </Typography>
                      <Tooltip title="Edit Monthly Fee">
                        <IconButton
                          onClick={() => setEditingFee(true)}
                          size="small"
                          sx={{ color: "rgba(255,255,255,0.8)" }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Receipt />}
                    onClick={handleOpenVoucherDialog}
                    sx={{
                      mt: 2,
                      bgcolor: "white",
                      color: "primary.main",
                      "&:hover": { bgcolor: "grey.100" },
                    }}
                  >
                    Generate Voucher
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards - Like Panaflex */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            >
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Invoiced
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="#1a237e">
                  {formatCurrency(totalInvoiced)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            >
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Paid
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {formatCurrency(totalPaid)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1,
                  }}
                >
                  <Typography color="text.secondary" gutterBottom>
                    Balance Due
                  </Typography>
                  {totalBalance > 0 && (
                    <Tooltip title="Print Remaining Balance">
                      <IconButton
                        size="small"
                        onClick={handlePrintRemainingBalance}
                        sx={{ color: "primary.main" }}
                      >
                        <Print fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  color={totalBalance > 0 ? "error.main" : "success.main"}
                >
                  {formatCurrency(totalBalance)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card
              sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            >
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Status
                </Typography>
                <Chip
                  label={student.status}
                  color={getStatusColor(student.status) as any}
                  sx={{ fontWeight: 600 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Receive Payment Button */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<PaymentIcon />}
            onClick={() => {
              const unpaidVoucher = student.feeVouchers?.find(
                (v) => v.status !== "PAID" && v.status !== "CANCELLED"
              );
              if (unpaidVoucher) {
                handleReceivePayment(unpaidVoucher);
              }
            }}
            disabled={
              !student.feeVouchers?.some(
                (v) => v.status !== "PAID" && v.status !== "CANCELLED"
              )
            }
            sx={{
              borderColor: "#4caf50",
              color: "#4caf50",
              "&:hover": { borderColor: "#388e3c", bgcolor: "#4caf5010" },
            }}
          >
            Receive Payment
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setVoucherDialogOpen(true)}
            sx={{ bgcolor: "#1a237e" }}
          >
            Generate Voucher
          </Button>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3, borderRadius: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": { fontWeight: 600 },
              "& .Mui-selected": { color: "#1a237e" },
              "& .MuiTabs-indicator": { bgcolor: "#1a237e" },
            }}
          >
            <Tab
              label="Ledger"
              icon={<AccountBalanceWallet sx={{ fontSize: 18 }} />}
              iconPosition="start"
            />
            <Tab
              label={`Vouchers (${student.feeVouchers?.length || 0})`}
              icon={<Receipt sx={{ fontSize: 18 }} />}
              iconPosition="start"
            />
            <Tab
              label="Payments"
              icon={<PaymentIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
            />
            <Tab
              label="Personal Info"
              icon={<Person sx={{ fontSize: 18 }} />}
              iconPosition="start"
            />
            <Tab label="Attendance" />
            <Tab label="Results" />
          </Tabs>
        </Paper>

        {/* Ledger Tab */}
        <TabPanel value={tabValue} index={0}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: "#1a237e" }}>
              Account Ledger
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Reference</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Description
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="right">
                      Debit
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="right">
                      Credit
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="right">
                      Balance
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledgerData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No transactions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerData.map((entry, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{entry.date.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={entry.reference}
                            size="small"
                            color={
                              entry.type === "VOUCHER" ? "primary" : "success"
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell align="right">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "success.main" }}>
                          {entry.credit > 0
                            ? formatCurrency(entry.credit)
                            : "-"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: "bold",
                            color:
                              entry.balance > 0 ? "error.main" : "success.main",
                          }}
                        >
                          {formatCurrency(entry.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </TabPanel>

        {/* Fee Vouchers Tab */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" sx={{ color: "#1a237e" }}>
                Fee Vouchers
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setVoucherDialogOpen(true)}
                sx={{ bgcolor: "#1a237e" }}
              >
                Generate New Voucher
              </Button>
            </Box>

            {student.feeVouchers && student.feeVouchers.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Voucher #
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Period</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Due Date
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Total
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Paid
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Balance
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="center">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {student.feeVouchers.map((voucher) => (
                      <TableRow key={voucher.id} hover>
                        <TableCell>
                          <Typography fontWeight={500}>
                            {voucher.voucherNo}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {monthNames[voucher.month - 1]} {voucher.year}
                        </TableCell>
                        <TableCell>{formatDate(voucher.dueDate)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(voucher.totalAmount)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "success.main" }}>
                          {formatCurrency(voucher.paidAmount)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color:
                              voucher.balanceDue > 0
                                ? "error.main"
                                : "success.main",
                            fontWeight: 500,
                          }}
                        >
                          {formatCurrency(voucher.balanceDue)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={voucher.status}
                            size="small"
                            color={getVoucherStatusColor(voucher.status) as any}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "center",
                            }}
                          >
                            {voucher.status !== "PAID" &&
                              voucher.status !== "CANCELLED" && (
                                <Tooltip title="Receive Payment">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() =>
                                      handleReceivePayment(voucher)
                                    }
                                  >
                                    <PaymentIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            {canEditVoucher(voucher.status) && (
                              <Tooltip title="Edit Voucher">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEditVoucher(voucher)}
                                  color="primary"
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Receipt sx={{ fontSize: 60, color: "text.disabled", mb: 2 }} />
                <Typography color="text.secondary">
                  No fee vouchers found
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setVoucherDialogOpen(true)}
                  sx={{ mt: 2 }}
                >
                  Generate First Voucher
                </Button>
              </Box>
            )}
          </Paper>
        </TabPanel>

        {/* Payments Tab */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: "#1a237e" }}>
              Payment History
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Receipt #</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Voucher</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="right">
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {student.feeVouchers?.flatMap((v) =>
                    (v.payments || []).map((payment) => (
                      <TableRow key={payment.id} hover>
                        <TableCell>
                          <Typography fontWeight={500}>
                            {payment.receiptNo}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        <TableCell>
                          <Chip
                            label={v.voucherNo}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: "success.main", fontWeight: 500 }}
                        >
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {(!student.feeVouchers ||
                    student.feeVouchers.every(
                      (v) => !v.payments || v.payments.length === 0
                    )) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No payments yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </TabPanel>

        {/* Personal Info Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            {/* Personal Details */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, height: "100%", borderRadius: 3 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "#1a237e",
                  }}
                >
                  <Person color="primary" /> Personal Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Full Name
                    </Typography>
                    <Typography variant="body1">
                      {student.firstName} {student.lastName}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Father Name
                    </Typography>
                    <Typography variant="body1">
                      {student.fatherName}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(student.dateOfBirth)}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Gender
                    </Typography>
                    <Typography variant="body1">{student.gender}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Religion
                    </Typography>
                    <Typography variant="body1">{student.religion}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Nationality
                    </Typography>
                    <Typography variant="body1">
                      {student.nationality}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Contact Details */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Phone color="primary" /> Contact Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {student.phone || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {student.email || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1">{student.address}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      City
                    </Typography>
                    <Typography variant="body1">{student.city}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Guardian Details */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Person color="primary" /> Guardian Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Guardian Name
                    </Typography>
                    <Typography variant="body1">
                      {student.guardianName}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Relationship
                    </Typography>
                    <Typography variant="body1">
                      {student.guardianRelation}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {student.guardianPhone}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      WhatsApp
                    </Typography>
                    <Typography variant="body1">
                      {student.guardianWhatsapp || student.guardianPhone}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Admission Details */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <CalendarMonth color="primary" /> Admission Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Admission Type
                    </Typography>
                    <Typography variant="body1">
                      {student.admissionType}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Admission Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(student.admissionDate)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Attendance Tab */}
        <TabPanel value={tabValue} index={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#1a237e" }}>
              Attendance Calendar
            </Typography>
            <AttendanceCalendar attendance={student.attendance || []} />
          </Paper>
        </TabPanel>

        {/* Results Tab */}
        <TabPanel value={tabValue} index={5}>
          <ResultCardsTab
            studentId={student.id}
            studentMarks={student.studentMarks || []}
            onRefresh={fetchStudent}
          />
        </TabPanel>

        {/* Receive Payment Dialog */}
        {showPaymentDialog && paymentVoucher && student && (
          <ReceivePaymentDialog
            open={showPaymentDialog}
            onClose={() => {
              setShowPaymentDialog(false);
              setPaymentVoucher(null);
            }}
            student={{
              id: student.id,
              registrationNo: student.registrationNo,
              firstName: student.firstName,
              lastName: student.lastName,
              class: student.class,
              section: student.section,
            }}
            voucher={paymentVoucher}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {/* Generate Voucher Dialog */}
        <Dialog
          open={voucherDialogOpen}
          onClose={() => setVoucherDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Generate Fee Voucher
            <Typography variant="body2" color="text.secondary">
              for {student.firstName} {student.lastName} (
              {student.registrationNo})
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={voucherMonth}
                    label="Month"
                    onChange={(e) => setVoucherMonth(e.target.value as number)}
                  >
                    {monthNames.map((name, index) => (
                      <MenuItem key={index} value={index + 1}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Year"
                  type="number"
                  value={voucherYear}
                  onChange={(e) => setVoucherYear(parseInt(e.target.value))}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
              Fee Items
            </Typography>

            {feeItems.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  gap: 2,
                  mb: 2,
                  alignItems: "center",
                }}
              >
                <TextField
                  size="small"
                  label="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateFeeItem(index, "description", e.target.value)
                  }
                  sx={{ flex: 2 }}
                />
                <TextField
                  size="small"
                  label="Amount"
                  type="number"
                  value={item.amount}
                  onChange={(e) =>
                    updateFeeItem(
                      index,
                      "amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">Rs.</InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1 }}
                />
                {feeItems.length > 1 && (
                  <IconButton
                    onClick={() => removeFeeItem(index)}
                    color="error"
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                )}
              </Box>
            ))}

            <Button
              startIcon={<Add />}
              onClick={addFeeItem}
              size="small"
              sx={{ mt: 1 }}
            >
              Add Another Fee
            </Button>

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6">Total Amount</Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {formatCurrency(getTotalVoucherAmount())}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVoucherDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleGenerateVoucher}
              disabled={generatingVoucher || getTotalVoucherAmount() === 0}
              startIcon={
                generatingVoucher ? <CircularProgress size={16} /> : <Receipt />
              }
            >
              {generatingVoucher ? "Generating..." : "Generate Voucher"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Voucher Dialog */}
        <Dialog
          open={editVoucherDialogOpen}
          onClose={() => setEditVoucherDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Edit Fee Voucher
            {selectedVoucher && (
              <Typography variant="body2" color="text.secondary">
                {selectedVoucher.voucherNo} -{" "}
                {monthNames[selectedVoucher.month - 1]} {selectedVoucher.year}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Fee Items
            </Typography>

            {editVoucherItems.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  gap: 2,
                  mb: 2,
                  alignItems: "center",
                }}
              >
                <TextField
                  size="small"
                  label="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateEditVoucherItem(index, "description", e.target.value)
                  }
                  sx={{ flex: 2 }}
                />
                <TextField
                  size="small"
                  label="Amount"
                  type="number"
                  value={item.amount}
                  onChange={(e) =>
                    updateEditVoucherItem(
                      index,
                      "amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">Rs.</InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1 }}
                />
                {editVoucherItems.length > 1 && (
                  <IconButton
                    onClick={() => removeEditVoucherItem(index)}
                    color="error"
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                )}
              </Box>
            ))}

            <Button
              startIcon={<Add />}
              onClick={addEditVoucherItem}
              size="small"
              sx={{ mb: 3 }}
            >
              Add Fee Item
            </Button>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Discount"
                  type="number"
                  value={editVoucherDiscount}
                  onChange={(e) => setEditVoucherDiscount(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">Rs.</InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Late Fee"
                  type="number"
                  value={editVoucherLateFee}
                  onChange={(e) => setEditVoucherLateFee(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">Rs.</InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            {selectedVoucher && selectedVoucher.previousBalance > 0 && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: "warning.light",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2">
                  Previous Balance:{" "}
                  {formatCurrency(selectedVoucher.previousBalance)}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6">New Total</Typography>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {formatCurrency(getEditVoucherTotal())}
              </Typography>
            </Box>

            {selectedVoucher && selectedVoucher.paidAmount > 0 && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: "success.light",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2">
                  Already Paid: {formatCurrency(selectedVoucher.paidAmount)}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  New Balance Due:{" "}
                  {formatCurrency(
                    getEditVoucherTotal() - selectedVoucher.paidAmount
                  )}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditVoucherDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveVoucher}
              disabled={savingVoucher}
              startIcon={
                savingVoucher ? <CircularProgress size={16} /> : <Save />
              }
            >
              {savingVoucher ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Print View for Remaining Balance - Hidden until printing */}
        {showPrintView && student && (
          <Box
            className="print-only"
            sx={{
              position: "fixed",
              left: "-9999px",
              top: 0,
              "@media print": {
                position: "static",
                left: "auto",
                width: "100%",
                background: "white",
              },
            }}
          >
            <RemainingBalancePrint
              student={{
                registrationNo: student.registrationNo,
                firstName: student.firstName,
                lastName: student.lastName,
                class: student.class,
                section: student.section,
              }}
              vouchers={student.feeVouchers || []}
              totalBalance={totalBalance}
            />
          </Box>
        )}
      </Box>
    </MainLayout>
  );
}
