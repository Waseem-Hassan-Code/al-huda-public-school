"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
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
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Receipt as ReceiptIcon,
  EventNote as AttendanceIcon,
  Assessment as ResultIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import StatusBadge from "@/components/common/StatusBadge";
import {
  formatCurrency,
  formatDate,
  getInitials,
  calculateAge,
  formatCNIC,
  formatPhoneNumber,
} from "@/lib/utils";
import { toast } from "sonner";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface StudentDetail {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  cnic: string;
  religion: string;
  nationality: string;
  bloodGroup: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  photo: string;
  status: string;
  admissionDate: string;
  previousSchool: string;
  previousClass: string;
  class: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  guardian: {
    id: string;
    firstName: string;
    lastName: string;
    relationship: string;
    cnic: string;
    phone: string;
    email: string;
    occupation: string;
  } | null;
  studentFees: {
    id: string;
    amount: number;
    discount: number;
    feeStructure: { name: string };
  }[];
  feeVouchers: {
    id: string;
    voucherNumber: string;
    month: number;
    year: number;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate: string;
  }[];
  attendances: {
    id: string;
    date: string;
    status: string;
    remarks: string;
  }[];
  examResults: {
    id: string;
    marksObtained: number;
    totalMarks: number;
    grade: string;
    exam: { name: string; examType: string };
    subject: { name: string };
  }[];
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await fetch(`/api/students/${id}`);
        if (response.ok) {
          const data = await response.json();
          setStudent(data);
        } else {
          toast.error("Failed to load student");
          router.push("/students");
        }
      } catch (error) {
        toast.error("An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && id) {
      fetchStudent();
    }
  }, [status, id, router]);

  if (!mounted || status === "loading" || loading) {
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

  if (!student) {
    return null;
  }

  const totalFees = (student.studentFees || []).reduce(
    (sum, f) => sum + f.amount - f.discount,
    0
  );
  const studentAttendances = student.attendances || [];
  const attendanceStats = {
    total: studentAttendances.length,
    present: studentAttendances.filter((a) => a.status === "PRESENT").length,
    absent: studentAttendances.filter((a) => a.status === "ABSENT").length,
  };
  const attendancePercentage =
    attendanceStats.total > 0
      ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
      : 0;

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
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
              startIcon={<BackIcon />}
              onClick={() => router.push("/students")}
              sx={{ mb: 2 }}
            >
              Back to Students
            </Button>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: 32,
                  bgcolor: "primary.main",
                }}
              >
                {getInitials(student.firstName, student.lastName)}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {student.firstName} {student.lastName}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {student.studentId} • {student.class?.name || "No Class"} -{" "}
                  {student.section?.name || "No Section"}
                </Typography>
                <StatusBadge status={student.status} />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<PrintIcon />}>
              Print Card
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => router.push(`/students/${id}/edit`)}
            >
              Edit
            </Button>
          </Box>
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" color="primary">
                {formatCurrency(totalFees)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monthly Fee
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" color="success.main">
                {attendancePercentage}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Attendance
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4">
                {
                  (student.feeVouchers || []).filter(
                    (v) => v.status === "PENDING" || v.status === "OVERDUE"
                  ).length
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Vouchers
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4">
                {calculateAge(student.dateOfBirth)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Age (Years)
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Personal Info" />
            <Tab
              label="Fee History"
              icon={<ReceiptIcon />}
              iconPosition="start"
            />
            <Tab
              label="Attendance"
              icon={<AttendanceIcon />}
              iconPosition="start"
            />
            <Tab label="Results" icon={<ResultIcon />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Personal Info Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography>{formatDate(student.dateOfBirth)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Gender
                    </Typography>
                    <Typography>{student.gender}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      CNIC / B-Form
                    </Typography>
                    <Typography>
                      {student.cnic ? formatCNIC(student.cnic) : "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Religion
                    </Typography>
                    <Typography>{student.religion || "-"}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Blood Group
                    </Typography>
                    <Typography>{student.bloodGroup || "-"}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Nationality
                    </Typography>
                    <Typography>{student.nationality}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography>
                      {student.address}, {student.city}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography>
                      {student.phone ? formatPhoneNumber(student.phone) : "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography>{student.email || "-"}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Academic Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Admission Date
                    </Typography>
                    <Typography>{formatDate(student.admissionDate)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Class & Section
                    </Typography>
                    <Typography>
                      {student.class?.name || "No Class"} -{" "}
                      {student.section?.name || "No Section"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Previous School
                    </Typography>
                    <Typography>{student.previousSchool || "-"}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Previous Class
                    </Typography>
                    <Typography>{student.previousClass || "-"}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {student.guardian && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Guardian Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Name
                      </Typography>
                      <Typography>
                        {student.guardian.firstName} {student.guardian.lastName}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Relationship
                      </Typography>
                      <Typography>{student.guardian.relationship}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        CNIC
                      </Typography>
                      <Typography>
                        {formatCNIC(student.guardian.cnic)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography>
                        {formatPhoneNumber(student.guardian.phone)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Occupation
                      </Typography>
                      <Typography>
                        {student.guardian.occupation || "-"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Email
                      </Typography>
                      <Typography>{student.guardian.email || "-"}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Fee Structure
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fee Type</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Discount</TableCell>
                        <TableCell align="right">Net Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(student.studentFees || []).map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell>{fee.feeStructure?.name || "-"}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(fee.amount)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(fee.discount)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(fee.amount - fee.discount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(student.studentFees || []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            No fee structure assigned
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <strong>Total Monthly Fee</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>{formatCurrency(totalFees)}</strong>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Fee History Tab */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">Fee Vouchers</Typography>
              <Button
                variant="contained"
                size="small"
                onClick={() => toast.info("Generate voucher feature")}
              >
                Generate Voucher
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Voucher #</TableCell>
                    <TableCell>Month/Year</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(student.feeVouchers || []).map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell>{voucher.voucherNumber}</TableCell>
                      <TableCell>{`${voucher.month}/${voucher.year}`}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(voucher.totalAmount)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(voucher.paidAmount)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(
                          voucher.totalAmount - voucher.paidAmount
                        )}
                      </TableCell>
                      <TableCell>{formatDate(voucher.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={voucher.status} />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Collect Payment">
                          <IconButton
                            size="small"
                            disabled={voucher.status === "PAID"}
                          >
                            <ReceiptIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print">
                          <IconButton size="small">
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(student.feeVouchers || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No fee vouchers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </TabPanel>

        {/* Attendance Tab */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Attendance Record (Last 30 Days)
            </Typography>
            <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
              <Chip
                label={`Present: ${attendanceStats.present}`}
                color="success"
              />
              <Chip label={`Absent: ${attendanceStats.absent}`} color="error" />
              <Chip
                label={`Attendance: ${attendancePercentage}%`}
                color="primary"
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(student.attendances || []).map((attendance) => (
                    <TableRow key={attendance.id}>
                      <TableCell>{formatDate(attendance.date)}</TableCell>
                      <TableCell>
                        <StatusBadge status={attendance.status} />
                      </TableCell>
                      <TableCell>{attendance.remarks || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {(student.attendances || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </TabPanel>

        {/* Results Tab */}
        <TabPanel value={tabValue} index={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Exam Results
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Exam</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell align="right">Marks</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Grade</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(student.examResults || []).map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>{result.exam.name}</TableCell>
                      <TableCell>
                        <Chip label={result.exam.examType} size="small" />
                      </TableCell>
                      <TableCell>{result.subject.name}</TableCell>
                      <TableCell align="right">
                        {result.marksObtained}
                      </TableCell>
                      <TableCell align="right">{result.totalMarks}</TableCell>
                      <TableCell>
                        <Chip
                          label={result.grade}
                          size="small"
                          color={
                            result.grade.startsWith("A")
                              ? "success"
                              : result.grade === "F"
                              ? "error"
                              : "default"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(student.examResults || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No exam results found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </TabPanel>
      </Box>
    </MainLayout>
  );
}
