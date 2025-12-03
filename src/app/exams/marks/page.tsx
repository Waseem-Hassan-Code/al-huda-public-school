"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Checkbox,
} from "@mui/material";
import { Save as SaveIcon, Lock as LockIcon } from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";

interface Student {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
}

interface ExistingMark {
  studentId: string;
  marksObtained: number | null;
  isAbsent: boolean;
  remarks?: string;
}

interface Class {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
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
  totalMarks: number;
}

export default function MarksEntryPage() {
  const { data: session, status } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [marksData, setMarksData] = useState<
    Record<string, { marks: number; isAbsent: boolean }>
  >({});
  const [existingMarks, setExistingMarks] = useState<ExistingMark[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/classes?includeSection=true&limit=100"
      );
      const data = await response.json();
      if (response.ok) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    if (!selectedClass) {
      setSubjects([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/class-subjects?classId=${selectedClass}`
      );
      const data = await response.json();
      if (response.ok) {
        const subjectData = (data.data || []).map((cs: any) => ({
          id: cs.subject?.id || cs.subjectId,
          name: cs.subject?.name || "Unknown",
          code: cs.subject?.code || "",
        }));
        setSubjects(subjectData);
      }
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  }, [selectedClass]);

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

  const fetchStudents = useCallback(async () => {
    if (!selectedClass) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("classId", selectedClass);
      if (selectedSection) params.append("sectionId", selectedSection);
      params.append("limit", "100");

      const response = await fetch(`/api/students?${params}`);
      const data = await response.json();
      if (response.ok) {
        const studentList = data.data || data.students || [];
        setStudents(studentList);
        // Initialize marks data
        const initialMarks: Record<
          string,
          { marks: number; isAbsent: boolean }
        > = {};
        studentList.forEach((student: Student) => {
          initialMarks[student.id] = { marks: 0, isAbsent: false };
        });
        setMarksData(initialMarks);
      }
    } catch (error) {
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSection]);

  // Fetch existing marks when exam, class, and subject are selected
  const fetchExistingMarks = useCallback(async () => {
    if (!selectedExam || !selectedClass || !selectedSubject) {
      setExistingMarks([]);
      setIsReadOnly(false);
      return;
    }

    try {
      setLoadingMarks(true);
      const params = new URLSearchParams();
      params.append("examId", selectedExam);
      params.append("subjectId", selectedSubject);
      params.append("classId", selectedClass);
      if (selectedSection) params.append("sectionId", selectedSection);

      const response = await fetch(`/api/results?${params}`);
      const data = await response.json();

      if (response.ok && data.data && data.data.length > 0) {
        setExistingMarks(data.data);
        setIsReadOnly(true);

        // Populate marks data with existing marks
        const existingMarksMap: Record<
          string,
          { marks: number; isAbsent: boolean }
        > = {};
        data.data.forEach((mark: any) => {
          existingMarksMap[mark.studentId] = {
            marks: mark.marksObtained || 0,
            isAbsent: mark.isAbsent || false,
          };
        });

        // Merge with students who don't have marks yet
        setMarksData((prev) => {
          const newData = { ...prev };
          Object.keys(existingMarksMap).forEach((studentId) => {
            newData[studentId] = existingMarksMap[studentId];
          });
          return newData;
        });

        toast.info(
          "Marks already entered for this combination. Showing in read-only mode."
        );
      } else {
        setExistingMarks([]);
        setIsReadOnly(false);
      }
    } catch (error) {
      console.error("Failed to fetch existing marks:", error);
    } finally {
      setLoadingMarks(false);
    }
  }, [selectedExam, selectedClass, selectedSubject, selectedSection]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchClasses();
      fetchExams();
    }
  }, [status, fetchClasses, fetchExams]);

  useEffect(() => {
    fetchSubjects();
    setSelectedSubject("");
  }, [fetchSubjects]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [selectedClass, selectedSection, fetchStudents]);

  // Fetch existing marks when selection changes
  useEffect(() => {
    if (
      selectedExam &&
      selectedClass &&
      selectedSubject &&
      students.length > 0
    ) {
      fetchExistingMarks();
    }
  }, [selectedExam, selectedSubject, students.length, fetchExistingMarks]);

  // Update total marks when exam changes
  useEffect(() => {
    const exam = exams.find((e) => e.id === selectedExam);
    if (exam?.totalMarks) {
      setTotalMarks(exam.totalMarks);
    }
  }, [selectedExam, exams]);

  const handleMarksChange = (studentId: string, marks: number) => {
    if (isReadOnly) return;
    if (marks < 0) marks = 0;
    if (marks > totalMarks) marks = totalMarks;
    setMarksData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], marks, isAbsent: false },
    }));
  };

  const handleAbsentChange = (studentId: string, isAbsent: boolean) => {
    if (isReadOnly) return;
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isAbsent,
        marks: isAbsent ? 0 : prev[studentId]?.marks || 0,
      },
    }));
  };

  const calculateGrade = (marks: number, isAbsent: boolean): string => {
    if (isAbsent) return "AB";
    const percentage = (marks / totalMarks) * 100;
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    if (percentage >= 33) return "E";
    return "F";
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
      case "E":
      case "F":
      case "AB":
        return "error";
      default:
        return "default";
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedExam || !selectedSubject) {
      toast.error("Please select exam and subject");
      return;
    }

    if (students.length === 0) {
      toast.error("No students to save marks for");
      return;
    }

    setSaving(true);
    try {
      // Prepare marks in the format the API expects
      const marks = students.map((student) => ({
        studentId: student.id,
        marksObtained: marksData[student.id]?.isAbsent
          ? null
          : marksData[student.id]?.marks || 0,
        isAbsent: marksData[student.id]?.isAbsent || false,
        remarks: "",
      }));

      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExam,
          subjectId: selectedSubject,
          marks,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Marks saved for ${marks.length} students`);
        // Refresh to show read-only mode
        fetchExistingMarks();
      } else {
        toast.error(data.error || "Failed to save marks");
      }
    } catch (error) {
      toast.error("Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  const selectedClassData = classes.find((c) => c.id === selectedClass);

  if (status === "loading") {
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
            Enter Marks
          </Typography>
          {!isReadOnly && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveMarks}
              disabled={
                saving ||
                students.length === 0 ||
                !selectedExam ||
                !selectedSubject
              }
            >
              {saving ? "Saving..." : "Save Marks"}
            </Button>
          )}
        </Box>

        {isReadOnly ? (
          <Alert severity="warning" icon={<LockIcon />} sx={{ mb: 3 }}>
            Marks have already been entered for this exam, class, and subject
            combination. Displaying in read-only mode.
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            Select exam, class, section, and subject to enter marks for
            students. Grades are calculated automatically.
          </Alert>
        )}

        {/* Selection Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Exam</InputLabel>
                <Select
                  value={selectedExam}
                  label="Exam"
                  onChange={(e) => {
                    setSelectedExam(e.target.value);
                    setIsReadOnly(false);
                    setExistingMarks([]);
                  }}
                >
                  <MenuItem value="">Select Exam</MenuItem>
                  {exams.map((exam) => (
                    <MenuItem key={exam.id} value={exam.id}>
                      {exam.name} ({exam.examType})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Class</InputLabel>
                <Select
                  value={selectedClass}
                  label="Class"
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSection("");
                    setSelectedSubject("");
                    setIsReadOnly(false);
                    setExistingMarks([]);
                  }}
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
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Section</InputLabel>
                <Select
                  value={selectedSection}
                  label="Section"
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setIsReadOnly(false);
                    setExistingMarks([]);
                  }}
                  disabled={!selectedClass}
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {selectedClassData?.sections?.map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={selectedSubject}
                  label="Subject"
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setIsReadOnly(false);
                    setExistingMarks([]);
                  }}
                  disabled={!selectedClass}
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
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Total Marks"
                value={totalMarks}
                onChange={(e) => setTotalMarks(parseInt(e.target.value) || 100)}
                disabled={isReadOnly}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Students: {students.length}
                </Typography>
                {loadingMarks && (
                  <Typography variant="caption" color="primary">
                    Checking existing marks...
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Marks Entry Table */}
        <Paper sx={{ p: 2 }}>
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              p={4}
            >
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography>Loading students...</Typography>
            </Box>
          ) : students.length === 0 ? (
            <Box display="flex" justifyContent="center" p={4}>
              <Typography color="text.secondary">
                Select a class to load students
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width={60}>#</TableCell>
                    <TableCell width={140}>Registration No</TableCell>
                    <TableCell>Student Name</TableCell>
                    <TableCell width={100}>Absent</TableCell>
                    <TableCell width={150}>Marks Obtained</TableCell>
                    <TableCell width={100}>Percentage</TableCell>
                    <TableCell width={100}>Grade</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student, index) => {
                    const studentMarks = marksData[student.id] || {
                      marks: 0,
                      isAbsent: false,
                    };
                    const percentage = studentMarks.isAbsent
                      ? 0
                      : (studentMarks.marks / totalMarks) * 100;
                    const grade = calculateGrade(
                      studentMarks.marks,
                      studentMarks.isAbsent
                    );

                    return (
                      <TableRow key={student.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{student.registrationNo}</TableCell>
                        <TableCell>
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={studentMarks.isAbsent}
                            onChange={(e) =>
                              handleAbsentChange(student.id, e.target.checked)
                            }
                            disabled={isReadOnly}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={
                              studentMarks.isAbsent ? "" : studentMarks.marks
                            }
                            onChange={(e) =>
                              handleMarksChange(
                                student.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            inputProps={{ min: 0, max: totalMarks }}
                            sx={{ width: 80 }}
                            disabled={isReadOnly || studentMarks.isAbsent}
                            placeholder={studentMarks.isAbsent ? "AB" : "0"}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            / {totalMarks}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {studentMarks.isAbsent
                            ? "-"
                            : `${percentage.toFixed(1)}%`}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={grade}
                            color={getGradeColor(grade)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Grade Legend */}
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Grading Scale
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Chip label="A+ (90%+)" color="success" size="small" />
            <Chip label="A (80-89%)" color="success" size="small" />
            <Chip label="B (70-79%)" color="info" size="small" />
            <Chip label="C (60-69%)" color="warning" size="small" />
            <Chip label="D (50-59%)" color="error" size="small" />
            <Chip label="E (33-49%)" color="error" size="small" />
            <Chip label="F (Below 33%)" color="error" size="small" />
            <Chip label="AB (Absent)" color="error" size="small" />
          </Box>
        </Paper>
      </Box>
    </MainLayout>
  );
}
