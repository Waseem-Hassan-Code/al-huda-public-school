"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Print as PrintIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Payment as PaymentIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface ReportData {
  label: string;
  value: string | number;
}

const REPORT_TYPES = [
  {
    id: "fee_collection",
    name: "Fee Collection Report",
    icon: <PaymentIcon />,
  },
  {
    id: "student_strength",
    name: "Student Strength Report",
    icon: <SchoolIcon />,
  },
  { id: "attendance", name: "Attendance Report", icon: <PeopleIcon /> },
  { id: "exam_results", name: "Exam Results Report", icon: <AssessmentIcon /> },
  { id: "defaulters", name: "Fee Defaulters Report", icon: <TrendingUpIcon /> },
];

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

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const [selectedReport, setSelectedReport] = useState("fee_collection");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      await new Promise((resolve) => setTimeout(resolve, 500));

      switch (selectedReport) {
        case "fee_collection":
          setReportData({
            summary: [
              { label: "Total Expected", value: formatCurrency(2500000) },
              { label: "Total Collected", value: formatCurrency(1850000) },
              { label: "Outstanding", value: formatCurrency(650000) },
              { label: "Collection Rate", value: "74%" },
            ],
            breakdown: [
              {
                class: "Class 1",
                expected: 200000,
                collected: 180000,
                outstanding: 20000,
              },
              {
                class: "Class 2",
                expected: 220000,
                collected: 195000,
                outstanding: 25000,
              },
              {
                class: "Class 3",
                expected: 250000,
                collected: 200000,
                outstanding: 50000,
              },
              {
                class: "Class 4",
                expected: 280000,
                collected: 240000,
                outstanding: 40000,
              },
              {
                class: "Class 5",
                expected: 300000,
                collected: 250000,
                outstanding: 50000,
              },
              {
                class: "Class 6",
                expected: 320000,
                collected: 280000,
                outstanding: 40000,
              },
              {
                class: "Class 7",
                expected: 350000,
                collected: 270000,
                outstanding: 80000,
              },
              {
                class: "Class 8",
                expected: 380000,
                collected: 235000,
                outstanding: 145000,
              },
            ],
          });
          break;

        case "student_strength":
          setReportData({
            summary: [
              { label: "Total Students", value: 1250 },
              { label: "Boys", value: 680 },
              { label: "Girls", value: 570 },
              { label: "New Admissions", value: 85 },
            ],
            breakdown: [
              { class: "Class 1", boys: 45, girls: 40, total: 85 },
              { class: "Class 2", boys: 50, girls: 42, total: 92 },
              { class: "Class 3", boys: 55, girls: 48, total: 103 },
              { class: "Class 4", boys: 60, girls: 52, total: 112 },
              { class: "Class 5", boys: 65, girls: 55, total: 120 },
              { class: "Class 6", boys: 70, girls: 60, total: 130 },
              { class: "Class 7", boys: 75, girls: 65, total: 140 },
              { class: "Class 8", boys: 80, girls: 68, total: 148 },
            ],
          });
          break;

        case "attendance":
          setReportData({
            summary: [
              { label: "Average Attendance", value: "89%" },
              { label: "Total Present Days", value: 22 },
              { label: "Total Absent Days", value: 3 },
              { label: "Best Class", value: "Class 5A" },
            ],
            breakdown: [
              { class: "Class 1", attendance: "92%", present: 80, absent: 7 },
              { class: "Class 2", attendance: "90%", present: 85, absent: 9 },
              { class: "Class 3", attendance: "88%", present: 95, absent: 13 },
              { class: "Class 4", attendance: "91%", present: 100, absent: 10 },
              { class: "Class 5", attendance: "94%", present: 112, absent: 7 },
              { class: "Class 6", attendance: "87%", present: 110, absent: 16 },
              { class: "Class 7", attendance: "85%", present: 115, absent: 20 },
              { class: "Class 8", attendance: "89%", present: 130, absent: 16 },
            ],
          });
          break;

        case "exam_results":
          setReportData({
            summary: [
              { label: "Pass Rate", value: "92%" },
              { label: "A+ Grade", value: 125 },
              { label: "A Grade", value: 280 },
              { label: "Failed", value: 45 },
            ],
            breakdown: [
              {
                class: "Class 1",
                passRate: "95%",
                aPlus: 15,
                a: 30,
                failed: 4,
              },
              {
                class: "Class 2",
                passRate: "93%",
                aPlus: 18,
                a: 35,
                failed: 6,
              },
              {
                class: "Class 3",
                passRate: "91%",
                aPlus: 16,
                a: 38,
                failed: 8,
              },
              {
                class: "Class 4",
                passRate: "94%",
                aPlus: 20,
                a: 42,
                failed: 5,
              },
              {
                class: "Class 5",
                passRate: "92%",
                aPlus: 18,
                a: 45,
                failed: 7,
              },
              {
                class: "Class 6",
                passRate: "90%",
                aPlus: 14,
                a: 40,
                failed: 9,
              },
              {
                class: "Class 7",
                passRate: "88%",
                aPlus: 12,
                a: 30,
                failed: 10,
              },
            ],
          });
          break;

        case "defaulters":
          setReportData({
            summary: [
              { label: "Total Defaulters", value: 125 },
              { label: "1 Month Due", value: 65 },
              { label: "2+ Months Due", value: 40 },
              { label: "3+ Months Due", value: 20 },
            ],
            breakdown: [
              {
                name: "Ahmed Khan",
                class: "Class 5A",
                months: 2,
                amount: 12000,
              },
              { name: "Sara Ali", class: "Class 3B", months: 1, amount: 5500 },
              {
                name: "Usman Ahmed",
                class: "Class 7A",
                months: 3,
                amount: 21000,
              },
              {
                name: "Fatima Zahra",
                class: "Class 4A",
                months: 1,
                amount: 6000,
              },
              {
                name: "Hassan Malik",
                class: "Class 6B",
                months: 2,
                amount: 14000,
              },
              {
                name: "Ayesha Bibi",
                class: "Class 8A",
                months: 4,
                amount: 32000,
              },
            ],
          });
          break;
      }
    } catch (error) {
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [selectedReport, selectedMonth, selectedYear]);

  useEffect(() => {
    if (status === "authenticated") {
      generateReport();
    }
  }, [status, generateReport]);

  const handleExport = (format: "pdf" | "excel") => {
    toast.info(`Exporting to ${format.toUpperCase()}... (Coming soon)`);
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <Typography>Generating report...</Typography>
        </Box>
      );
    }

    if (!reportData) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <Typography color="text.secondary">
            Select a report type and generate
          </Typography>
        </Box>
      );
    }

    return (
      <>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {reportData.summary?.map((item: ReportData, index: number) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    {item.label}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Data Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {selectedReport === "fee_collection" && (
                  <>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Expected</TableCell>
                    <TableCell align="right">Collected</TableCell>
                    <TableCell align="right">Outstanding</TableCell>
                    <TableCell align="right">Rate</TableCell>
                  </>
                )}
                {selectedReport === "student_strength" && (
                  <>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Boys</TableCell>
                    <TableCell align="right">Girls</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </>
                )}
                {selectedReport === "attendance" && (
                  <>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Attendance %</TableCell>
                    <TableCell align="right">Present</TableCell>
                    <TableCell align="right">Absent</TableCell>
                  </>
                )}
                {selectedReport === "exam_results" && (
                  <>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Pass Rate</TableCell>
                    <TableCell align="right">A+</TableCell>
                    <TableCell align="right">A</TableCell>
                    <TableCell align="right">Failed</TableCell>
                  </>
                )}
                {selectedReport === "defaulters" && (
                  <>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Months Due</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.breakdown?.map((row: any, index: number) => (
                <TableRow key={index}>
                  {selectedReport === "fee_collection" && (
                    <>
                      <TableCell>{row.class}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.expected)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.collected)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.outstanding)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${Math.round(
                            (row.collected / row.expected) * 100
                          )}%`}
                          color={
                            row.collected / row.expected >= 0.9
                              ? "success"
                              : "warning"
                          }
                          size="small"
                        />
                      </TableCell>
                    </>
                  )}
                  {selectedReport === "student_strength" && (
                    <>
                      <TableCell>{row.class}</TableCell>
                      <TableCell align="right">{row.boys}</TableCell>
                      <TableCell align="right">{row.girls}</TableCell>
                      <TableCell align="right">{row.total}</TableCell>
                    </>
                  )}
                  {selectedReport === "attendance" && (
                    <>
                      <TableCell>{row.class}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={row.attendance}
                          color={
                            parseInt(row.attendance) >= 90
                              ? "success"
                              : "warning"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{row.present}</TableCell>
                      <TableCell align="right">{row.absent}</TableCell>
                    </>
                  )}
                  {selectedReport === "exam_results" && (
                    <>
                      <TableCell>{row.class}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={row.passRate}
                          color={
                            parseInt(row.passRate) >= 90 ? "success" : "warning"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{row.aPlus}</TableCell>
                      <TableCell align="right">{row.a}</TableCell>
                      <TableCell align="right">{row.failed}</TableCell>
                    </>
                  )}
                  {selectedReport === "defaulters" && (
                    <>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.class}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${row.months} month${
                            row.months > 1 ? "s" : ""
                          }`}
                          color={
                            row.months >= 3
                              ? "error"
                              : row.months >= 2
                              ? "warning"
                              : "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.amount)}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  };

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
            Reports
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport("excel")}
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => handleExport("pdf")}
            >
              Export PDF
            </Button>
          </Box>
        </Box>

        {/* Report Selection */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={selectedReport}
                  label="Report Type"
                  onChange={(e) => setSelectedReport(e.target.value)}
                >
                  {REPORT_TYPES.map((report) => (
                    <MenuItem key={report.id} value={report.id}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {report.icon}
                        {report.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Month</InputLabel>
                <Select
                  value={selectedMonth}
                  label="Month"
                  onChange={(e) => setSelectedMonth(e.target.value as number)}
                >
                  {MONTHS.map((month, idx) => (
                    <MenuItem key={idx} value={idx + 1}>
                      {month}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  label="Year"
                  onChange={(e) => setSelectedYear(e.target.value as number)}
                >
                  {[2023, 2024, 2025].map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={generateReport}
                disabled={loading}
              >
                Generate
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Report Content */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {REPORT_TYPES.find((r) => r.id === selectedReport)?.name} -{" "}
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </Typography>
          {renderReportContent()}
        </Paper>
      </Box>
    </MainLayout>
  );
}
