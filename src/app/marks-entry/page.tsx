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
  Fade,
  Badge,
  Divider,
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
  Class as ClassIcon,
  Groups as GroupsIcon,
  AutoAwesome as AutoAwesomeIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";

interface ClassData {
  id: string;
  name: string;
  sections: SectionData[];
}

interface SectionData {
  id: string;
  name: string;
  classId: string;
}

interface SubjectData {
  id: string;
  name: string;
  code: string;
  isOptional: boolean;
  totalMarks?: number;
}

interface ExamData {
  id: string;
  name: string;
  examType: string;
  totalMarks: number;
  passingMarks: number;
  isPublished: boolean;
  classId?: string;
  sectionId?: string;
}

interface StudentMarkData {
  studentId: string;
  registrationNo: string;
  rollNumber: string;
  studentName: string;
  photo?: string;
  totalMarks: number;
  marksObtained: number | null;
  isAbsent: boolean;
  remarks: string;
  isDirty: boolean;
}

export default function MarksEntryPage() {
  // Data states
  const [exams, setExams] = useState<ExamData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [students, setStudents] = useState<StudentMarkData[]>([]);

  // Selection states
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Loading states
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // UI states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Derived state
  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const subjectTotalMarks =
    selectedSubject?.totalMarks || selectedExam?.totalMarks || 100;

  // Step 1: Fetch all exams on load
  useEffect(() => {
    const fetchExams = async () => {
      setLoadingExams(true);
      try {
        const response = await fetch("/api/exams?all=true");
        if (response.ok) {
          const data = await response.json();
          const examList = data.exams || data.data || [];
          setExams(
            examList.map((exam: any) => ({
              id: exam.id,
              name: exam.name,
              examType: exam.examType || exam.type || "UNIT_TEST",
              totalMarks: exam.totalMarks || 100,
              passingMarks: exam.passingMarks || 33,
              isPublished: exam.isPublished || false,
              classId: exam.classId,
              sectionId: exam.sectionId,
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching exams:", err);
        setError("Failed to load exams");
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, []);

  // Step 2: Fetch classes when exam is selected
  useEffect(() => {
    if (!selectedExamId) {
      setClasses([]);
      return;
    }

    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const response = await fetch("/api/classes?includeSection=true");
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || data.data || []);
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
        setError("Failed to load classes");
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [selectedExamId]);

  // Step 3: Fetch subjects when class is selected (subjects assigned to that class)
  useEffect(() => {
    if (!selectedClassId) {
      setSubjects([]);
      return;
    }

    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const params = new URLSearchParams({ classId: selectedClassId });
        const response = await fetch(`/api/class-subjects?${params}`);
        if (response.ok) {
          const data = await response.json();
          const subjectData = (data.data || []).map((cs: any) => ({
            id: cs.subject?.id || cs.subjectId,
            name: cs.subject?.name || "Unknown",
            code: cs.subject?.code || "",
            isOptional: cs.isOptional || false,
            totalMarks: cs.totalMarks || selectedExam?.totalMarks || 100,
          }));
          setSubjects(subjectData);
        }
      } catch (err) {
        console.error("Error fetching subjects:", err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [selectedClassId, selectedExam?.totalMarks]);

  // Step 4: Fetch students when subject is selected
  const fetchStudents = useCallback(async () => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);
    setError(null);

    try {
      // First get students in the class/section
      const studentParams = new URLSearchParams({
        classId: selectedClassId,
        limit: "200",
      });
      if (selectedSectionId) {
        studentParams.append("sectionId", selectedSectionId);
      }

      const studentsResponse = await fetch(`/api/students?${studentParams}`);
      if (!studentsResponse.ok) {
        throw new Error("Failed to fetch students");
      }
      const studentsData = await studentsResponse.json();
      const studentList = studentsData.students || studentsData.data || [];

      // Get existing marks for this exam/subject
      const marksResponse = await fetch(
        `/api/bulk-marks?examId=${selectedExamId}&subjectId=${selectedSubjectId}`
      );
      const marksData = marksResponse.ok
        ? await marksResponse.json()
        : { studentMarks: [] };
      const existingMarks = marksData.studentMarks || [];

      // Merge students with their marks
      const mergedData: StudentMarkData[] = studentList.map((student: any) => {
        const existingMark = existingMarks.find(
          (m: any) => m.studentId === student.id || m.student?.id === student.id
        );
        return {
          studentId: student.id,
          registrationNo: student.registrationNo || "",
          rollNumber: student.rollNo || student.rollNumber || "",
          studentName:
            `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
            student.name ||
            "Unknown",
          photo: student.photo,
          totalMarks: existingMark?.totalMarks || subjectTotalMarks,
          marksObtained: existingMark?.marksObtained ?? null,
          isAbsent: existingMark?.isAbsent || false,
          remarks: existingMark?.remarks || "",
          isDirty: false,
        };
      });

      // Sort by roll number
      mergedData.sort((a, b) => {
        const rollA = parseInt(a.rollNumber) || 0;
        const rollB = parseInt(b.rollNumber) || 0;
        return rollA - rollB;
      });

      setStudents(mergedData);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  }, [
    selectedExamId,
    selectedClassId,
    selectedSectionId,
    selectedSubjectId,
    subjectTotalMarks,
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handlers
  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    setSelectedClassId("");
    setSelectedSectionId("");
    setSelectedSubjectId("");
    setStudents([]);
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedSectionId("");
    setSelectedSubjectId("");
    setStudents([]);
  };

  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setSelectedSubjectId("");
    setStudents([]);
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
  };

  const handleMarksChange = (studentId: string, value: string) => {
    const numValue = value === "" ? null : Number(value);
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              marksObtained: numValue,
              isDirty: true,
              isAbsent: false,
            }
          : s
      )
    );
  };

  const handleAbsentToggle = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              isAbsent: !s.isAbsent,
              marksObtained: !s.isAbsent ? null : s.marksObtained,
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

    if (selectedExam?.isPublished) {
      setError("Cannot update marks for a published exam");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/marks-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExamId,
          subjectId: selectedSubjectId,
          totalMarks: subjectTotalMarks,
          marks: dirtyStudents.map((s) => ({
            studentId: s.studentId,
            marksObtained: s.marksObtained,
            isAbsent: s.isAbsent,
            remarks: s.remarks,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(
          `Successfully saved marks for ${dirtyStudents.length} student(s)`
        );
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
        !s.isAbsent ? { ...s, marksObtained: marks, isDirty: true } : s
      )
    );
  };

  const handleClearAll = () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        marksObtained: null,
        isAbsent: false,
        remarks: "",
        isDirty: true,
      }))
    );
  };

  // Statistics
  const dirtyCount = students.filter((s) => s.isDirty).length;
  const completedCount = students.filter(
    (s) => s.marksObtained !== null || s.isAbsent
  ).length;
  const passedCount = students.filter(
    (s) =>
      s.marksObtained !== null &&
      s.marksObtained >= (selectedExam?.passingMarks || 33)
  ).length;
  const failedCount = students.filter(
    (s) =>
      s.marksObtained !== null &&
      s.marksObtained < (selectedExam?.passingMarks || 33)
  ).length;
  const absentCount = students.filter((s) => s.isAbsent).length;
  const presentWithMarks = students.filter((s) => s.marksObtained !== null);
  const averageMarks =
    presentWithMarks.length > 0
      ? Math.round(
          presentWithMarks.reduce((sum, s) => sum + (s.marksObtained || 0), 0) /
            presentWithMarks.length
        )
      : 0;

  const isReadyToLoad = selectedExamId && selectedClassId && selectedSubjectId;

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(102, 126, 234, 0.4)",
              }}
            >
              <EditIcon sx={{ color: "white", fontSize: 30 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                Enter Marks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select exam → class → section → subject to enter marks
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Selection Flow */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            background: "linear-gradient(135deg, #fafbfc 0%, #f0f2f5 100%)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 3 }}>
            Selection Steps
          </Typography>

          <Grid container spacing={2} alignItems="center">
            {/* Step 1: Exam */}
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <Card
                elevation={0}
                sx={{
                  border: "2px solid",
                  borderColor: selectedExamId ? "primary.main" : "grey.300",
                  borderRadius: 2,
                  transition: "all 0.2s",
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Badge badgeContent="1" color="primary">
                      <AssessmentIcon
                        color={selectedExamId ? "primary" : "disabled"}
                      />
                    </Badge>
                    <Typography variant="subtitle2" fontWeight="600">
                      Exam
                    </Typography>
                    {selectedExamId && (
                      <CheckCircleIcon
                        color="success"
                        fontSize="small"
                        sx={{ ml: "auto" }}
                      />
                    )}
                  </Box>
                  <FormControl fullWidth size="small">
                    <InputLabel>Select Exam</InputLabel>
                    <Select
                      value={selectedExamId}
                      onChange={(e) => handleExamChange(e.target.value)}
                      label="Select Exam"
                      disabled={loadingExams}
                    >
                      <MenuItem value="">
                        <em>Choose...</em>
                      </MenuItem>
                      {exams.map((exam) => (
                        <MenuItem key={exam.id} value={exam.id}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {exam.name}
                            {exam.isPublished && (
                              <Chip
                                label="Published"
                                size="small"
                                color="success"
                                sx={{ height: 18 }}
                              />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {loadingExams && <LinearProgress sx={{ mt: 1 }} />}
                </CardContent>
              </Card>
            </Grid>

            <Grid
              size={{ xs: 12, sm: "auto" }}
              sx={{
                display: { xs: "none", sm: "flex" },
                justifyContent: "center",
              }}
            >
              <ArrowForwardIcon
                color={selectedExamId ? "primary" : "disabled"}
              />
            </Grid>

            {/* Step 2: Class */}
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <Card
                elevation={0}
                sx={{
                  border: "2px solid",
                  borderColor: selectedClassId ? "primary.main" : "grey.300",
                  borderRadius: 2,
                  opacity: selectedExamId ? 1 : 0.5,
                  transition: "all 0.2s",
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Badge
                      badgeContent="2"
                      color={selectedExamId ? "primary" : "default"}
                    >
                      <ClassIcon
                        color={selectedClassId ? "primary" : "disabled"}
                      />
                    </Badge>
                    <Typography variant="subtitle2" fontWeight="600">
                      Class
                    </Typography>
                    {selectedClassId && (
                      <CheckCircleIcon
                        color="success"
                        fontSize="small"
                        sx={{ ml: "auto" }}
                      />
                    )}
                  </Box>
                  <FormControl
                    fullWidth
                    size="small"
                    disabled={!selectedExamId}
                  >
                    <InputLabel>Select Class</InputLabel>
                    <Select
                      value={selectedClassId}
                      onChange={(e) => handleClassChange(e.target.value)}
                      label="Select Class"
                    >
                      <MenuItem value="">
                        <em>Choose...</em>
                      </MenuItem>
                      {classes.map((cls) => (
                        <MenuItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {loadingClasses && <LinearProgress sx={{ mt: 1 }} />}
                </CardContent>
              </Card>
            </Grid>

            <Grid
              size={{ xs: 12, sm: "auto" }}
              sx={{
                display: { xs: "none", sm: "flex" },
                justifyContent: "center",
              }}
            >
              <ArrowForwardIcon
                color={selectedClassId ? "primary" : "disabled"}
              />
            </Grid>

            {/* Step 3: Section */}
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <Card
                elevation={0}
                sx={{
                  border: "2px solid",
                  borderColor: selectedSectionId
                    ? "secondary.main"
                    : "grey.300",
                  borderRadius: 2,
                  opacity: selectedClassId ? 1 : 0.5,
                  transition: "all 0.2s",
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Badge
                      badgeContent="3"
                      color={selectedClassId ? "secondary" : "default"}
                    >
                      <GroupsIcon
                        color={selectedSectionId ? "secondary" : "disabled"}
                      />
                    </Badge>
                    <Typography variant="subtitle2" fontWeight="600">
                      Section
                    </Typography>
                    <Chip
                      label="Optional"
                      size="small"
                      sx={{ height: 16, fontSize: "0.6rem" }}
                    />
                  </Box>
                  <FormControl
                    fullWidth
                    size="small"
                    disabled={!selectedClassId}
                  >
                    <InputLabel>Select Section</InputLabel>
                    <Select
                      value={selectedSectionId}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      label="Select Section"
                    >
                      <MenuItem value="">
                        <em>All Sections</em>
                      </MenuItem>
                      {sections.map((section) => (
                        <MenuItem key={section.id} value={section.id}>
                          {section.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            <Grid
              size={{ xs: 12, sm: "auto" }}
              sx={{
                display: { xs: "none", sm: "flex" },
                justifyContent: "center",
              }}
            >
              <ArrowForwardIcon
                color={selectedClassId ? "success" : "disabled"}
              />
            </Grid>

            {/* Step 4: Subject */}
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <Card
                elevation={0}
                sx={{
                  border: "2px solid",
                  borderColor: selectedSubjectId ? "success.main" : "grey.300",
                  borderRadius: 2,
                  opacity: selectedClassId ? 1 : 0.5,
                  transition: "all 0.2s",
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Badge
                      badgeContent="4"
                      color={selectedClassId ? "success" : "default"}
                    >
                      <SubjectIcon
                        color={selectedSubjectId ? "success" : "disabled"}
                      />
                    </Badge>
                    <Typography variant="subtitle2" fontWeight="600">
                      Subject
                    </Typography>
                    {selectedSubjectId && (
                      <CheckCircleIcon
                        color="success"
                        fontSize="small"
                        sx={{ ml: "auto" }}
                      />
                    )}
                  </Box>
                  <FormControl
                    fullWidth
                    size="small"
                    disabled={!selectedClassId}
                  >
                    <InputLabel>Select Subject</InputLabel>
                    <Select
                      value={selectedSubjectId}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      label="Select Subject"
                    >
                      <MenuItem value="">
                        <em>Choose...</em>
                      </MenuItem>
                      {subjects.map((subject) => (
                        <MenuItem key={subject.id} value={subject.id}>
                          {subject.name} {subject.code && `(${subject.code})`}
                          {subject.isOptional && " - Optional"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {loadingSubjects && <LinearProgress sx={{ mt: 1 }} />}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Ready Banner */}
          {isReadyToLoad && (
            <Fade in>
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "success.main",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleIcon />
                  <Typography variant="body2" fontWeight="600">
                    Ready: {selectedExam?.name} → {selectedClass?.name}
                    {selectedSectionId &&
                      ` (${
                        sections.find((s) => s.id === selectedSectionId)?.name
                      })`}
                    {" → "}
                    {selectedSubject?.name}
                  </Typography>
                </Box>
                {selectedExam?.isPublished && (
                  <Chip
                    icon={<WarningIcon />}
                    label="Exam Published - Read Only"
                    color="warning"
                    size="small"
                    sx={{ bgcolor: "warning.light" }}
                  />
                )}
              </Box>
            </Fade>
          )}
        </Paper>

        {/* Statistics */}
        {students.length > 0 && (
          <Fade in>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                {
                  label: "Total",
                  value: students.length,
                  color: "#1976d2",
                  bg: "#e3f2fd",
                },
                {
                  label: "Passed",
                  value: passedCount,
                  color: "#2e7d32",
                  bg: "#e8f5e9",
                },
                {
                  label: "Failed",
                  value: failedCount,
                  color: "#d32f2f",
                  bg: "#ffebee",
                },
                {
                  label: "Absent",
                  value: absentCount,
                  color: "#ed6c02",
                  bg: "#fff3e0",
                },
                {
                  label: "Average",
                  value: averageMarks,
                  color: "#0288d1",
                  bg: "#e1f5fe",
                },
                {
                  label: "Unsaved",
                  value: dirtyCount,
                  color: dirtyCount > 0 ? "#f57c00" : "#9e9e9e",
                  bg: dirtyCount > 0 ? "#fff8e1" : "#f5f5f5",
                },
              ].map((stat) => (
                <Grid key={stat.label} size={{ xs: 4, sm: 2 }}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      bgcolor: stat.bg,
                      textAlign: "center",
                    }}
                  >
                    <CardContent
                      sx={{ py: 1.5, px: 1, "&:last-child": { pb: 1.5 } }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {stat.label}
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        sx={{ color: stat.color }}
                      >
                        {stat.value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Fade>
        )}

        {/* Marks Table */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          {/* Table Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Student Marks
              </Typography>
              {selectedExam && (
                <Chip
                  label={`Total: ${subjectTotalMarks} | Pass: ${selectedExam.passingMarks}`}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => handleFillAll(subjectTotalMarks)}
                disabled={students.length === 0 || selectedExam?.isPublished}
              >
                Fill Max
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<ClearIcon />}
                onClick={handleClearAll}
                disabled={students.length === 0 || selectedExam?.isPublished}
              >
                Clear
              </Button>
              <IconButton
                onClick={fetchStudents}
                disabled={loadingStudents || !isReadyToLoad}
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Loading */}
          {loadingStudents && <LinearProgress />}

          {/* Empty States */}
          {!loadingStudents && !isReadyToLoad && (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <SchoolIcon
                sx={{ fontSize: 80, color: "text.disabled", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Complete Selection to Begin
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Select Exam → Class → Subject to load students
              </Typography>
            </Box>
          )}

          {!loadingStudents && isReadyToLoad && students.length === 0 && (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <PersonIcon
                sx={{ fontSize: 80, color: "text.disabled", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Students Found
              </Typography>
              <Typography variant="body2" color="text.disabled">
                No students enrolled in this class/section
              </Typography>
            </Box>
          )}

          {/* Students Table */}
          {!loadingStudents && students.length > 0 && (
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.100",
                        width: 50,
                      }}
                    >
                      #
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.100",
                        width: 80,
                      }}
                    >
                      Roll
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.100",
                        minWidth: 180,
                      }}
                    >
                      Student
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.100",
                        width: 120,
                      }}
                    >
                      Reg. No
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.100",
                        width: 130,
                        textAlign: "center",
                      }}
                    >
                      Marks / {subjectTotalMarks}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.100",
                        width: 90,
                        textAlign: "center",
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.100",
                        minWidth: 140,
                      }}
                    >
                      Remarks
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student, idx) => {
                    const isPassed =
                      student.marksObtained !== null &&
                      student.marksObtained >=
                        (selectedExam?.passingMarks || 33);
                    const isFailed =
                      student.marksObtained !== null &&
                      student.marksObtained <
                        (selectedExam?.passingMarks || 33);

                    return (
                      <TableRow
                        key={student.studentId}
                        hover
                        sx={{
                          bgcolor: student.isDirty
                            ? "rgba(255, 193, 7, 0.08)"
                            : student.isAbsent
                            ? "rgba(211, 47, 47, 0.04)"
                            : isPassed
                            ? "rgba(46, 125, 50, 0.04)"
                            : isFailed
                            ? "rgba(211, 47, 47, 0.04)"
                            : "inherit",
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {idx + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="600">
                            {student.rollNumber || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Avatar
                              src={student.photo}
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: "primary.main",
                                fontSize: "0.8rem",
                              }}
                            >
                              {student.studentName.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2">
                                {student.studentName}
                              </Typography>
                              {student.isDirty && (
                                <Chip
                                  label="Modified"
                                  size="small"
                                  color="warning"
                                  sx={{ height: 16, fontSize: "0.6rem" }}
                                />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {student.registrationNo || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={student.marksObtained ?? ""}
                            onChange={(e) =>
                              handleMarksChange(
                                student.studentId,
                                e.target.value
                              )
                            }
                            disabled={
                              student.isAbsent || selectedExam?.isPublished
                            }
                            slotProps={{
                              htmlInput: {
                                min: 0,
                                max: subjectTotalMarks,
                                style: { textAlign: "center", width: 60 },
                              },
                            }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                bgcolor: isPassed
                                  ? "rgba(46, 125, 50, 0.1)"
                                  : isFailed
                                  ? "rgba(211, 47, 47, 0.1)"
                                  : "inherit",
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={student.isAbsent ? "Absent" : "Present"}
                            size="small"
                            color={student.isAbsent ? "error" : "success"}
                            variant={student.isAbsent ? "filled" : "outlined"}
                            onClick={() =>
                              !selectedExam?.isPublished &&
                              handleAbsentToggle(student.studentId)
                            }
                            sx={{
                              cursor: selectedExam?.isPublished
                                ? "default"
                                : "pointer",
                              minWidth: 65,
                            }}
                          />
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
                            placeholder="Remarks..."
                            disabled={selectedExam?.isPublished}
                            fullWidth
                            slotProps={{
                              htmlInput: { style: { fontSize: "0.8rem" } },
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Footer */}
          {students.length > 0 && (
            <Box
              sx={{
                p: 2,
                bgcolor: "grey.50",
                borderTop: "1px solid",
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {completedCount}/{students.length} completed
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(completedCount / students.length) * 100}
                  sx={{ width: 100, height: 6, borderRadius: 3 }}
                />
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={
                  saving ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                disabled={
                  saving || dirtyCount === 0 || selectedExam?.isPublished
                }
                onClick={handleSaveAll}
                sx={{
                  minWidth: 180,
                  background: "linear-gradient(45deg, #667eea, #764ba2)",
                  "&:hover": {
                    background: "linear-gradient(45deg, #5a6fd6, #6a4190)",
                  },
                }}
              >
                {saving ? "Saving..." : `Save (${dirtyCount})`}
              </Button>
            </Box>
          )}
        </Paper>

        {/* Snackbars */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity="error"
            onClose={() => setError(null)}
            variant="filled"
          >
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity="success"
            onClose={() => setSuccess(null)}
            variant="filled"
          >
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
}
