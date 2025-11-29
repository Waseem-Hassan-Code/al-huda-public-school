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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { debounce } from "@/lib/utils";
import { toast } from "sonner";

interface Student {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  class: { id: string; name: string };
  section?: { id: string; name: string };
}

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface Exam {
  id: string;
  name: string;
  examType: string;
  startDate: string;
  endDate: string;
  academicYear: string;
}

interface Result {
  id: string;
  marksObtained: number;
  totalMarks: number;
  grade?: string;
  remarks?: string;
  subject: Subject;
}

interface Class {
  id: string;
  name: string;
}

export default function ResultsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterExam, setFilterExam] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [resultFormData, setResultFormData] = useState<{
    examId: string;
    subjectId: string;
    studentId: string;
    marksObtained: number;
    totalMarks: number;
    grade: string;
    remarks: string;
  }>({
    examId: "",
    subjectId: "",
    studentId: "",
    marksObtained: 0,
    totalMarks: 100,
    grade: "",
    remarks: "",
  });

  const fetchStudents = useCallback(async (searchQuery = "", classId = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (classId) params.append("classId", classId);
      params.append("limit", "50");

      const response = await fetch(`/api/students?${params}`);
      const data = await response.json();
      if (response.ok) {
        setStudents(data.students || []);
      } else {
        toast.error(data.error || "Failed to fetch students");
      }
    } catch (error) {
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExams = useCallback(async () => {
    try {
      const response = await fetch("/api/exams?limit=50");
      const data = await response.json();
      if (response.ok) {
        setExams(data.exams || []);
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await fetch("/api/subjects?limit=100");
      const data = await response.json();
      if (response.ok) {
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch("/api/classes?limit=100");
      const data = await response.json();
      if (response.ok) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  }, []);

  const fetchStudentResults = useCallback(
    async (studentId: string, examId?: string) => {
      try {
        const params = new URLSearchParams();
        params.append("studentId", studentId);
        if (examId) params.append("examId", examId);

        const response = await fetch(`/api/results?${params}`);
        const data = await response.json();
        if (response.ok) {
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Failed to fetch results:", error);
      }
    },
    []
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchStudents();
      fetchExams();
      fetchSubjects();
      fetchClasses();
    }
  }, [status, fetchStudents, fetchExams, fetchSubjects, fetchClasses]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      fetchStudents(value, filterClass);
    }, 300),
    [fetchStudents, filterClass]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleClassFilterChange = (classId: string) => {
    setFilterClass(classId);
    fetchStudents(search, classId);
  };

  const handleViewResults = (student: Student) => {
    setSelectedStudent(student);
    fetchStudentResults(student.id, filterExam);
    setDialogOpen(true);
  };

  const handleOpenEntryDialog = (student: Student) => {
    setSelectedStudent(student);
    setResultFormData({
      ...resultFormData,
      studentId: student.id,
    });
    setEntryDialogOpen(true);
  };

  const calculateGrade = (marks: number, total: number): string => {
    const percentage = (marks / total) * 100;
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    return "F";
  };

  const handleSubmitResult = async () => {
    if (
      !resultFormData.examId ||
      !resultFormData.subjectId ||
      !resultFormData.studentId
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const grade = calculateGrade(
      resultFormData.marksObtained,
      resultFormData.totalMarks
    );

    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...resultFormData,
          grade,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Result saved successfully");
        setEntryDialogOpen(false);
        setResultFormData({
          examId: "",
          subjectId: "",
          studentId: "",
          marksObtained: 0,
          totalMarks: 100,
          grade: "",
          remarks: "",
        });
      } else {
        toast.error(data.error || "Failed to save result");
      }
    } catch (error) {
      toast.error("Failed to save result");
    }
  };

  const getGradeColor = (
    grade: string
  ): "success" | "info" | "warning" | "error" | "default" => {
    switch (grade) {
      case "A+":
      case "A":
        return "success";
      case "B":
        return "info";
      case "C":
        return "warning";
      case "D":
      case "F":
        return "error";
      default:
        return "default";
    }
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
            Results Management
          </Typography>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="View Results" />
            <Tab label="Enter Results" />
          </Tabs>
        </Paper>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder="Search students..."
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
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Filter by Class</InputLabel>
                <Select
                  value={filterClass}
                  label="Filter by Class"
                  onChange={(e) => handleClassFilterChange(e.target.value)}
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
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Filter by Exam</InputLabel>
                <Select
                  value={filterExam}
                  label="Filter by Exam"
                  onChange={(e) => setFilterExam(e.target.value)}
                >
                  <MenuItem value="">All Exams</MenuItem>
                  {exams.map((exam) => (
                    <MenuItem key={exam.id} value={exam.id}>
                      {exam.name} ({exam.examType})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 2 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <Typography>Loading...</Typography>
            </Box>
          ) : students.length === 0 ? (
            <Box display="flex" justifyContent="center" p={4}>
              <Typography color="text.secondary">No students found</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {students.map((student) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={student.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">
                        {student.firstName} {student.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {student.registrationNo}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {student.class?.name}
                        {student.section?.name && ` - ${student.section.name}`}
                      </Typography>
                      <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AssessmentIcon />}
                          onClick={() => handleViewResults(student)}
                        >
                          View Results
                        </Button>
                        {tabValue === 1 && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenEntryDialog(student)}
                          >
                            Enter Result
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>

        {/* View Results Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Results - {selectedStudent?.firstName} {selectedStudent?.lastName}
          </DialogTitle>
          <DialogContent>
            {results.length === 0 ? (
              <Box display="flex" justifyContent="center" p={4}>
                <Typography color="text.secondary">
                  No results found for this student
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Subject</TableCell>
                      <TableCell align="center">Marks</TableCell>
                      <TableCell align="center">Total</TableCell>
                      <TableCell align="center">Percentage</TableCell>
                      <TableCell align="center">Grade</TableCell>
                      <TableCell>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>{result.subject?.name}</TableCell>
                        <TableCell align="center">
                          {result.marksObtained}
                        </TableCell>
                        <TableCell align="center">
                          {result.totalMarks}
                        </TableCell>
                        <TableCell align="center">
                          {(
                            (result.marksObtained / result.totalMarks) *
                            100
                          ).toFixed(1)}
                          %
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={result.grade}
                            color={getGradeColor(result.grade || "")}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{result.remarks || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<PrintIcon />}
              onClick={() => toast.info("Print functionality coming soon")}
            >
              Print Report Card
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Enter Result Dialog */}
        <Dialog
          open={entryDialogOpen}
          onClose={() => setEntryDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Enter Result - {selectedStudent?.firstName}{" "}
            {selectedStudent?.lastName}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>Exam</InputLabel>
                  <Select
                    value={resultFormData.examId}
                    label="Exam"
                    onChange={(e) =>
                      setResultFormData({
                        ...resultFormData,
                        examId: e.target.value,
                      })
                    }
                  >
                    {exams.map((exam) => (
                      <MenuItem key={exam.id} value={exam.id}>
                        {exam.name} ({exam.examType})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    value={resultFormData.subjectId}
                    label="Subject"
                    onChange={(e) =>
                      setResultFormData({
                        ...resultFormData,
                        subjectId: e.target.value,
                      })
                    }
                  >
                    {subjects.map((subject) => (
                      <MenuItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Marks Obtained"
                  value={resultFormData.marksObtained}
                  onChange={(e) =>
                    setResultFormData({
                      ...resultFormData,
                      marksObtained: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Marks"
                  value={resultFormData.totalMarks}
                  onChange={(e) =>
                    setResultFormData({
                      ...resultFormData,
                      totalMarks: parseFloat(e.target.value) || 100,
                    })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Remarks"
                  value={resultFormData.remarks}
                  onChange={(e) =>
                    setResultFormData({
                      ...resultFormData,
                      remarks: e.target.value,
                    })
                  }
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  Grade will be calculated automatically based on marks: A+
                  (90%+), A (80-89%), B (70-79%), C (60-69%), D (50-59%), F
                  (below 50%)
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEntryDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmitResult}>
              Save Result
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
