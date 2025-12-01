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
  Button,
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
  Payment as PaymentIcon,
  AccountBalance as AccountBalanceIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import PaymentChart from "@/components/dashboard/PaymentChart";
import { formatCurrency, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/common/StatusBadge";

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSections: number;
  pendingFeeVouchers: number;
  monthlyRevenue: number;
  todayRevenue: number;
  pendingAmount: number;
  attendancePercentage: number;
  pendingComplaints: number;
  recentVouchers: any[];
}

interface RecentPayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receiptNo: string;
  student: {
    id: string;
    registrationNo: string;
    firstName: string;
    lastName: string;
  };
  voucher?: {
    voucherNo: string;
  };
}

interface ChartData {
  date: string;
  amount: number;
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

        {/* Stats Cards - Panaflex Style */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Today's Payments"
              value={formatCurrency(stats?.todayRevenue || 0)}
              icon={<PaymentIcon sx={{ fontSize: 28 }} />}
              color="#4caf50"
              clickable
              onClick={() => router.push("/fees")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="This Month's Revenue"
              value={formatCurrency(stats?.monthlyRevenue || 0)}
              icon={<TrendingUpIcon sx={{ fontSize: 28 }} />}
              color="#1a237e"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Pending Amount"
              value={formatCurrency(stats?.pendingAmount || 0)}
              icon={<AccountBalanceIcon sx={{ fontSize: 28 }} />}
              color="#f44336"
              count={stats?.pendingFeeVouchers || 0}
              countLabel="vouchers"
              clickable
              onClick={() => router.push("/fees")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Total Students"
              value={stats?.totalStudents || 0}
              icon={<PeopleIcon sx={{ fontSize: 28 }} />}
              color="#ff9800"
              subtitle={`${stats?.activeStudents || 0} active`}
              clickable
              onClick={() => router.push("/students")}
            />
          </Grid>
        </Grid>

        {/* Second Row Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Total Teachers"
              value={stats?.totalTeachers || 0}
              icon={<PersonIcon sx={{ fontSize: 28 }} />}
              color="#388e3c"
              clickable
              onClick={() => router.push("/teachers")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Classes"
              value={stats?.totalClasses || 0}
              subtitle={`${stats?.totalSections || 0} sections`}
              icon={<SchoolIcon sx={{ fontSize: 28 }} />}
              color="#9c27b0"
              clickable
              onClick={() => router.push("/classes")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Today's Attendance"
              value={`${stats?.attendancePercentage || 0}%`}
              icon={<AttendanceIcon sx={{ fontSize: 28 }} />}
              color="#0288d1"
              clickable
              onClick={() => router.push("/attendance")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              title="Pending Complaints"
              value={stats?.pendingComplaints || 0}
              icon={<ComplaintIcon sx={{ fontSize: 28 }} />}
              color="#c2185b"
              clickable
              onClick={() => router.push("/complaints")}
            />
          </Grid>
        </Grid>

        {/* Charts and Tables */}
        <Grid container spacing={3}>
          {/* Revenue Chart */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <PaymentChart
              data={chartData}
              title="Daily Payments (Last 14 Days)"
            />
          </Grid>

          {/* Quick Stats */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              <Typography
                variant="h6"
                fontWeight="600"
                sx={{ mb: 2, color: "#1a237e" }}
              >
                Quick Actions
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => router.push("/students/admission")}
                  sx={{
                    bgcolor: "#1a237e",
                    py: 1.5,
                    justifyContent: "flex-start",
                    "&:hover": { bgcolor: "#0d1447" },
                  }}
                >
                  New Student Admission
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => router.push("/fees")}
                  sx={{
                    bgcolor: "#4caf50",
                    py: 1.5,
                    justifyContent: "flex-start",
                    "&:hover": { bgcolor: "#388e3c" },
                  }}
                >
                  Receive Fee Payment
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => router.push("/attendance")}
                  sx={{
                    py: 1.5,
                    justifyContent: "flex-start",
                  }}
                >
                  Mark Attendance
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => router.push("/students")}
                  sx={{
                    py: 1.5,
                    justifyContent: "flex-start",
                  }}
                >
                  View All Students
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Recent Vouchers */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography variant="h6" sx={{ color: "#1a237e" }}>
                  Recent Fee Vouchers
                </Typography>
                <Button size="small" onClick={() => router.push("/fees")}>
                  View All
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Voucher #</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats?.recentVouchers || [])
                      .slice(0, 5)
                      .map((voucher: any) => (
                        <TableRow
                          key={voucher.id}
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() =>
                            router.push(`/students/${voucher.studentId}`)
                          }
                        >
                          <TableCell>{voucher.voucherNo}</TableCell>
                          <TableCell>
                            {voucher.student?.firstName}{" "}
                            {voucher.student?.lastName}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(voucher.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={voucher.status}
                              size="small"
                              color={
                                voucher.status === "PAID"
                                  ? "success"
                                  : voucher.status === "PARTIAL"
                                  ? "warning"
                                  : "error"
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    {(!stats?.recentVouchers ||
                      stats.recentVouchers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No vouchers yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Recent Payments Table */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography variant="h6" sx={{ color: "#1a237e" }}>
                  Recent Payments
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Receipt #</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentPayments.length > 0 ? (
                      recentPayments.slice(0, 5).map((payment) => (
                        <TableRow key={payment.id} hover>
                          <TableCell>{payment.receiptNo}</TableCell>
                          <TableCell>
                            {payment.student?.firstName}{" "}
                            {payment.student?.lastName}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: "success.main", fontWeight: 500 }}
                          >
                            {formatCurrency(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No recent payments
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
