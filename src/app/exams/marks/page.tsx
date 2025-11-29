"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  InputAdornment,
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
} from "@mui/material";
import { Save as SaveIcon, Search as SearchIcon } from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";

interface Student {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  marks?: number;
  grade?: string;
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
  academicYear: string;
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
  const [marksData, setMarksData] = useState<Record<string, number>>({});

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
        setStudents(data.students || []);
        // Initialize marks data
        const initialMarks: Record<string, number> = {};
        (data.students || []).forEach((student: Student) => {
          initialMarks[student.id] = 0;
        });
        setMarksData(initialMarks);
      }
    } catch (error) {
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSection]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchClasses();
      fetchSubjects();
      fetchExams();
    }
  }, [status, fetchClasses, fetchSubjects, fetchExams]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass, selectedSection, fetchStudents]);

  const handleMarksChange = (studentId: string, marks: number) => {
    if (marks < 0) marks = 0;
    if (marks > totalMarks) marks = totalMarks;
    setMarksData((prev) => ({
      ...prev,
      [studentId]: marks,
    }));
  };

  const calculateGrade = (marks: number): string => {
    const percentage = (marks / totalMarks) * 100;
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
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
      case "F":
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

    setSaving(true);
    try {
      // Prepare results data
      const results = Object.entries(marksData).map(([studentId, marks]) => ({
        studentId,
        examId: selectedExam,
        subjectId: selectedSubject,
        marksObtained: marks,
        totalMarks,
        grade: calculateGrade(marks),
      }));

      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, bulk: true }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Marks saved for ${results.length} students`);
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
            Enter Marks
          </Typography>
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
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Select class, section, exam, and subject to enter marks for students.
          Grades are calculated automatically.
        </Alert>

        {/* Selection Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Exam</InputLabel>
                <Select
                  value={selectedExam}
                  label="Exam"
                  onChange={(e) => setSelectedExam(e.target.value)}
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
                <InputLabel>Subject</InputLabel>
                <Select
                  value={selectedSubject}
                  label="Subject"
                  onChange={(e) => setSelectedSubject(e.target.value)}
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
              <FormControl fullWidth>
                <InputLabel>Class</InputLabel>
                <Select
                  value={selectedClass}
                  label="Class"
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSection("");
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
                  onChange={(e) => setSelectedSection(e.target.value)}
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
              <TextField
                fullWidth
                type="number"
                label="Total Marks"
                value={totalMarks}
                onChange={(e) => setTotalMarks(parseInt(e.target.value) || 100)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Students: {students.length}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Marks Entry Table */}
        <Paper sx={{ p: 2 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
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
                    <TableCell width={80}>#</TableCell>
                    <TableCell width={150}>Registration No</TableCell>
                    <TableCell>Student Name</TableCell>
                    <TableCell width={150}>Marks Obtained</TableCell>
                    <TableCell width={100}>Percentage</TableCell>
                    <TableCell width={100}>Grade</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student, index) => {
                    const marks = marksData[student.id] || 0;
                    const percentage = ((marks / totalMarks) * 100).toFixed(1);
                    const grade = calculateGrade(marks);
                    return (
                      <TableRow key={student.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{student.registrationNo}</TableCell>
                        <TableCell>
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={marks}
                            onChange={(e) =>
                              handleMarksChange(
                                student.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            inputProps={{ min: 0, max: totalMarks }}
                            sx={{ width: 100 }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            / {totalMarks}
                          </Typography>
                        </TableCell>
                        <TableCell>{percentage}%</TableCell>
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
            <Chip label="F (Below 50%)" color="error" size="small" />
          </Box>
        </Paper>
      </Box>
    </MainLayout>
  );
}
