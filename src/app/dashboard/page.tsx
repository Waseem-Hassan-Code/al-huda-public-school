"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Grid,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
} from "@mui/material";
import {
  People as PeopleIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  EventAvailable as AttendanceIcon,
  Report as ComplaintIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import PaymentChart from "@/components/dashboard/PaymentChart";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSections: number;
  pendingFeeVouchers: number;
  monthlyRevenue: number;
  attendancePercentage: number;
  pendingComplaints: number;
}

interface RecentPayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receiptNumber: string;
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
  };
}

interface ChartData {
  month: string;
  revenue: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setRecentPayments(data.recentPayments);
          setChartData(data.chartData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Skeleton variant="text" width={300} height={40} sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            {[...Array(8)].map((_, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <Skeleton
                  variant="rectangular"
                  height={140}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 3 }}>
            <Skeleton
              variant="rectangular"
              height={400}
              sx={{ borderRadius: 2 }}
            />
          </Box>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back, {session?.user?.name}! Here&apos;s your school
            overview.
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Students"
              value={stats?.totalStudents || 0}
              subtitle={`${stats?.activeStudents || 0} active`}
              icon={<PeopleIcon />}
              color="#1976d2"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Teachers"
              value={stats?.totalTeachers || 0}
              icon={<PersonIcon />}
              color="#388e3c"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Classes"
              value={stats?.totalClasses || 0}
              subtitle={`${stats?.totalSections || 0} sections`}
              icon={<SchoolIcon />}
              color="#f57c00"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(stats?.monthlyRevenue || 0)}
              icon={<TrendingUpIcon />}
              color="#7b1fa2"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending Vouchers"
              value={stats?.pendingFeeVouchers || 0}
              icon={<ReceiptIcon />}
              color="#d32f2f"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Today's Attendance"
              value={`${stats?.attendancePercentage || 0}%`}
              icon={<AttendanceIcon />}
              color="#0288d1"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending Complaints"
              value={stats?.pendingComplaints || 0}
              icon={<ComplaintIcon />}
              color="#c2185b"
            />
          </Grid>
        </Grid>

        {/* Charts and Tables */}
        <Grid container spacing={3}>
          {/* Revenue Chart */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                Revenue Overview (Last 6 Months)
              </Typography>
              <PaymentChart data={chartData} />
            </Paper>
          </Grid>

          {/* Quick Stats */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "primary.light",
                    borderRadius: 2,
                    cursor: "pointer",
                    "&:hover": { opacity: 0.9 },
                  }}
                  onClick={() => router.push("/students/admission")}
                >
                  <Typography variant="subtitle2" color="primary.contrastText">
                    New Student Admission
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "success.light",
                    borderRadius: 2,
                    cursor: "pointer",
                    "&:hover": { opacity: 0.9 },
                  }}
                  onClick={() => router.push("/fees/generate")}
                >
                  <Typography variant="subtitle2" color="success.contrastText">
                    Generate Fee Vouchers
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "warning.light",
                    borderRadius: 2,
                    cursor: "pointer",
                    "&:hover": { opacity: 0.9 },
                  }}
                  onClick={() => router.push("/attendance")}
                >
                  <Typography variant="subtitle2" color="warning.contrastText">
                    Mark Attendance
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "info.light",
                    borderRadius: 2,
                    cursor: "pointer",
                    "&:hover": { opacity: 0.9 },
                  }}
                  onClick={() => router.push("/exams/results")}
                >
                  <Typography variant="subtitle2" color="info.contrastText">
                    Enter Exam Results
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Recent Payments Table */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                Recent Fee Payments
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Receipt #</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell>Student ID</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentPayments.length > 0 ? (
                      recentPayments.map((payment) => (
                        <TableRow key={payment.id} hover>
                          <TableCell>{payment.receiptNumber}</TableCell>
                          <TableCell>
                            {payment.student.firstName}{" "}
                            {payment.student.lastName}
                          </TableCell>
                          <TableCell>{payment.student.studentId}</TableCell>
                          <TableCell>
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.paymentMethod}
                              size="small"
                              color={
                                payment.paymentMethod === "CASH"
                                  ? "success"
                                  : "primary"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {formatDate(payment.paymentDate)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Box sx={{ py: 4 }}>
                            <WarningIcon
                              sx={{
                                fontSize: 48,
                                color: "text.disabled",
                                mb: 1,
                              }}
                            />
                            <Typography color="text.secondary">
                              No recent payments found
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
}
