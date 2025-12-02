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
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Close,
  Schedule,
  Refresh,
  ContentCopy,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";

interface ClassData {
  id: string;
  name: string;
  grade: number;
  sections?: { id: string; name: string }[];
  subjects?: Subject[];
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

interface TimetableEntry {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId: string | null;
  room: string | null;
  subject: { id: string; name: string; code: string };
  teacher?: { id: string; firstName: string; lastName: string };
}

interface PeriodConfig {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  type: "period" | "break";
}

interface TimetableSettings {
  periodsPerDay: number;
  periodDuration: number;
  periods: PeriodConfig[];
}

interface AttendanceSettings {
  workingDays: string[];
  schoolStartTime: string;
  schoolEndTime: string;
}

const DEFAULT_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const DEFAULT_TIME_SLOTS: PeriodConfig[] = [
  {
    id: "period-1",
    label: "Period 1",
    startTime: "08:00",
    endTime: "08:45",
    type: "period",
  },
  {
    id: "period-2",
    label: "Period 2",
    startTime: "08:45",
    endTime: "09:30",
    type: "period",
  },
  {
    id: "period-3",
    label: "Period 3",
    startTime: "09:30",
    endTime: "10:15",
    type: "period",
  },
  {
    id: "break-1",
    label: "Break",
    startTime: "10:15",
    endTime: "10:45",
    type: "break",
  },
  {
    id: "period-4",
    label: "Period 4",
    startTime: "10:45",
    endTime: "11:30",
    type: "period",
  },
  {
    id: "period-5",
    label: "Period 5",
    startTime: "11:30",
    endTime: "12:15",
    type: "period",
  },
  {
    id: "period-6",
    label: "Period 6",
    startTime: "12:15",
    endTime: "13:00",
    type: "period",
  },
  {
    id: "break-2",
    label: "Lunch",
    startTime: "13:00",
    endTime: "13:30",
    type: "break",
  },
  {
    id: "period-7",
    label: "Period 7",
    startTime: "13:30",
    endTime: "14:15",
    type: "period",
  },
  {
    id: "period-8",
    label: "Period 8",
    startTime: "14:15",
    endTime: "15:00",
    type: "period",
  },
];

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [currentAcademicYearId, setCurrentAcademicYearId] =
    useState<string>("");

  // Settings-based configuration
  const [timeSlots, setTimeSlots] =
    useState<PeriodConfig[]>(DEFAULT_TIME_SLOTS);
  const [workingDays, setWorkingDays] = useState<string[]>(DEFAULT_DAYS);

  // Load timetable settings from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTimetableSettings = localStorage.getItem("timetableSettings");
      const savedAttendanceSettings =
        localStorage.getItem("attendanceSettings");

      if (savedTimetableSettings) {
        try {
          const settings: TimetableSettings = JSON.parse(
            savedTimetableSettings
          );
          if (settings.periods && settings.periods.length > 0) {
            setTimeSlots(settings.periods);
          }
        } catch (e) {
          console.error("Failed to parse timetable settings", e);
        }
      }

      if (savedAttendanceSettings) {
        try {
          const settings: AttendanceSettings = JSON.parse(
            savedAttendanceSettings
          );
          if (settings.workingDays && settings.workingDays.length > 0) {
            setWorkingDays(settings.workingDays);
          }
        } catch (e) {
          console.error("Failed to parse attendance settings", e);
        }
      }
    }
  }, []);

  const [formData, setFormData] = useState({
    dayOfWeek: "MONDAY",
    startTime: "08:00",
    endTime: "08:45",
    subjectId: "",
    teacherId: "",
    room: "",
  });

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];

  // Get subjects specific to the selected class
  const classSubjects = selectedClass?.subjects || [];

  const fetchClasses = async () => {
    try {
      setClassesLoading(true);
      const res = await fetch("/api/classes");
      const data = await res.json();
      if (res.ok) {
        setClasses(data.classes || []);
        if (data.classes?.length > 0 && !selectedClassId) {
          setSelectedClassId(data.classes[0].id);
          if (data.classes[0].sections?.length > 0) {
            setSelectedSectionId(data.classes[0].sections[0].id);
          }
        }
      } else {
        toast.error(data.error || "Failed to fetch classes");
      }
    } catch (error) {
      toast.error("Failed to fetch classes");
    } finally {
      setClassesLoading(false);
    }
  };

  const fetchSubjectsAndTeachers = async () => {
    try {
      const [subjectsRes, teachersRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/teachers?status=active&limit=100"),
      ]);

      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data.subjects || []);
      }

      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setTeachers(data.teachers || []);
      }
    } catch (error) {
      console.error("Failed to fetch subjects/teachers", error);
    }
  };

  const fetchCurrentAcademicYear = async () => {
    try {
      const res = await fetch("/api/academic-years?current=true");
      const data = await res.json();
      if (res.ok && data.data?.length > 0) {
        const currentYear =
          data.data.find((y: any) => y.isCurrent) || data.data[0];
        setCurrentAcademicYearId(currentYear.id);
      }
    } catch (error) {
      console.error("Failed to fetch academic year", error);
    }
  };

  const fetchTimetable = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        classId: selectedClassId,
        sectionId: selectedSectionId,
      });

      const res = await fetch(`/api/timetable?${params}`);
      const data = await res.json();

      if (res.ok) {
        // API returns grouped data by day, flatten it to a single array
        if (data.type === "grouped" && data.data) {
          const flattenedEntries: TimetableEntry[] = [];
          Object.values(data.data).forEach((dayEntries: unknown) => {
            if (Array.isArray(dayEntries)) {
              flattenedEntries.push(...(dayEntries as TimetableEntry[]));
            }
          });
          setTimetable(flattenedEntries);
        } else if (Array.isArray(data.data)) {
          setTimetable(data.data);
        } else {
          setTimetable([]);
        }
      } else {
        toast.error(data.error || "Failed to fetch timetable");
      }
    } catch (error) {
      toast.error("Failed to fetch timetable");
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSectionId]);

  useEffect(() => {
    fetchClasses();
    fetchSubjectsAndTeachers();
    fetchCurrentAcademicYear();
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedSectionId) {
      fetchTimetable();
    }
  }, [selectedClassId, selectedSectionId, fetchTimetable]);

  useEffect(() => {
    if (selectedClassId) {
      const cls = classes.find((c) => c.id === selectedClassId);
      if (cls?.sections?.length) {
        setSelectedSectionId(cls.sections[0].id);
      } else {
        setSelectedSectionId("");
      }
    }
  }, [selectedClassId, classes]);

  const handleOpenDialog = (
    day?: string,
    slot?: PeriodConfig,
    entry?: TimetableEntry
  ) => {
    if (entry) {
      setSelectedEntry(entry);
      setFormData({
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        subjectId: entry.subjectId,
        teacherId: entry.teacherId || "",
        room: entry.room || "",
      });
    } else {
      setSelectedEntry(null);
      setFormData({
        dayOfWeek: day || workingDays[0] || "MONDAY",
        startTime:
          slot?.startTime ||
          timeSlots.find((s) => s.type === "period")?.startTime ||
          "08:00",
        endTime:
          slot?.endTime ||
          timeSlots.find((s) => s.type === "period")?.endTime ||
          "08:45",
        subjectId: "",
        teacherId: "",
        room: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.subjectId) {
      toast.error("Please select a subject");
      return;
    }

    if (!formData.teacherId) {
      toast.error("Please select a teacher");
      return;
    }

    if (!currentAcademicYearId) {
      toast.error(
        "No active academic year found. Please configure one in Settings."
      );
      return;
    }

    // Calculate period number from time slot
    const periodSlots = timeSlots.filter((s) => s.type === "period");
    const periodNo =
      periodSlots.findIndex(
        (s) =>
          s.startTime === formData.startTime && s.endTime === formData.endTime
      ) + 1;

    if (periodNo === 0) {
      toast.error("Invalid time slot selected");
      return;
    }

    setSaving(true);
    try {
      const url = "/api/timetable";
      const method = selectedEntry ? "PUT" : "POST";

      const res = await fetch(
        selectedEntry ? `${url}?id=${selectedEntry.id}` : url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            classId: selectedClassId,
            sectionId: selectedSectionId,
            academicYearId: currentAcademicYearId,
            periodNo,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success(
          selectedEntry
            ? "Period updated successfully"
            : "Period added successfully"
        );
        setDialogOpen(false);
        setSelectedEntry(null);
        fetchTimetable();
      } else {
        toast.error(data.error || "Failed to save period");
      }
    } catch (error) {
      toast.error("Failed to save period");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/timetable?id=${selectedEntry.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Period deleted successfully");
        setDeleteDialogOpen(false);
        setSelectedEntry(null);
        fetchTimetable();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete period");
      }
    } catch (error) {
      toast.error("Failed to delete period");
    } finally {
      setSaving(false);
    }
  };

  const getEntryForSlot = (day: string, slot: PeriodConfig) => {
    return timetable.find((entry) => {
      // Normalize time strings for comparison (handle potential format differences)
      const entryStart = entry.startTime?.trim();
      const entryEnd = entry.endTime?.trim();
      const slotStart = slot.startTime?.trim();
      const slotEnd = slot.endTime?.trim();

      return (
        entry.dayOfWeek === day &&
        entryStart === slotStart &&
        entryEnd === slotEnd
      );
    });
  };

  const handleCopyTimetable = async () => {
    // Copy to another section - simplified for now
    toast.info("Copy timetable feature coming soon!");
  };

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
            Class Timetable
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchTimetable}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={handleCopyTimetable}
              disabled={timetable.length === 0}
            >
              Copy Timetable
            </Button>
          </Box>
        </Box>

        {/* Class/Section Selection */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Class</InputLabel>
                <Select
                  value={selectedClassId}
                  label="Class"
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={classesLoading}
                >
                  {classesLoading ? (
                    <MenuItem disabled>Loading classes...</MenuItem>
                  ) : classes.length === 0 ? (
                    <MenuItem disabled>No classes available</MenuItem>
                  ) : (
                    classes.map((cls) => (
                      <MenuItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Section</InputLabel>
                <Select
                  value={selectedSectionId}
                  label="Section"
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={sections.length === 0}
                >
                  {sections.map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      Section {section.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              {selectedClass && selectedSectionId && (
                <Typography variant="body2" color="text.secondary">
                  Viewing timetable for {selectedClass.name} - Section{" "}
                  {sections.find((s) => s.id === selectedSectionId)?.name}
                </Typography>
              )}
            </Grid>
          </Grid>
        </Paper>

        {/* Timetable Grid */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !selectedClassId || !selectedSectionId ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              Please select a class and section to view the timetable
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ overflow: "auto" }}>
            <Table size="small" sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "#ffffff",
                      width: 120,
                      borderBottom: "none",
                      background:
                        "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                    }}
                  >
                    Time
                  </TableCell>
                  {workingDays.map((day) => (
                    <TableCell
                      key={day}
                      align="center"
                      sx={{
                        fontWeight: 700,
                        color: "#ffffff",
                        borderBottom: "none",
                        background:
                          "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                      }}
                    >
                      {day.charAt(0) + day.slice(1).toLowerCase()}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {timeSlots.map((slot) => (
                  <TableRow
                    key={slot.startTime}
                    sx={{
                      bgcolor: slot.type === "break" ? "grey.100" : "inherit",
                    }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        borderRight: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {slot.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {slot.startTime} - {slot.endTime}
                      </Typography>
                    </TableCell>
                    {workingDays.map((day) => {
                      const entry = getEntryForSlot(day, slot);
                      const isBreak = slot.type === "break";

                      if (isBreak) {
                        return (
                          <TableCell
                            key={day}
                            align="center"
                            sx={{ bgcolor: "grey.200" }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              fontStyle="italic"
                            >
                              {slot.label}
                            </Typography>
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell
                          key={day}
                          align="center"
                          sx={{
                            cursor: "pointer",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                            p: 1,
                          }}
                          onClick={() =>
                            handleOpenDialog(day, slot, entry || undefined)
                          }
                        >
                          {entry ? (
                            <Card
                              variant="outlined"
                              sx={{
                                background:
                                  "linear-gradient(135deg, #5c6bc0 0%, #3f51b5 100%)",
                                borderColor: "#3f51b5",
                                borderRadius: 2,
                                boxShadow: "0 2px 8px rgba(63, 81, 181, 0.3)",
                              }}
                            >
                              <CardContent
                                sx={{
                                  py: 1,
                                  px: 1.5,
                                  "&:last-child": { pb: 1 },
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  sx={{ color: "#ffffff" }}
                                >
                                  {entry.subject.name}
                                </Typography>
                                {entry.teacher && (
                                  <Typography
                                    variant="caption"
                                    sx={{ color: "rgba(255,255,255,0.9)" }}
                                    display="block"
                                  >
                                    {entry.teacher.firstName}{" "}
                                    {entry.teacher.lastName}
                                  </Typography>
                                )}
                                {entry.room && (
                                  <Chip
                                    label={entry.room}
                                    size="small"
                                    sx={{
                                      mt: 0.5,
                                      height: 18,
                                      fontSize: 10,
                                      bgcolor: "rgba(255,255,255,0.2)",
                                      color: "#ffffff",
                                    }}
                                  />
                                )}
                              </CardContent>
                            </Card>
                          ) : (
                            <Box
                              sx={{
                                py: 2,
                                border: 1,
                                borderStyle: "dashed",
                                borderColor: "grey.300",
                                borderRadius: 1,
                              }}
                            >
                              <Add sx={{ color: "grey.400", fontSize: 20 }} />
                            </Box>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Legend */}
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Legend
          </Typography>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: "primary.light",
                  border: 1,
                  borderColor: "primary.main",
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="body2">Scheduled Period</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  border: 1,
                  borderStyle: "dashed",
                  borderColor: "grey.300",
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="body2">Empty Slot (click to add)</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: "grey.200",
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="body2">Break/Lunch</Typography>
            </Box>
          </Box>
        </Paper>

        {/* Add/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              {selectedEntry ? "Edit Period" : "Add Period"}
              <IconButton onClick={() => setDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Day</InputLabel>
                  <Select
                    value={formData.dayOfWeek}
                    label="Day"
                    onChange={(e) =>
                      setFormData({ ...formData, dayOfWeek: e.target.value })
                    }
                  >
                    {workingDays.map((day) => (
                      <MenuItem key={day} value={day}>
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Time Slot</InputLabel>
                  <Select
                    value={`${formData.startTime}-${formData.endTime}`}
                    label="Time Slot"
                    onChange={(e) => {
                      const [start, end] = e.target.value.split("-");
                      setFormData({
                        ...formData,
                        startTime: start,
                        endTime: end,
                      });
                    }}
                  >
                    {timeSlots
                      .filter((slot) => slot.type === "period")
                      .map((slot) => (
                        <MenuItem
                          key={slot.startTime}
                          value={`${slot.startTime}-${slot.endTime}`}
                        >
                          {slot.label} ({slot.startTime} - {slot.endTime})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    value={formData.subjectId}
                    label="Subject"
                    onChange={(e) =>
                      setFormData({ ...formData, subjectId: e.target.value })
                    }
                  >
                    {classSubjects.length > 0 ? (
                      classSubjects.map((subject) => (
                        <MenuItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>
                        No subjects assigned to this class
                      </MenuItem>
                    )}
                  </Select>
                  {classSubjects.length === 0 && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ mt: 0.5 }}
                    >
                      Please assign subjects to this class in the Classes page
                      first
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Teacher</InputLabel>
                  <Select
                    value={formData.teacherId}
                    label="Teacher"
                    onChange={(e) =>
                      setFormData({ ...formData, teacherId: e.target.value })
                    }
                  >
                    <MenuItem value="">Not Assigned</MenuItem>
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
                  label="Room"
                  value={formData.room}
                  onChange={(e) =>
                    setFormData({ ...formData, room: e.target.value })
                  }
                  placeholder="e.g., Room 101, Lab 1"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            {selectedEntry && (
              <Button
                color="error"
                onClick={() => {
                  setDialogOpen(false);
                  setDeleteDialogOpen(true);
                }}
              >
                Delete
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={24} /> : "Save"}
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
              Are you sure you want to delete this period? This action cannot be
              undone.
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
  );
}
