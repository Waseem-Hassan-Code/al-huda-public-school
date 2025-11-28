"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  CircularProgress,
  Tooltip,
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
  Add,
  Edit,
  Delete,
  Search,
  Close,
  Assignment,
  Grade,
  FilterList,
  Refresh,
  Visibility,
  PlayArrow,
  Stop,
} from "@mui/icons-material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import MainLayout from "@/components/layout/MainLayout";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface ClassData {
  id: string;
  name: string;
  grade: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Exam {
  id: string;
  name: string;
  examType: string;
  classId: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passingMarks: number;
  status: string;
  class: { id: string; name: string };
  subject: { id: string; name: string; code: string };
  academicYear: { id: string; name: string };
  _count?: { results: number };
}

interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  marksObtained: number;
  grade: string | null;
  remarks: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    rollNumber: string;
    section: { name: string };
  };
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [saving, setSaving] = useState(false);

  const [examFormData, setExamFormData] = useState({
    name: "",
    examType: "MONTHLY",
    classId: "",
    subjectId: "",
    date: new Date(),
    startTime: "09:00",
    endTime: "12:00",
    totalMarks: 100,
    passingMarks: 33,
  });

  const [resultsFormData, setResultsFormData] = useState<
    { studentId: string; marksObtained: number; remarks: string }[]
  >([]);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(classFilter && { classId: classFilter }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`/api/exams?${params}`);
      const data = await res.json();

      if (res.ok) {
        setExams(data.exams || []);
      } else {
        toast.error(data.error || "Failed to fetch exams");
      }
    } catch (error) {
      toast.error("Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  }, [classFilter, statusFilter]);

  const fetchClassesAndSubjects = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/subjects"),
      ]);

      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes || []);
      }

      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes/subjects", error);
    }
  };

  const fetchResults = async (examId: string) => {
    try {
      const res = await fetch(`/api/results?examId=${examId}`);
      const data = await res.json();

      if (res.ok) {
        setResults(data.results || []);
        return data.results || [];
      }
    } catch (error) {
      console.error("Failed to fetch results", error);
    }
    return [];
  };

  const fetchStudentsForExam = async (exam: Exam) => {
    try {
      const res = await fetch(
        `/api/students?classId=${exam.classId}&status=active&limit=100`
      );
      const data = await res.json();

      if (res.ok) {
        const existingResults = await fetchResults(exam.id);
        const existingMap = new Map(
          existingResults.map((r: ExamResult) => [r.studentId, r])
        );

        const formData = (data.students || []).map(
          (student: { id: string }) => {
            const existing = existingMap.get(student.id) as
              | ExamResult
              | undefined;
            return {
              studentId: student.id,
              marksObtained: existing?.marksObtained || 0,
              remarks: existing?.remarks || "",
            };
          }
        );

        setResultsFormData(formData);

        // Set results for display
        const resultsData = (data.students || []).map(
          (student: {
            id: string;
            firstName: string;
            lastName: string;
            rollNumber: string;
            section: { name: string };
          }) => {
            const existing = existingMap.get(student.id) as
              | ExamResult
              | undefined;
            return {
              id: existing?.id || "",
              examId: exam.id,
              studentId: student.id,
              marksObtained: existing?.marksObtained || 0,
              grade: existing?.grade || null,
              remarks: existing?.remarks || null,
              student: {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                rollNumber: student.rollNumber,
                section: student.section,
              },
            };
          }
        );

        setResults(resultsData);
      }
    } catch (error) {
      console.error("Failed to fetch students", error);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    fetchClassesAndSubjects();
  }, []);

  const handleOpenExamDialog = (exam?: Exam) => {
    if (exam) {
      setSelectedExam(exam);
      setExamFormData({
        name: exam.name,
        examType: exam.examType,
        classId: exam.classId,
        subjectId: exam.subjectId,
        date: new Date(exam.date),
        startTime: exam.startTime || "09:00",
        endTime: exam.endTime || "12:00",
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
      });
    } else {
      setSelectedExam(null);
      setExamFormData({
        name: "",
        examType: "MONTHLY",
        classId: "",
        subjectId: "",
        date: new Date(),
        startTime: "09:00",
        endTime: "12:00",
        totalMarks: 100,
        passingMarks: 33,
      });
    }
    setExamDialogOpen(true);
  };

  const handleSaveExam = async () => {
    if (
      !examFormData.name ||
      !examFormData.classId ||
      !examFormData.subjectId
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = selectedExam
        ? `/api/exams?id=${selectedExam.id}`
        : "/api/exams";
      const method = selectedExam ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...examFormData,
          date: examFormData.date.toISOString(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          selectedExam
            ? "Exam updated successfully"
            : "Exam created successfully"
        );
        setExamDialogOpen(false);
        setSelectedExam(null);
        fetchExams();
      } else {
        toast.error(data.error || "Failed to save exam");
      }
    } catch (error) {
      toast.error("Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenResultsDialog = async (exam: Exam) => {
    setSelectedExam(exam);
    await fetchStudentsForExam(exam);
    setResultsDialogOpen(true);
  };

  const handleSaveResults = async () => {
    if (!selectedExam) return;

    setSaving(true);
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExam.id,
          results: resultsFormData,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Results saved successfully");
        setResultsDialogOpen(false);
        fetchExams();
      } else {
        toast.error(data.error || "Failed to save results");
      }
    } catch (error) {
      toast.error("Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExamStatus = async (exam: Exam, status: string) => {
    try {
      const res = await fetch(`/api/exams?id=${exam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success(`Exam status updated to ${status}`);
        fetchExams();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!selectedExam) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/exams?id=${selectedExam.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Exam deleted successfully");
        setDeleteDialogOpen(false);
        setSelectedExam(null);
        fetchExams();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete exam");
      }
    } catch (error) {
      toast.error("Failed to delete exam");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "info";
      case "IN_PROGRESS":
        return "warning";
      case "COMPLETED":
        return "success";
      case "CANCELLED":
        return "error";
      default:
        return "default";
    }
  };

  const filteredExams = exams.filter((exam) => {
    if (!search) return true;
    return (
      exam.name.toLowerCase().includes(search.toLowerCase()) ||
      exam.class.name.toLowerCase().includes(search.toLowerCase()) ||
      exam.subject.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const upcomingExams = filteredExams.filter(
    (e) => e.status === "SCHEDULED" && new Date(e.date) >= new Date()
  );
  const completedExams = filteredExams.filter((e) => e.status === "COMPLETED");
  const allExams = filteredExams;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
              Exams & Results
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenExamDialog()}
            >
              Create Exam
            </Button>
          </Box>

          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ mb: 3 }}
          >
            <Tab icon={<Assignment />} label={`All (${allExams.length})`} />
            <Tab
              icon={<PlayArrow />}
              label={`Upcoming (${upcomingExams.length})`}
            />
            <Tab
              icon={<Grade />}
              label={`Completed (${completedExams.length})`}
            />
          </Tabs>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search exams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={classFilter}
                    label="Class"
                    onChange={(e) => setClassFilter(e.target.value)}
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
              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                    <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                    <MenuItem value="COMPLETED">Completed</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => {
                      setSearch("");
                      setClassFilter("");
                      setStatusFilter("");
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchExams}
                  >
                    Refresh
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {(activeTab === 0
                ? allExams
                : activeTab === 1
                ? upcomingExams
                : completedExams
              ).length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      No exams found
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                (activeTab === 0
                  ? allExams
                  : activeTab === 1
                  ? upcomingExams
                  : completedExams
                ).map((exam) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={exam.id}>
                    <Card>
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 2,
                          }}
                        >
                          <Box>
                            <Typography variant="h6">{exam.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {exam.class.name} • {exam.subject.name}
                            </Typography>
                          </Box>
                          <Chip
                            label={exam.status.replace("_", " ")}
                            size="small"
                            color={
                              getStatusColor(exam.status) as
                                | "info"
                                | "warning"
                                | "success"
                                | "error"
                                | "default"
                            }
                          />
                        </Box>

                        <Grid container spacing={1} sx={{ mb: 2 }}>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Date
                            </Typography>
                            <Typography variant="body2">
                              {formatDate(exam.date)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Time
                            </Typography>
                            <Typography variant="body2">
                              {exam.startTime} - {exam.endTime}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Total Marks
                            </Typography>
                            <Typography variant="body2">
                              {exam.totalMarks}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Passing Marks
                            </Typography>
                            <Typography variant="body2">
                              {exam.passingMarks}
                            </Typography>
                          </Grid>
                          {exam._count && (
                            <Grid size={{ xs: 12 }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Results Entered
                              </Typography>
                              <Typography variant="body2">
                                {exam._count.results} students
                              </Typography>
                            </Grid>
                          )}
                        </Grid>

                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {exam.status === "SCHEDULED" && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PlayArrow />}
                              onClick={() =>
                                handleUpdateExamStatus(exam, "IN_PROGRESS")
                              }
                            >
                              Start
                            </Button>
                          )}
                          {exam.status === "IN_PROGRESS" && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Stop />}
                              onClick={() =>
                                handleUpdateExamStatus(exam, "COMPLETED")
                              }
                            >
                              Complete
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Grade />}
                            onClick={() => handleOpenResultsDialog(exam)}
                          >
                            Results
                          </Button>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenExamDialog(exam)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedExam(exam);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {/* Exam Dialog */}
          <Dialog
            open={examDialogOpen}
            onClose={() => setExamDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                {selectedExam ? "Edit Exam" : "Create New Exam"}
                <IconButton onClick={() => setExamDialogOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Exam Name"
                    value={examFormData.name}
                    onChange={(e) =>
                      setExamFormData({ ...examFormData, name: e.target.value })
                    }
                    required
                    placeholder="e.g., Monthly Test - March"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Exam Type</InputLabel>
                    <Select
                      value={examFormData.examType}
                      label="Exam Type"
                      onChange={(e) =>
                        setExamFormData({
                          ...examFormData,
                          examType: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="MONTHLY">Monthly Test</MenuItem>
                      <MenuItem value="MID_TERM">Mid Term</MenuItem>
                      <MenuItem value="FINAL">Final Exam</MenuItem>
                      <MenuItem value="UNIT_TEST">Unit Test</MenuItem>
                      <MenuItem value="PRACTICE">Practice Test</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Class</InputLabel>
                    <Select
                      value={examFormData.classId}
                      label="Class"
                      onChange={(e) =>
                        setExamFormData({
                          ...examFormData,
                          classId: e.target.value,
                        })
                      }
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
                  <FormControl fullWidth required>
                    <InputLabel>Subject</InputLabel>
                    <Select
                      value={examFormData.subjectId}
                      label="Subject"
                      onChange={(e) =>
                        setExamFormData({
                          ...examFormData,
                          subjectId: e.target.value,
                        })
                      }
                    >
                      {subjects.map((subject) => (
                        <MenuItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Exam Date"
                    value={examFormData.date}
                    onChange={(date) =>
                      setExamFormData({
                        ...examFormData,
                        date: date || new Date(),
                      })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="time"
                    value={examFormData.startTime}
                    onChange={(e) =>
                      setExamFormData({
                        ...examFormData,
                        startTime: e.target.value,
                      })
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="End Time"
                    type="time"
                    value={examFormData.endTime}
                    onChange={(e) =>
                      setExamFormData({
                        ...examFormData,
                        endTime: e.target.value,
                      })
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Total Marks"
                    type="number"
                    value={examFormData.totalMarks}
                    onChange={(e) =>
                      setExamFormData({
                        ...examFormData,
                        totalMarks: parseInt(e.target.value) || 100,
                      })
                    }
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Passing Marks"
                    type="number"
                    value={examFormData.passingMarks}
                    onChange={(e) =>
                      setExamFormData({
                        ...examFormData,
                        passingMarks: parseInt(e.target.value) || 33,
                      })
                    }
                    inputProps={{ min: 1 }}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setExamDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSaveExam}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : "Save"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Results Dialog */}
          <Dialog
            open={resultsDialogOpen}
            onClose={() => setResultsDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                Enter Results - {selectedExam?.name}
                <IconButton onClick={() => setResultsDialogOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
              {selectedExam && (
                <Typography variant="body2" color="text.secondary">
                  {selectedExam.class.name} • {selectedExam.subject.name} •
                  Total: {selectedExam.totalMarks}, Passing:{" "}
                  {selectedExam.passingMarks}
                </Typography>
              )}
            </DialogTitle>
            <DialogContent dividers>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Roll No.</TableCell>
                      <TableCell>Student Name</TableCell>
                      <TableCell>Section</TableCell>
                      <TableCell sx={{ width: 120 }}>Marks</TableCell>
                      <TableCell sx={{ width: 200 }}>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={result.studentId}>
                        <TableCell>{result.student.rollNumber}</TableCell>
                        <TableCell>
                          {result.student.firstName} {result.student.lastName}
                        </TableCell>
                        <TableCell>{result.student.section?.name}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={resultsFormData[index]?.marksObtained || 0}
                            onChange={(e) => {
                              const newData = [...resultsFormData];
                              newData[index] = {
                                ...newData[index],
                                marksObtained: parseFloat(e.target.value) || 0,
                              };
                              setResultsFormData(newData);
                            }}
                            inputProps={{
                              min: 0,
                              max: selectedExam?.totalMarks || 100,
                              style: { width: 70 },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={resultsFormData[index]?.remarks || ""}
                            onChange={(e) => {
                              const newData = [...resultsFormData];
                              newData[index] = {
                                ...newData[index],
                                remarks: e.target.value,
                              };
                              setResultsFormData(newData);
                            }}
                            placeholder="Optional"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setResultsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveResults}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : "Save Results"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
          >
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete exam{" "}
                <strong>{selectedExam?.name}</strong>? This will also delete all
                associated results. This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : "Delete"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </MainLayout>
    </LocalizationProvider>
  );
}
