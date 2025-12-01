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
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ImageUpload from "@/components/common/ImageUpload";

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
  marksObtained: number;
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
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
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
    { feeType: "MONTHLY_FEE", description: "Monthly Tuition Fee", amount: 0 }
  ]);
  const [generatingVoucher, setGeneratingVoucher] = useState(false);

  useEffect(() => {
    fetchStudent();
  }, [id]);

  useEffect(() => {
    if (student) {
      setTempPhoto(student.photo || null);
      setTempFee(student.monthlyFee?.toString() || "0");
      setFeeItems([
        { feeType: "MONTHLY_FEE", description: "Monthly Tuition Fee", amount: student.monthlyFee || 0 }
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
      setFeeItems(items => 
        items.map(item => 
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

  const addFeeItem = () => {
    setFeeItems([...feeItems, { feeType: "OTHER", description: "", amount: 0 }]);
  };

  const removeFeeItem = (index: number) => {
    if (index === 0) return;
    setFeeItems(feeItems.filter((_, i) => i !== index));
  };

  const updateFeeItem = (index: number, field: keyof FeeItem, value: string | number) => {
    setFeeItems(items =>
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const getTotalVoucherAmount = () => {
    return feeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleGenerateVoucher = async () => {
    if (!student) return;
    setGeneratingVoucher(true);
    try {
      const res = await fetch("/api/fee-vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          month: voucherMonth,
          year: voucherYear,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate voucher");
      toast.success(data.message || "Voucher generated successfully");
      setVoucherDialogOpen(false);
      fetchStudent();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate voucher");
    } finally {
      setGeneratingVoucher(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "success";
      case "INACTIVE": return "default";
      case "SUSPENDED": return "warning";
      case "EXPELLED": return "error";
      case "GRADUATED": return "info";
      case "TRANSFERRED": return "secondary";
      default: return "default";
    }
  };

  const getVoucherStatusColor = (status: string) => {
    switch (status) {
      case "PAID": return "success";
      case "PARTIALLY_PAID": return "warning";
      case "UNPAID": return "error";
      case "OVERDUE": return "error";
      case "CANCELLED": return "default";
      default: return "default";
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "success";
      case "ABSENT": return "error";
      case "LATE": return "warning";
      case "LEAVE": return "info";
      case "HALF_DAY": return "warning";
      default: return "default";
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!student) {
    return (
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
    );
  }

  return (
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
                  <Box sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={savingPhoto ? <CircularProgress size={16} /> : <Save />}
                      onClick={savePhoto}
                      disabled={savingPhoto}
                      sx={{ bgcolor: "rgba(255,255,255,0.9)", color: "success.main" }}
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
                      sx={{ bgcolor: "rgba(255,255,255,0.9)", color: "error.main" }}
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
                    {student.firstName[0]}{student.lastName[0]}
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
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {student.firstName} {student.lastName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
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
              {student.class?.name || "N/A"} - {student.section?.name || "N/A"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
              Academic Year: {student.academicYear?.name || "N/A"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.8)", mb: 1 }}>
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
                        startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
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
                      sx={{ bgcolor: "success.main", color: "white", "&:hover": { bgcolor: "success.dark" } }}
                      size="small"
                    >
                      {savingFee ? <CircularProgress size={16} color="inherit" /> : <Check />}
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setEditingFee(false);
                        setTempFee(student.monthlyFee?.toString() || "0");
                      }}
                      sx={{ bgcolor: "error.main", color: "white", "&:hover": { bgcolor: "error.dark" } }}
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
                  onClick={() => setVoucherDialogOpen(true)}
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

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Personal Information" />
          <Tab label={`Fee Vouchers (${student.feeVouchers?.length || 0})`} />
          <Tab label="Attendance" />
          <Tab label="Results" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Personal Details */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Person color="primary" /> Personal Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Full Name</Typography>
                  <Typography variant="body1">{student.firstName} {student.lastName}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Father Name</Typography>
                  <Typography variant="body1">{student.fatherName}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                  <Typography variant="body1">{formatDate(student.dateOfBirth)}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Gender</Typography>
                  <Typography variant="body1">{student.gender}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Religion</Typography>
                  <Typography variant="body1">{student.religion}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Nationality</Typography>
                  <Typography variant="body1">{student.nationality}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Contact Details */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Phone color="primary" /> Contact Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{student.phone || "N/A"}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{student.email || "N/A"}</Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">Address</Typography>
                  <Typography variant="body1">{student.address}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">City</Typography>
                  <Typography variant="body1">{student.city}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Guardian Details */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Person color="primary" /> Guardian Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Guardian Name</Typography>
                  <Typography variant="body1">{student.guardianName}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Relationship</Typography>
                  <Typography variant="body1">{student.guardianRelation}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{student.guardianPhone}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">WhatsApp</Typography>
                  <Typography variant="body1">{student.guardianWhatsapp || student.guardianPhone}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Admission Details */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarMonth color="primary" /> Admission Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Admission Type</Typography>
                  <Typography variant="body1">{student.admissionType}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Admission Date</Typography>
                  <Typography variant="body1">{formatDate(student.admissionDate)}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Fee Vouchers Tab */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">
              <AttachMoney sx={{ mr: 1, verticalAlign: "middle" }} />
              Fee Vouchers
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setVoucherDialogOpen(true)}
            >
              Generate New Voucher
            </Button>
          </Box>
          
          {student.feeVouchers && student.feeVouchers.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Voucher #</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {student.feeVouchers.map((voucher) => (
                    <TableRow key={voucher.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {voucher.voucherNo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {monthNames[voucher.month - 1]} {voucher.year}
                      </TableCell>
                      <TableCell>{formatDate(voucher.dueDate)}</TableCell>
                      <TableCell align="right">{formatCurrency(voucher.totalAmount)}</TableCell>
                      <TableCell align="right">
                        <Typography color={voucher.paidAmount > 0 ? "success.main" : "text.secondary"}>
                          {formatCurrency(voucher.paidAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography color={voucher.balanceDue > 0 ? "error.main" : "success.main"} fontWeight="medium">
                          {formatCurrency(voucher.balanceDue)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={voucher.status}
                          size="small"
                          color={getVoucherStatusColor(voucher.status) as any}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <Receipt sx={{ fontSize: 60, color: "text.disabled", mb: 2 }} />
              <Typography color="text.secondary">No fee vouchers found</Typography>
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

      {/* Attendance Tab */}
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Attendance (Last 30 Days)
          </Typography>
          {student.attendance && student.attendance.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Day</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {student.attendance.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString("en-US", { weekday: "long" })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          size="small"
                          color={getAttendanceColor(record.status) as any}
                        />
                      </TableCell>
                      <TableCell>{record.remarks || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <Typography color="text.secondary">No attendance records found</Typography>
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* Results Tab */}
      <TabPanel value={tabValue} index={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Exam Results
          </Typography>
          {student.studentMarks && student.studentMarks.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Exam</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell align="center">Marks</TableCell>
                    <TableCell align="center">Grade</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {student.studentMarks.map((result) => (
                    <TableRow key={result.id} hover>
                      <TableCell>{result.exam.name}</TableCell>
                      <TableCell>{formatDate(result.exam.examDate)}</TableCell>
                      <TableCell>{result.subject.name}</TableCell>
                      <TableCell align="center">
                        <Typography
                          color={result.marksObtained >= result.exam.passingMarks ? "success.main" : "error.main"}
                          fontWeight="medium"
                        >
                          {result.marksObtained} / {result.exam.totalMarks}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={result.grade || "N/A"}
                          size="small"
                          color={result.marksObtained >= result.exam.passingMarks ? "success" : "error"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <Typography color="text.secondary">No exam results found</Typography>
            </Box>
          )}
        </Paper>
      </TabPanel>

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
            for {student.firstName} {student.lastName} ({student.registrationNo})
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
                onChange={(e) => updateFeeItem(index, "description", e.target.value)}
                sx={{ flex: 2 }}
                disabled={index === 0}
              />
              <TextField
                size="small"
                label="Amount"
                type="number"
                value={item.amount}
                onChange={(e) => updateFeeItem(index, "amount", parseFloat(e.target.value) || 0)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                }}
                sx={{ flex: 1 }}
              />
              {index > 0 && (
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

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
            startIcon={generatingVoucher ? <CircularProgress size={16} /> : <Receipt />}
          >
            {generatingVoucher ? "Generating..." : "Generate Voucher"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
