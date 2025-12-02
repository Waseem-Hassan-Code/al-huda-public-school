"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Avatar,
  LinearProgress,
} from "@mui/material";
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  MenuBook as SubjectIcon,
  Assessment as AssessmentIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";

interface Class {
  id: string;
  name: string;
  sections: Section[];
}

interface Section {
  id: string;
  name: string;
  classId: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  isOptional: boolean;
}

interface Exam {
  id: string;
  name: string;
  type: string;
  totalMarks: number;
  passingMarks: number;
}

interface StudentMark {
  studentId: string;
  registrationNo: string;
  rollNumber: string;
  studentName: string;
  obtainedMarks: number | null;
  status: "absent" | "present" | "exempt";
  remarks: string;
  isDirty: boolean;
}

export default function BulkMarksEntryPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch("/api/classes");
        if (response.ok) {
          const data = await response.json();
          setClasses(data.data || []);
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch subjects when class/section changes
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedClassId) {
        setSubjects([]);
        return;
      }

      try {
        const params = new URLSearchParams({ classId: selectedClassId });
        if (selectedSectionId) params.append("sectionId", selectedSectionId);

        const response = await fetch(`/api/class-subjects?${params}`);
        if (response.ok) {
          const data = await response.json();
          const subjectData = (data.data || []).map((cs: any) => ({
            id: cs.subject?.id || cs.subjectId,
            name: cs.subject?.name || "Unknown",
            code: cs.subject?.code || "",
            isOptional: cs.isOptional || false,
          }));
          setSubjects(subjectData);
        }
      } catch (err) {
        console.error("Error fetching subjects:", err);
      }
    };
    fetchSubjects();
  }, [selectedClassId, selectedSectionId]);

  // Fetch exams when class changes
  useEffect(() => {
    const fetchExams = async () => {
      if (!selectedClassId) {
        setExams([]);
        return;
      }

      try {
        const params = new URLSearchParams({ classId: selectedClassId });
        if (selectedSectionId) params.append("sectionId", selectedSectionId);

        const response = await fetch(`/api/result-cards?${params}`);
        if (response.ok) {
          const data = await response.json();
          // Transform result cards to exams
          const examData = (data.data || []).map((rc: any) => ({
            id: rc.examId,
            name: rc.examName,
            type: rc.examType,
            totalMarks: 100,
            passingMarks: 33,
          }));
          setExams(examData);
        }
      } catch (err) {
        console.error("Error fetching exams:", err);
      }
    };
    fetchExams();
  }, [selectedClassId, selectedSectionId]);

  // Fetch students with marks when all selections are made
  const fetchStudents = useCallback(async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedExamId) {
      setStudents([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        examId: selectedExamId,
      });
      if (selectedSectionId) params.append("sectionId", selectedSectionId);

      const response = await fetch(`/api/bulk-marks?${params}`);
      if (response.ok) {
        const data = await response.json();
        const studentData = (data.data || []).map((s: any) => ({
          ...s,
          isDirty: false,
        }));
        setStudents(studentData);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSectionId, selectedSubjectId, selectedExamId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const handleMarksChange = (studentId: string, value: string) => {
    const numValue = value === "" ? null : Number(value);
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              obtainedMarks: numValue,
              isDirty: true,
              status: numValue !== null ? "present" : s.status,
            }
          : s
      )
    );
  };

  const handleStatusChange = (
    studentId: string,
    status: "absent" | "present" | "exempt"
  ) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              status,
              obtainedMarks: status === "absent" ? null : s.obtainedMarks,
              isDirty: true,
            }
          : s
      )
    );
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === studentId ? { ...s, remarks, isDirty: true } : s
      )
    );
  };

  const handleSaveAll = async () => {
    const dirtyStudents = students.filter((s) => s.isDirty);
    if (dirtyStudents.length === 0) {
      setError("No changes to save");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/bulk-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExamId,
          subjectId: selectedSubjectId,
          marks: dirtyStudents.map((s) => ({
            studentId: s.studentId,
            obtainedMarks: s.obtainedMarks,
            status: s.status,
            remarks: s.remarks,
          })),
        }),
      });

      if (response.ok) {
        setSuccess(
          `Successfully saved marks for ${dirtyStudents.length} student(s)`
        );
        // Mark all as clean
        setStudents((prev) => prev.map((s) => ({ ...s, isDirty: false })));
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to save marks");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  const handleFillAll = (marks: number) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.status !== "absent" && s.status !== "exempt"
          ? { ...s, obtainedMarks: marks, status: "present", isDirty: true }
          : s
      )
    );
  };

  const handleClearAll = () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        obtainedMarks: null,
        status: "present",
        isDirty: true,
      }))
    );
  };

  const dirtyCount = students.filter((s) => s.isDirty).length;
  const completedCount = students.filter(
    (s) => s.obtainedMarks !== null || s.status === "absent"
  ).length;
  const averageMarks =
    students.filter((s) => s.obtainedMarks !== null).length > 0
      ? Math.round(
          students
            .filter((s) => s.obtainedMarks !== null)
            .reduce((sum, s) => sum + (s.obtainedMarks || 0), 0) /
            students.filter((s) => s.obtainedMarks !== null).length
        )
      : 0;

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{
              background: "linear-gradient(45deg, #1a237e, #283593)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 1,
            }}
          >
            Bulk Marks Entry
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter marks for all students in a class at once
          </Typography>
        </Box>

        {/* Filters */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Class</InputLabel>
                <Select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId("");
                    setSelectedSubjectId("");
                    setSelectedExamId("");
                  }}
                  label="Select Class"
                >
                  <MenuItem value="">-- Select Class --</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small" disabled={!selectedClassId}>
                <InputLabel>Section (Optional)</InputLabel>
                <Select
                  value={selectedSectionId}
                  onChange={(e) => {
                    setSelectedSectionId(e.target.value);
                    setSelectedSubjectId("");
                  }}
                  label="Section (Optional)"
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

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small" disabled={!selectedClassId}>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  label="Subject"
                >
                  <MenuItem value="">-- Select Subject --</MenuItem>
                  {subjects.map((subject) => (
                    <MenuItem key={subject.id} value={subject.id}>
                      {subject.name} {subject.isOptional && "(Optional)"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small" disabled={!selectedSubjectId}>
                <InputLabel>Exam</InputLabel>
                <Select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  label="Exam"
                >
                  <MenuItem value="">-- Select Exam --</MenuItem>
                  {exams.map((exam) => (
                    <MenuItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Info Cards */}
        {selectedSubjectId && selectedExamId && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card
                sx={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <PersonIcon sx={{ opacity: 0.8 }} />
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Total Students
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {students.length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <Card
                sx={{
                  background:
                    "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                  color: "white",
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <CheckCircleIcon sx={{ opacity: 0.8 }} />
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Completed
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {completedCount}/{students.length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <Card
                sx={{
                  background:
                    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  color: "white",
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <AssessmentIcon sx={{ opacity: 0.8 }} />
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Average Marks
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {averageMarks}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 6, md: 3 }}>
              <Card
                sx={{
                  background:
                    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  color: "white",
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <EditIcon sx={{ opacity: 0.8 }} />
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Unsaved Changes
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {dirtyCount}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Marks Entry Table */}
        <Paper
          elevation={0}
          sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Student Marks
              </Typography>
              {selectedSubject && (
                <Chip
                  icon={<SubjectIcon />}
                  label={selectedSubject.name}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {selectedExam && (
                <Chip
                  icon={<AssessmentIcon />}
                  label={selectedExam.name}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Tooltip title="Fill all with full marks">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleFillAll(selectedExam?.totalMarks || 100)}
                  disabled={students.length === 0}
                >
                  Fill Max
                </Button>
              </Tooltip>
              <Tooltip title="Clear all marks">
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={handleClearAll}
                  disabled={students.length === 0}
                  startIcon={<ClearIcon />}
                >
                  Clear
                </Button>
              </Tooltip>
              <IconButton onClick={fetchStudents} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <SchoolIcon
                sx={{ fontSize: 60, color: "text.disabled", mb: 2 }}
              />
              <Typography color="text.secondary">
                {!selectedClassId
                  ? "Select a class, subject, and exam to enter marks."
                  : !selectedSubjectId
                  ? "Select a subject to continue."
                  : !selectedExamId
                  ? "Select an exam to load students."
                  : "No students found for the selected criteria."}
              </Typography>
            </Box>
          ) : (
            <>
              {saving && <LinearProgress />}
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "rgba(26, 35, 126, 0.05)",
                          minWidth: 60,
                        }}
                      >
                        #
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "rgba(26, 35, 126, 0.05)",
                          minWidth: 120,
                        }}
                      >
                        Roll No
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "rgba(26, 35, 126, 0.05)",
                          minWidth: 200,
                        }}
                      >
                        Student Name
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "rgba(26, 35, 126, 0.05)",
                          minWidth: 150,
                        }}
                      >
                        Registration No
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "rgba(26, 35, 126, 0.05)",
                          minWidth: 120,
                        }}
                      >
                        Marks (/{selectedExam?.totalMarks || 100})
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "rgba(26, 35, 126, 0.05)",
                          minWidth: 120,
                        }}
                      >
                        Status
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: "bold",
                          backgroundColor: "rgba(26, 35, 126, 0.05)",
                          minWidth: 150,
                        }}
                      >
                        Remarks
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student, index) => (
                      <TableRow
                        key={student.studentId}
                        hover
                        sx={{
                          backgroundColor: student.isDirty
                            ? "rgba(255, 193, 7, 0.1)"
                            : "inherit",
                          "&:hover": {
                            backgroundColor: student.isDirty
                              ? "rgba(255, 193, 7, 0.15)"
                              : undefined,
                          },
                        }}
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {student.rollNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: "#1a237e",
                                fontSize: "0.75rem",
                              }}
                            >
                              {student.studentName.charAt(0)}
                            </Avatar>
                            <Typography>{student.studentName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {student.registrationNo}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={student.obtainedMarks ?? ""}
                            onChange={(e) =>
                              handleMarksChange(
                                student.studentId,
                                e.target.value
                              )
                            }
                            disabled={
                              student.status === "absent" ||
                              student.status === "exempt"
                            }
                            inputProps={{
                              min: 0,
                              max: selectedExam?.totalMarks || 100,
                              style: { width: 60, textAlign: "center" },
                            }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                backgroundColor:
                                  student.obtainedMarks !== null &&
                                  student.obtainedMarks <
                                    (selectedExam?.passingMarks || 33)
                                    ? "rgba(244, 67, 54, 0.1)"
                                    : student.obtainedMarks !== null
                                    ? "rgba(76, 175, 80, 0.1)"
                                    : "inherit",
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                              value={student.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  student.studentId,
                                  e.target.value as any
                                )
                              }
                              size="small"
                            >
                              <MenuItem value="present">Present</MenuItem>
                              <MenuItem value="absent">Absent</MenuItem>
                              <MenuItem value="exempt">Exempt</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={student.remarks}
                            onChange={(e) =>
                              handleRemarksChange(
                                student.studentId,
                                e.target.value
                              )
                            }
                            placeholder="Add remarks..."
                            inputProps={{ style: { fontSize: "0.875rem" } }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {students.length > 0 && (
            <Box
              sx={{
                p: 2,
                borderTop: "1px solid",
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {dirtyCount > 0 && (
                  <Chip
                    label={`${dirtyCount} unsaved change(s)`}
                    size="small"
                    color="warning"
                    sx={{ mr: 1 }}
                  />
                )}
                Total: {students.length} students | Completed: {completedCount}
              </Typography>
              <Button
                variant="contained"
                startIcon={
                  saving ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                disabled={saving || dirtyCount === 0}
                onClick={handleSaveAll}
                sx={{
                  background: "linear-gradient(45deg, #1a237e, #283593)",
                  "&:hover": {
                    background: "linear-gradient(45deg, #0d1642, #1a237e)",
                  },
                }}
              >
                {saving ? "Saving..." : `Save All (${dirtyCount})`}
              </Button>
            </Box>
          )}
        </Paper>

        {/* Snackbars */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
}
