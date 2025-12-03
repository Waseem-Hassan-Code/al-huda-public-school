"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Avatar,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  AccountBalance as AccountBalanceIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { formatDate } from "@/lib/utils";

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

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fatherName?: string;
  dateOfBirth?: string;
  gender: string;
  cnic: string;
  photo?: string;
  phone: string;
  phone2?: string;
  email?: string;
  address: string;
  city: string;
  province: string;
  qualification: string;
  specialization?: string;
  experience: number;
  joiningDate: string;
  designation: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  bankName?: string;
  bankAccountNo?: string;
  bankBranch?: string;
  status: string;
  statusReason?: string;
  remarks?: string;
  isActive: boolean;
  createdAt: string;
  subjects?: { subject: { id: string; name: string; code: string } }[];
  salaries?: {
    id: string;
    month: number;
    year: number;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    status: string;
    paidAt?: string;
  }[];
}

export default function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const fetchTeacher = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teachers/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch teacher");
      }
      const data = await response.json();
      setTeacher(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTeacher();
  }, [fetchTeacher]);

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

  if (error || !teacher) {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error || "Teacher not found"}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
            sx={{ mt: 2 }}
          >
            Go Back
          </Button>
        </Box>
      </MainLayout>
    );
  }

  const netSalary =
    teacher.basicSalary + teacher.allowances - teacher.deductions;

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
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()}>
              Back
            </Button>
            <Typography variant="h4" fontWeight="bold">
              Teacher Details
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => router.push(`/teachers?edit=${id}`)}
          >
            Edit Teacher
          </Button>
        </Box>

        {/* Profile Card */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Avatar
                  src={teacher.photo}
                  sx={{ width: 150, height: 150, mb: 2, fontSize: 48 }}
                >
                  {teacher.firstName[0]}
                  {teacher.lastName[0]}
                </Avatar>
                <Typography variant="h5" fontWeight="bold">
                  {teacher.firstName} {teacher.lastName}
                </Typography>
                <Typography color="text.secondary">
                  {teacher.employeeId}
                </Typography>
                <Chip
                  label={teacher.status}
                  color={teacher.status === "ACTIVE" ? "success" : "error"}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <WorkIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Designation
                      </Typography>
                      <Typography>{teacher.designation}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <PhoneIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography>{teacher.phone}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <EmailIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Email
                      </Typography>
                      <Typography>{teacher.email || "N/A"}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <PersonIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        CNIC
                      </Typography>
                      <Typography>{teacher.cnic}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <SchoolIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Qualification
                      </Typography>
                      <Typography>{teacher.qualification}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <HomeIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Address
                      </Typography>
                      <Typography>
                        {teacher.address}, {teacher.city}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Personal Details" />
            <Tab label="Salary Information" />
            <Tab label="Subjects" />
            <Tab label="Salary History" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Personal Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Father Name
                      </Typography>
                      <Typography>{teacher.fatherName || "N/A"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Date of Birth
                      </Typography>
                      <Typography>
                        {teacher.dateOfBirth
                          ? formatDate(teacher.dateOfBirth)
                          : "N/A"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Gender
                      </Typography>
                      <Typography>{teacher.gender}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Secondary Phone
                      </Typography>
                      <Typography>{teacher.phone2 || "N/A"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Province
                      </Typography>
                      <Typography>{teacher.province}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        City
                      </Typography>
                      <Typography>{teacher.city}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Professional Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Joining Date
                      </Typography>
                      <Typography>{formatDate(teacher.joiningDate)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Experience
                      </Typography>
                      <Typography>{teacher.experience} years</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Specialization
                      </Typography>
                      <Typography>{teacher.specialization || "N/A"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Remarks
                      </Typography>
                      <Typography>{teacher.remarks || "N/A"}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Salary Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Basic Salary
                      </Typography>
                      <Typography variant="h6">
                        Rs. {teacher.basicSalary.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Allowances
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        + Rs. {teacher.allowances.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Deductions
                      </Typography>
                      <Typography variant="h6" color="error.main">
                        - Rs. {teacher.deductions.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Net Salary
                      </Typography>
                      <Typography variant="h6" color="primary.main">
                        Rs. {netSalary.toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Bank Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Bank Name
                      </Typography>
                      <Typography>{teacher.bankName || "N/A"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Account Number
                      </Typography>
                      <Typography>{teacher.bankAccountNo || "N/A"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary">
                        Branch
                      </Typography>
                      <Typography>{teacher.bankBranch || "N/A"}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assigned Subjects
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {teacher.subjects && teacher.subjects.length > 0 ? (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {teacher.subjects.map((ts) => (
                    <Chip
                      key={ts.subject.id}
                      label={`${ts.subject.name} (${ts.subject.code})`}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">
                  No subjects assigned
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Salary History
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {teacher.salaries && teacher.salaries.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Month/Year</TableCell>
                        <TableCell align="right">Basic</TableCell>
                        <TableCell align="right">Allowances</TableCell>
                        <TableCell align="right">Deductions</TableCell>
                        <TableCell align="right">Net Salary</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Paid On</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teacher.salaries.map((salary) => (
                        <TableRow key={salary.id}>
                          <TableCell>{`${salary.month}/${salary.year}`}</TableCell>
                          <TableCell align="right">
                            Rs. {salary.basicSalary.toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            Rs. {salary.allowances.toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            Rs. {salary.deductions.toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            Rs. {salary.netSalary.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={salary.status}
                              color={
                                salary.status === "PAID" ? "success" : "warning"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {salary.paidAt ? formatDate(salary.paidAt) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">
                  No salary records found
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    </MainLayout>
  );
}
