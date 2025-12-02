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
  Checkbox,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Add,
  Edit,
  Search,
  Close,
  School,
  Person,
  Class as ClassIcon,
  CheckCircle,
  Cancel,
  Refresh,
  Download,
  Upload,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";

interface ClassData {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ClassSubject {
  id: string;
  classId: string;
  sectionId: string | null;
  subjectId: string;
  subject: Subject;
  isOptional: boolean;
  totalMarks: number;
  passingMarks: number;
  section: { id: string; name: string } | null;
}

interface Student {
  id: string;
  registrationNo: string;
  rollNo: string | null;
  firstName: string;
  lastName: string;
  classId: string;
  sectionId: string;
  section: { name: string };
  class: { name: string };
}

interface StudentSubject {
  id: string;
  studentId: string;
  subjectId: string;
  classSubjectId: string | null;
  subject: Subject;
  isActive: boolean;
}

export default function StudentSubjectsPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<
    Map<string, StudentSubject[]>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  // Dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  // Bulk assignment
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedOptionalSubject, setSelectedOptionalSubject] =
    useState<ClassSubject | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes", error);
    }
  };

  const fetchClassSubjects = useCallback(async () => {
    if (!selectedClassId) return;

    try {
      const params = new URLSearchParams({ classId: selectedClassId });
      if (selectedSectionId) {
        params.append("sectionId", selectedSectionId);
      }

      const res = await fetch(`/api/student-subjects?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClassSubjects(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch class subjects", error);
    }
  }, [selectedClassId, selectedSectionId]);

  const fetchStudents = useCallback(async () => {
    if (!selectedClassId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        classId: selectedClassId,
        status: "active",
        limit: "100",
      });
      if (selectedSectionId) {
        params.append("sectionId", selectedSectionId);
      }

      const res = await fetch(`/api/students?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);

        // Fetch student subjects for each student
        const subjectsMap = new Map<string, StudentSubject[]>();
        await Promise.all(
          (data.students || []).map(async (student: Student) => {
            const subRes = await fetch(
              `/api/student-subjects?studentId=${student.id}`
            );
            if (subRes.ok) {
              const subData = await subRes.json();
              subjectsMap.set(student.id, subData.data || []);
            }
          })
        );
        setStudentSubjects(subjectsMap);
      }
    } catch (error) {
      console.error("Failed to fetch students", error);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSectionId]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassSubjects();
      fetchStudents();
    }
  }, [selectedClassId, selectedSectionId, fetchClassSubjects, fetchStudents]);

  const optionalSubjects = classSubjects.filter((cs) => cs.isOptional);
  const compulsorySubjects = classSubjects.filter((cs) => !cs.isOptional);

  const getStudentOptionalSubjects = (studentId: string): string[] => {
    const subs = studentSubjects.get(studentId) || [];
    return subs.filter((s) => s.isActive).map((s) => s.subjectId);
  };

  const hasOptionalSubject = (
    studentId: string,
    subjectId: string
  ): boolean => {
    const subs = studentSubjects.get(studentId) || [];
    return subs.some((s) => s.subjectId === subjectId && s.isActive);
  };

  const handleOpenAssignDialog = (student: Student) => {
    setSelectedStudent(student);
    setSelectedSubjectIds(getStudentOptionalSubjects(student.id));
    setAssignDialogOpen(true);
  };

  const handleSaveStudentSubjects = async () => {
    if (!selectedStudent) return;

    setSaving(true);
    try {
      // Get class subject IDs for the selected subjects
      const classSubjectIds = optionalSubjects
        .filter((cs) => selectedSubjectIds.includes(cs.subjectId))
        .map((cs) => cs.id);

      const res = await fetch("/api/student-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          classSubjectIds,
        }),
      });

      if (res.ok) {
        toast.success("Subjects assigned successfully");
        setAssignDialogOpen(false);
        fetchStudents();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to assign subjects");
      }
    } catch (error) {
      toast.error("Failed to assign subjects");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBulkDialog = (classSubject: ClassSubject) => {
    setSelectedOptionalSubject(classSubject);
    // Pre-select students who already have this subject
    const alreadyEnrolled = students
      .filter((s) => hasOptionalSubject(s.id, classSubject.subjectId))
      .map((s) => s.id);
    setSelectedStudentIds(alreadyEnrolled);
    setBulkDialogOpen(true);
  };

  const handleBulkAssign = async () => {
    if (!selectedOptionalSubject) return;

    setSaving(true);
    try {
      // Enroll selected students
      const res = await fetch("/api/student-subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          classSubjectId: selectedOptionalSubject.id,
          action: "enroll",
        }),
      });

      if (res.ok) {
        // Drop students who were deselected
        const previouslyEnrolled = students
          .filter((s) =>
            hasOptionalSubject(s.id, selectedOptionalSubject.subjectId)
          )
          .map((s) => s.id);
        const toDrop = previouslyEnrolled.filter(
          (id) => !selectedStudentIds.includes(id)
        );

        if (toDrop.length > 0) {
          await fetch("/api/student-subjects", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentIds: toDrop,
              classSubjectId: selectedOptionalSubject.id,
              action: "drop",
            }),
          });
        }

        toast.success("Students updated successfully");
        setBulkDialogOpen(false);
        fetchStudents();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update students");
      }
    } catch (error) {
      toast.error("Failed to update students");
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    if (!search) return true;
    return (
      student.firstName.toLowerCase().includes(search.toLowerCase()) ||
      student.lastName.toLowerCase().includes(search.toLowerCase()) ||
      student.registrationNo.toLowerCase().includes(search.toLowerCase()) ||
      (student.rollNo || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Student Subject Assignment
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Assign optional/elective subjects to students. Compulsory subjects are
          automatically assigned to all students.
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Class *</InputLabel>
                <Select
                  value={selectedClassId}
                  label="Class *"
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId("");
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
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small" disabled={!selectedClassId}>
                <InputLabel>Section</InputLabel>
                <Select
                  value={selectedSectionId}
                  label="Section"
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {sections.map((sec) => (
                    <MenuItem key={sec.id} value={sec.id}>
                      {sec.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search students..."
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
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  fetchClassSubjects();
                  fetchStudents();
                }}
                disabled={!selectedClassId}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {!selectedClassId ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Please select a class to view students and assign subjects.
          </Alert>
        ) : (
          <>
            {/* Subject Summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <School sx={{ mr: 1, verticalAlign: "middle" }} />
                      Compulsory Subjects ({compulsorySubjects.length})
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {compulsorySubjects.map((cs) => (
                        <Chip
                          key={cs.id}
                          label={cs.subject.name}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      ))}
                      {compulsorySubjects.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No compulsory subjects assigned to this class
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <ClassIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Optional Subjects ({optionalSubjects.length})
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {optionalSubjects.map((cs) => (
                        <Chip
                          key={cs.id}
                          label={`${cs.subject.name}${
                            cs.section ? ` (${cs.section.name})` : ""
                          }`}
                          color="secondary"
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenBulkDialog(cs)}
                          sx={{ cursor: "pointer" }}
                        />
                      ))}
                      {optionalSubjects.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No optional subjects available for this class
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ mb: 2 }}
            >
              <Tab icon={<Person />} label="By Student" />
              <Tab icon={<School />} label="By Subject" />
            </Tabs>

            {/* By Student View */}
            {activeTab === 0 && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Roll No.</TableCell>
                      <TableCell>Reg. No.</TableCell>
                      <TableCell>Student Name</TableCell>
                      <TableCell>Section</TableCell>
                      <TableCell>Optional Subjects</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No students found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => {
                        const optSubs = getStudentOptionalSubjects(student.id);
                        const enrolledOptional = optionalSubjects.filter((cs) =>
                          optSubs.includes(cs.subjectId)
                        );

                        return (
                          <TableRow key={student.id}>
                            <TableCell>{student.rollNo || "-"}</TableCell>
                            <TableCell>{student.registrationNo}</TableCell>
                            <TableCell>
                              {student.firstName} {student.lastName}
                            </TableCell>
                            <TableCell>{student.section?.name}</TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 0.5,
                                }}
                              >
                                {enrolledOptional.map((cs) => (
                                  <Chip
                                    key={cs.id}
                                    label={cs.subject.name}
                                    size="small"
                                    color="success"
                                  />
                                ))}
                                {enrolledOptional.length === 0 && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    None assigned
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                startIcon={<Edit />}
                                onClick={() => handleOpenAssignDialog(student)}
                                disabled={optionalSubjects.length === 0}
                              >
                                Assign
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* By Subject View */}
            {activeTab === 1 && (
              <Grid container spacing={2}>
                {optionalSubjects.length === 0 ? (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="info">
                      No optional subjects available for this class. Add
                      optional subjects in the Class Subjects management page.
                    </Alert>
                  </Grid>
                ) : (
                  optionalSubjects.map((cs) => {
                    const enrolledCount = students.filter((s) =>
                      hasOptionalSubject(s.id, cs.subjectId)
                    ).length;

                    return (
                      <Grid key={cs.id} size={{ xs: 12, md: 6, lg: 4 }}>
                        <Card>
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <Box>
                                <Typography variant="h6">
                                  {cs.subject.name}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Code: {cs.subject.code}
                                  {cs.section &&
                                    ` • Section: ${cs.section.name}`}
                                </Typography>
                              </Box>
                              <Chip
                                label={`${enrolledCount}/${students.length}`}
                                color={
                                  enrolledCount > 0 ? "success" : "default"
                                }
                              />
                            </Box>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              Total: {cs.totalMarks} marks • Passing:{" "}
                              {cs.passingMarks} marks
                            </Typography>
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => handleOpenBulkDialog(cs)}
                            >
                              Manage Students
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })
                )}
              </Grid>
            )}
          </>
        )}

        {/* Individual Student Assignment Dialog */}
        <Dialog
          open={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              Assign Optional Subjects
              <IconButton onClick={() => setAssignDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
            {selectedStudent && (
              <Typography variant="body2" color="text.secondary">
                {selectedStudent.firstName} {selectedStudent.lastName} (
                {selectedStudent.registrationNo})
              </Typography>
            )}
          </DialogTitle>
          <DialogContent dividers>
            {optionalSubjects.length === 0 ? (
              <Alert severity="info">
                No optional subjects available for this class.
              </Alert>
            ) : (
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Select the optional subjects for this student:
                </Typography>
                {optionalSubjects.map((cs) => (
                  <Box
                    key={cs.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Checkbox
                      checked={selectedSubjectIds.includes(cs.subjectId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSubjectIds([
                            ...selectedSubjectIds,
                            cs.subjectId,
                          ]);
                        } else {
                          setSelectedSubjectIds(
                            selectedSubjectIds.filter(
                              (id) => id !== cs.subjectId
                            )
                          );
                        }
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography>{cs.subject.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {cs.subject.code}
                        {cs.section && ` • ${cs.section.name} only`}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveStudentSubjects}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Assignment Dialog */}
        <Dialog
          open={bulkDialogOpen}
          onClose={() => setBulkDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              Manage Students - {selectedOptionalSubject?.subject.name}
              <IconButton onClick={() => setBulkDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ mb: 2 }}>
              <Button
                size="small"
                onClick={() => setSelectedStudentIds(students.map((s) => s.id))}
              >
                Select All
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedStudentIds([])}
                sx={{ ml: 1 }}
              >
                Deselect All
              </Button>
              <Chip
                label={`${selectedStudentIds.length} selected`}
                sx={{ ml: 2 }}
              />
            </Box>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={
                          selectedStudentIds.length > 0 &&
                          selectedStudentIds.length < students.length
                        }
                        checked={selectedStudentIds.length === students.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds(students.map((s) => s.id));
                          } else {
                            setSelectedStudentIds([]);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>Roll No.</TableCell>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const isEnrolled = hasOptionalSubject(
                      student.id,
                      selectedOptionalSubject?.subjectId || ""
                    );
                    const isSelected = selectedStudentIds.includes(student.id);

                    return (
                      <TableRow key={student.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([
                                  ...selectedStudentIds,
                                  student.id,
                                ]);
                              } else {
                                setSelectedStudentIds(
                                  selectedStudentIds.filter(
                                    (id) => id !== student.id
                                  )
                                );
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{student.rollNo || "-"}</TableCell>
                        <TableCell>
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>{student.section?.name}</TableCell>
                        <TableCell>
                          {isEnrolled ? (
                            <Chip
                              icon={<CheckCircle />}
                              label="Enrolled"
                              size="small"
                              color="success"
                            />
                          ) : (
                            <Chip
                              icon={<Cancel />}
                              label="Not Enrolled"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleBulkAssign}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : "Save Changes"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
