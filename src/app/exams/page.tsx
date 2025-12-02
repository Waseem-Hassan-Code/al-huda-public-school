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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Close,
  Assignment,
  Refresh,
  Schedule,
  CalendarMonth,
} from "@mui/icons-material";
import {
  DatePicker,
  LocalizationProvider,
  TimePicker,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import MainLayout from "@/components/layout/MainLayout";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

// Interfaces
interface ClassData {
  id: string;
  name: string;
  grade: number;
  sections?: { id: string; name: string }[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

interface ExamSchedule {
  id: string;
  examId: string;
  subjectId: string;
  subject: Subject;
  examDate: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passingMarks: number;
  venue: string | null;
  invigilatorId: string | null;
  invigilator: Teacher | null;
  remarks: string | null;
}

interface Exam {
  id: string;
  name: string;
  examType: string;
  classId: string;
  sectionId: string | null;
  startDate: string | null;
  endDate: string | null;
  totalMarks: number;
  passingMarks: number;
  isPublished: boolean;
  remarks: string | null;
  class: { id: string; name: string };
  section: { id: string; name: string } | null;
  academicYear: { id: string; name: string };
  examSchedules?: ExamSchedule[];
  _count?: { studentMarks: number; examSchedules: number };
}

interface ExamFormData {
  name: string;
  examType: string;
  classId: string;
  sectionId: string;
  startDate: Date | null;
  endDate: Date | null;
  remarks: string;
}

interface ScheduleFormData {
  subjectId: string;
  examDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  totalMarks: number;
  passingMarks: number;
  venue: string;
  invigilatorId: string;
  remarks: string;
}

const EXAM_TYPES = [
  { value: "MONTHLY_TEST", label: "Monthly Test" },
  { value: "MID_TERM", label: "Mid Term" },
  { value: "FINAL_TERM", label: "Final Term" },
  { value: "WEEKLY_TEST", label: "Weekly Test" },
  { value: "SURPRISE_TEST", label: "Surprise Test" },
  { value: "PRACTICAL", label: "Practical" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "PROJECT", label: "Project" },
];

export default function ExamsPage() {
  // State
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [filterClassId, setFilterClassId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [viewScheduleDialogOpen, setViewScheduleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected items
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(
    null
  );
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  // Form data
  const [examFormData, setExamFormData] = useState<ExamFormData>({
    name: "",
    examType: "MONTHLY_TEST",
    classId: "",
    sectionId: "",
    startDate: null,
    endDate: null,
    remarks: "",
  });

  const [scheduleFormData, setScheduleFormData] = useState<ScheduleFormData>({
    subjectId: "",
    examDate: null,
    startTime: null,
    endTime: null,
    totalMarks: 100,
    passingMarks: 33,
    venue: "",
    invigilatorId: "",
    remarks: "",
  });

  // Get sections for selected class
  const sections =
    classes.find((c) => c.id === examFormData.classId)?.sections || [];

  // Fetch exams
  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClassId) params.append("classId", filterClassId);
      if (filterType) params.append("type", filterType);
      params.append("includeSchedules", "true");

      const response = await fetch(`/api/exams?${params}`);
      if (response.ok) {
        const data = await response.json();
        setExams(data.exams || []);
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
      toast.error("Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  }, [filterClassId, filterType]);

  // Fetch classes with sections
  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch("/api/classes?includeSection=true");
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || data.data || []);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  }, []);

  // Fetch subjects for a class
  const fetchSubjectsForClass = useCallback(async (classId: string) => {
    try {
      const response = await fetch(`/api/class-subjects?classId=${classId}`);
      if (response.ok) {
        const data = await response.json();
        const subjectData = (data.data || []).map((cs: any) => ({
          id: cs.subject?.id || cs.subjectId,
          name: cs.subject?.name || "Unknown",
          code: cs.subject?.code || "",
        }));
        setSubjects(subjectData);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  }, []);

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    try {
      const response = await fetch("/api/teachers?limit=100");
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  }, []);

  useEffect(() => {
    fetchExams();
    fetchClasses();
    fetchTeachers();
  }, [fetchExams, fetchClasses, fetchTeachers]);

  // Fetch subjects when class changes in exam form
  useEffect(() => {
    if (selectedExam?.classId) {
      fetchSubjectsForClass(selectedExam.classId);
    }
  }, [selectedExam?.classId, fetchSubjectsForClass]);

  // Filter exams by search
  const filteredExams = exams.filter((exam) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      exam.name.toLowerCase().includes(query) ||
      exam.class.name.toLowerCase().includes(query) ||
      exam.examType.toLowerCase().includes(query)
    );
  });

  // Open exam dialog for create/edit
  const openExamDialog = (exam?: Exam) => {
    if (exam) {
      setSelectedExam(exam);
      setExamFormData({
        name: exam.name,
        examType: exam.examType,
        classId: exam.classId,
        sectionId: exam.sectionId || "",
        startDate: exam.startDate ? new Date(exam.startDate) : null,
        endDate: exam.endDate ? new Date(exam.endDate) : null,
        remarks: exam.remarks || "",
      });
    } else {
      setSelectedExam(null);
      setExamFormData({
        name: "",
        examType: "MONTHLY_TEST",
        classId: "",
        sectionId: "",
        startDate: null,
        endDate: null,
        remarks: "",
      });
    }
    setExamDialogOpen(true);
  };

  // Save exam
  const handleSaveExam = async () => {
    if (!examFormData.name || !examFormData.classId) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const url = selectedExam ? `/api/exams/${selectedExam.id}` : "/api/exams";
      const method = selectedExam ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: examFormData.name,
          examType: examFormData.examType,
          classId: examFormData.classId,
          sectionId: examFormData.sectionId || null,
          startDate: examFormData.startDate?.toISOString() || null,
          endDate: examFormData.endDate?.toISOString() || null,
          remarks: examFormData.remarks || null,
        }),
      });

      if (response.ok) {
        toast.success(
          selectedExam
            ? "Exam updated successfully"
            : "Exam created successfully"
        );
        setExamDialogOpen(false);
        fetchExams();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save exam");
      }
    } catch (error) {
      console.error("Error saving exam:", error);
      toast.error("Failed to save exam");
    }
  };

  // Delete exam
  const handleDeleteExam = async () => {
    if (!examToDelete) return;

    try {
      const response = await fetch(`/api/exams/${examToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Exam deleted successfully");
        setDeleteDialogOpen(false);
        setExamToDelete(null);
        fetchExams();
      } else {
        toast.error("Failed to delete exam");
      }
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast.error("Failed to delete exam");
    }
  };

  // Open schedule dialog
  const openScheduleDialog = (exam: Exam, schedule?: ExamSchedule) => {
    setSelectedExam(exam);
    fetchSubjectsForClass(exam.classId);

    if (schedule) {
      setSelectedSchedule(schedule);
      setScheduleFormData({
        subjectId: schedule.subjectId,
        examDate: new Date(schedule.examDate),
        startTime: parseTimeToDate(schedule.startTime),
        endTime: parseTimeToDate(schedule.endTime),
        totalMarks: schedule.totalMarks,
        passingMarks: schedule.passingMarks,
        venue: schedule.venue || "",
        invigilatorId: schedule.invigilatorId || "",
        remarks: schedule.remarks || "",
      });
    } else {
      setSelectedSchedule(null);
      setScheduleFormData({
        subjectId: "",
        examDate: exam.startDate ? new Date(exam.startDate) : null,
        startTime: parseTimeToDate("09:00"),
        endTime: parseTimeToDate("12:00"),
        totalMarks: 100,
        passingMarks: 33,
        venue: "",
        invigilatorId: "",
        remarks: "",
      });
    }
    setScheduleDialogOpen(true);
  };

  // Parse time string to Date
  const parseTimeToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Format Date to time string
  const formatTimeString = (date: Date | null): string => {
    if (!date) return "";
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  // Save schedule
  const handleSaveSchedule = async () => {
    if (
      !selectedExam ||
      !scheduleFormData.subjectId ||
      !scheduleFormData.examDate
    ) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const url = selectedSchedule
        ? `/api/exam-schedules/${selectedSchedule.id}`
        : "/api/exam-schedules";
      const method = selectedSchedule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExam.id,
          subjectId: scheduleFormData.subjectId,
          examDate: scheduleFormData.examDate.toISOString(),
          startTime: formatTimeString(scheduleFormData.startTime),
          endTime: formatTimeString(scheduleFormData.endTime),
          totalMarks: scheduleFormData.totalMarks,
          passingMarks: scheduleFormData.passingMarks,
          venue: scheduleFormData.venue || null,
          invigilatorId: scheduleFormData.invigilatorId || null,
          remarks: scheduleFormData.remarks || null,
        }),
      });

      if (response.ok) {
        toast.success(selectedSchedule ? "Schedule updated" : "Schedule added");
        setScheduleDialogOpen(false);
        fetchExams();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save schedule");
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule");
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/exam-schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Schedule deleted");
        fetchExams();
        if (viewScheduleDialogOpen && selectedExam) {
          // Refresh selected exam
          const updatedExam = exams.find((e) => e.id === selectedExam.id);
          if (updatedExam) {
            setSelectedExam({
              ...updatedExam,
              examSchedules: updatedExam.examSchedules?.filter(
                (s) => s.id !== scheduleId
              ),
            });
          }
        }
      } else {
        toast.error("Failed to delete schedule");
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule");
    }
  };

  // View exam schedule
  const openViewScheduleDialog = (exam: Exam) => {
    setSelectedExam(exam);
    fetchSubjectsForClass(exam.classId);
    setViewScheduleDialogOpen(true);
  };

  // Get exam type label
  const getExamTypeLabel = (type: string) => {
    return (
      EXAM_TYPES.find((t) => t.value === type)?.label || type.replace(/_/g, " ")
    );
  };

  // Get exam type color
  const getExamTypeColor = (type: string) => {
    switch (type) {
      case "FINAL_TERM":
        return "error";
      case "MID_TERM":
        return "warning";
      case "MONTHLY_TEST":
        return "info";
      case "WEEKLY_TEST":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <MainLayout>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
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
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Exam Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create exams and manage exam timetables for each class
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => openExamDialog()}
              sx={{ borderRadius: 2 }}
            >
              Create Exam
            </Button>
          </Box>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search exams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Class</InputLabel>
                  <Select
                    value={filterClassId}
                    onChange={(e) => setFilterClassId(e.target.value)}
                    label="Filter by Class"
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
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Type</InputLabel>
                  <Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    label="Filter by Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {EXAM_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchExams}
                  fullWidth
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Exams List */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredExams.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
              <Assignment
                sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary">
                No exams found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create your first exam to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => openExamDialog()}
              >
                Create Exam
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredExams.map((exam) => (
                <Grid key={exam.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      transition: "all 0.2s",
                      "&:hover": {
                        boxShadow: 4,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <CardContent>
                      {/* Header */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 2,
                        }}
                      >
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            {exam.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {exam.class.name}
                            {exam.section
                              ? ` • ${exam.section.name}`
                              : " • All Sections"}
                          </Typography>
                        </Box>
                        <Chip
                          label={getExamTypeLabel(exam.examType)}
                          size="small"
                          color={getExamTypeColor(exam.examType) as any}
                        />
                      </Box>

                      {/* Info */}
                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Start Date
                          </Typography>
                          <Typography variant="body2">
                            {exam.startDate
                              ? formatDate(exam.startDate)
                              : "Not set"}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            End Date
                          </Typography>
                          <Typography variant="body2">
                            {exam.endDate
                              ? formatDate(exam.endDate)
                              : "Not set"}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Subjects Scheduled
                          </Typography>
                          <Typography variant="body2">
                            {exam._count?.examSchedules ||
                              exam.examSchedules?.length ||
                              0}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Status
                          </Typography>
                          <Box>
                            <Chip
                              label={exam.isPublished ? "Published" : "Draft"}
                              size="small"
                              color={exam.isPublished ? "success" : "default"}
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          </Box>
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 2 }} />

                      {/* Actions */}
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Schedule />}
                          onClick={() => openViewScheduleDialog(exam)}
                          sx={{ flex: 1 }}
                        >
                          Timetable
                        </Button>
                        <Tooltip title="Edit Exam">
                          <IconButton
                            size="small"
                            onClick={() => openExamDialog(exam)}
                            color="primary"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Exam">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setExamToDelete(exam);
                              setDeleteDialogOpen(true);
                            }}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Create/Edit Exam Dialog */}
          <Dialog
            open={examDialogOpen}
            onClose={() => setExamDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {selectedExam ? "Edit Exam" : "Create New Exam"}
              <IconButton
                onClick={() => setExamDialogOpen(false)}
                sx={{ position: "absolute", right: 8, top: 8 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Exam Name *"
                    value={examFormData.name}
                    onChange={(e) =>
                      setExamFormData({ ...examFormData, name: e.target.value })
                    }
                    placeholder="e.g., Monthly Test - December 2025"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Exam Type *</InputLabel>
                    <Select
                      value={examFormData.examType}
                      onChange={(e) =>
                        setExamFormData({
                          ...examFormData,
                          examType: e.target.value,
                        })
                      }
                      label="Exam Type *"
                    >
                      {EXAM_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Class *</InputLabel>
                    <Select
                      value={examFormData.classId}
                      onChange={(e) =>
                        setExamFormData({
                          ...examFormData,
                          classId: e.target.value,
                          sectionId: "",
                        })
                      }
                      label="Class *"
                    >
                      <MenuItem value="">Select Class</MenuItem>
                      {classes.map((cls) => (
                        <MenuItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth disabled={!examFormData.classId}>
                    <InputLabel>Section</InputLabel>
                    <Select
                      value={examFormData.sectionId}
                      onChange={(e) =>
                        setExamFormData({
                          ...examFormData,
                          sectionId: e.target.value,
                        })
                      }
                      label="Section"
                    >
                      <MenuItem value="">All Sections</MenuItem>
                      {sections.map((section) => (
                        <MenuItem key={section.id} value={section.id}>
                          {section.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DatePicker
                    label="Start Date"
                    value={examFormData.startDate}
                    onChange={(date) =>
                      setExamFormData({ ...examFormData, startDate: date })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DatePicker
                    label="End Date"
                    value={examFormData.endDate}
                    onChange={(date) =>
                      setExamFormData({ ...examFormData, endDate: date })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    value={examFormData.remarks}
                    onChange={(e) =>
                      setExamFormData({
                        ...examFormData,
                        remarks: e.target.value,
                      })
                    }
                    multiline
                    rows={2}
                    placeholder="Optional notes about this exam"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setExamDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleSaveExam}>
                {selectedExam ? "Update" : "Create"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* View/Manage Schedule Dialog */}
          <Dialog
            open={viewScheduleDialogOpen}
            onClose={() => setViewScheduleDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Schedule color="primary" />
                Exam Timetable - {selectedExam?.name}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {selectedExam?.class.name}
                {selectedExam?.section
                  ? ` • ${selectedExam.section.name}`
                  : " • All Sections"}
              </Typography>
              <IconButton
                onClick={() => setViewScheduleDialogOpen(false)}
                sx={{ position: "absolute", right: 8, top: 8 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {selectedExam?.examSchedules &&
              selectedExam.examSchedules.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Marks</TableCell>
                        <TableCell>Venue</TableCell>
                        <TableCell>Invigilator</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedExam.examSchedules
                        .sort(
                          (a, b) =>
                            new Date(a.examDate).getTime() -
                            new Date(b.examDate).getTime()
                        )
                        .map((schedule) => (
                          <TableRow key={schedule.id}>
                            <TableCell>
                              {formatDate(schedule.examDate)}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {schedule.subject.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {schedule.subject.code}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {schedule.startTime} - {schedule.endTime}
                            </TableCell>
                            <TableCell>
                              {schedule.totalMarks} (Pass:{" "}
                              {schedule.passingMarks})
                            </TableCell>
                            <TableCell>{schedule.venue || "-"}</TableCell>
                            <TableCell>
                              {schedule.invigilator
                                ? `${schedule.invigilator.firstName} ${schedule.invigilator.lastName}`
                                : "-"}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  openScheduleDialog(selectedExam, schedule)
                                }
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() =>
                                  handleDeleteSchedule(schedule.id)
                                }
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CalendarMonth
                    sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
                  />
                  <Typography color="text.secondary">
                    No subjects scheduled yet
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Add subject schedules to create the exam timetable
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewScheduleDialogOpen(false)}>
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => selectedExam && openScheduleDialog(selectedExam)}
              >
                Add Subject
              </Button>
            </DialogActions>
          </Dialog>

          {/* Add/Edit Schedule Dialog */}
          <Dialog
            open={scheduleDialogOpen}
            onClose={() => setScheduleDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {selectedSchedule
                ? "Edit Subject Schedule"
                : "Add Subject Schedule"}
              <IconButton
                onClick={() => setScheduleDialogOpen(false)}
                sx={{ position: "absolute", right: 8, top: 8 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Subject *</InputLabel>
                    <Select
                      value={scheduleFormData.subjectId}
                      onChange={(e) =>
                        setScheduleFormData({
                          ...scheduleFormData,
                          subjectId: e.target.value,
                        })
                      }
                      label="Subject *"
                    >
                      <MenuItem value="">Select Subject</MenuItem>
                      {subjects.map((subject) => (
                        <MenuItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <DatePicker
                    label="Exam Date *"
                    value={scheduleFormData.examDate}
                    onChange={(date) =>
                      setScheduleFormData({
                        ...scheduleFormData,
                        examDate: date,
                      })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TimePicker
                    label="Start Time *"
                    value={scheduleFormData.startTime}
                    onChange={(time) =>
                      setScheduleFormData({
                        ...scheduleFormData,
                        startTime: time,
                      })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TimePicker
                    label="End Time *"
                    value={scheduleFormData.endTime}
                    onChange={(time) =>
                      setScheduleFormData({
                        ...scheduleFormData,
                        endTime: time,
                      })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Total Marks"
                    value={scheduleFormData.totalMarks}
                    onChange={(e) =>
                      setScheduleFormData({
                        ...scheduleFormData,
                        totalMarks: Number(e.target.value),
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Passing Marks"
                    value={scheduleFormData.passingMarks}
                    onChange={(e) =>
                      setScheduleFormData({
                        ...scheduleFormData,
                        passingMarks: Number(e.target.value),
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Venue / Room"
                    value={scheduleFormData.venue}
                    onChange={(e) =>
                      setScheduleFormData({
                        ...scheduleFormData,
                        venue: e.target.value,
                      })
                    }
                    placeholder="e.g., Room 101, Hall A"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Invigilator</InputLabel>
                    <Select
                      value={scheduleFormData.invigilatorId}
                      onChange={(e) =>
                        setScheduleFormData({
                          ...scheduleFormData,
                          invigilatorId: e.target.value,
                        })
                      }
                      label="Invigilator"
                    >
                      <MenuItem value="">Select Invigilator</MenuItem>
                      {teachers.map((teacher) => (
                        <MenuItem key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    value={scheduleFormData.remarks}
                    onChange={(e) =>
                      setScheduleFormData({
                        ...scheduleFormData,
                        remarks: e.target.value,
                      })
                    }
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveSchedule}>
                {selectedSchedule ? "Update" : "Add"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
          >
            <DialogTitle>Delete Exam</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete &quot;{examToDelete?.name}
                &quot;? This will also delete all associated schedules and
                marks.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteExam}
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </LocalizationProvider>
    </MainLayout>
  );
}
