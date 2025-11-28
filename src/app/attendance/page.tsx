"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Save as SaveIcon,
  Check as PresentIcon,
  Close as AbsentIcon,
  Schedule as LateIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { getInitials, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  class: { name: string };
  section: { name: string };
}

interface AttendanceRecord {
  studentId: string;
  status: string;
  remarks: string;
}

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE" | "HALF_DAY";

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendance, setAttendance] = useState<
    Record<string, { status: AttendanceStatus; remarks: string }>
  >({});
  const [existingAttendance, setExistingAttendance] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch("/api/classes");
        if (response.ok) {
          const data = await response.json();
          setClasses(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      }
    };

    if (status === "authenticated") {
      fetchClasses();
    }
  }, [status]);

  // Fetch students when class/section changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass || !selectedSection) {
        setStudents([]);
        return;
      }

      try {
        setLoading(true);
        const params = new URLSearchParams({
          classId: selectedClass,
          sectionId: selectedSection,
          status: "ACTIVE",
          limit: "100",
        });

        const response = await fetch(`/api/students?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setStudents(data.data || []);

          // Initialize attendance with PRESENT for all students
          const initialAttendance: Record<
            string,
            { status: AttendanceStatus; remarks: string }
          > = {};
          data.data.forEach((student: Student) => {
            initialAttendance[student.id] = { status: "PRESENT", remarks: "" };
          });
          setAttendance(initialAttendance);
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClass, selectedSection]);

  // Fetch existing attendance when date changes
  useEffect(() => {
    const fetchExistingAttendance = async () => {
      if (!selectedClass || !selectedSection || !selectedDate) return;

      try {
        const params = new URLSearchParams({
          classId: selectedClass,
          sectionId: selectedSection,
          date: selectedDate,
        });

        const response = await fetch(`/api/attendance?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            setExistingAttendance(true);
            const loadedAttendance: Record<
              string,
              { status: AttendanceStatus; remarks: string }
            > = {};
            data.data.forEach((record: any) => {
              loadedAttendance[record.studentId] = {
                status: record.status,
                remarks: record.remarks || "",
              };
            });
            setAttendance((prev) => ({ ...prev, ...loadedAttendance }));
          } else {
            setExistingAttendance(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch existing attendance:", error);
      }
    };

    fetchExistingAttendance();
  }, [selectedClass, selectedSection, selectedDate]);

  const handleStatusChange = (
    studentId: string,
    newStatus: AttendanceStatus
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status: newStatus },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<
      string,
      { status: AttendanceStatus; remarks: string }
    > = {};
    students.forEach((student) => {
      updated[student.id] = {
        status,
        remarks: attendance[student.id]?.remarks || "",
      };
    });
    setAttendance(updated);
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedSection || !selectedDate) {
      toast.error("Please select class, section, and date");
      return;
    }

    try {
      setSaving(true);
      const attendanceRecords = Object.entries(attendance).map(
        ([studentId, data]) => ({
          studentId,
          status: data.status,
          remarks: data.remarks,
        })
      );

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          classId: selectedClass,
          sectionId: selectedSection,
          attendance: attendanceRecords,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Attendance saved! Present: ${data.summary.present}, Absent: ${data.summary.absent}, Late: ${data.summary.late}`
        );
        setExistingAttendance(true);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save attendance");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const selectedClassData = classes.find((c) => c.id === selectedClass);
  const sections = selectedClassData?.sections || [];

  const summary = {
    total: students.length,
    present: Object.values(attendance).filter((a) => a.status === "PRESENT")
      .length,
    absent: Object.values(attendance).filter((a) => a.status === "ABSENT")
      .length,
    late: Object.values(attendance).filter((a) => a.status === "LATE").length,
    leave: Object.values(attendance).filter((a) => a.status === "LEAVE").length,
    halfDay: Object.values(attendance).filter((a) => a.status === "HALF_DAY")
      .length,
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return "success";
      case "ABSENT":
        return "error";
      case "LATE":
        return "warning";
      case "LEAVE":
        return "info";
      case "HALF_DAY":
        return "warning";
      default:
        return "default";
    }
  };

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
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              Attendance
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mark daily student attendance
            </Typography>
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Class</InputLabel>
              <Select
                value={selectedClass}
                label="Class"
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection("");
                }}
              >
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }} disabled={!selectedClass}>
              <InputLabel>Section</InputLabel>
              <Select
                value={selectedSection}
                label="Section"
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                {sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="date"
              label="Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: new Date().toISOString().split("T")[0] }}
            />
            {existingAttendance && (
              <Chip label="Attendance exists for this date" color="info" />
            )}
          </Box>
        </Paper>

        {/* Quick Actions & Summary */}
        {students.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Typography variant="body2">Quick Mark:</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={() => handleMarkAll("PRESENT")}
                >
                  All Present
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => handleMarkAll("ABSENT")}
                >
                  All Absent
                </Button>
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Chip label={`Total: ${summary.total}`} />
                <Chip label={`Present: ${summary.present}`} color="success" />
                <Chip label={`Absent: ${summary.absent}`} color="error" />
                <Chip label={`Late: ${summary.late}`} color="warning" />
                <Chip label={`Leave: ${summary.leave}`} color="info" />
              </Box>
              <Button
                variant="contained"
                startIcon={
                  saving ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                onClick={handleSave}
                disabled={saving || students.length === 0}
              >
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </Box>
          </Paper>
        )}

        {/* Attendance Table */}
        <Paper sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Alert severity="info">
              {selectedClass && selectedSection
                ? "No students found in this class/section"
                : "Please select a class and section to mark attendance"}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width={50}>#</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Roll No</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow key={student.id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12 }}>
                            {getInitials(student.firstName, student.lastName)}
                          </Avatar>
                          <Typography variant="body2">
                            {student.firstName} {student.lastName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell align="center">
                        <ToggleButtonGroup
                          value={attendance[student.id]?.status || "PRESENT"}
                          exclusive
                          onChange={(_, value) =>
                            value && handleStatusChange(student.id, value)
                          }
                          size="small"
                        >
                          <ToggleButton value="PRESENT" color="success">
                            <PresentIcon fontSize="small" />
                          </ToggleButton>
                          <ToggleButton value="ABSENT" color="error">
                            <AbsentIcon fontSize="small" />
                          </ToggleButton>
                          <ToggleButton value="LATE" color="warning">
                            <LateIcon fontSize="small" />
                          </ToggleButton>
                          <ToggleButton value="LEAVE" color="info">
                            L
                          </ToggleButton>
                          <ToggleButton value="HALF_DAY" color="warning">
                            H
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="Remarks (optional)"
                          value={attendance[student.id]?.remarks || ""}
                          onChange={(e) =>
                            handleRemarksChange(student.id, e.target.value)
                          }
                          sx={{ width: 200 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </MainLayout>
  );
}
