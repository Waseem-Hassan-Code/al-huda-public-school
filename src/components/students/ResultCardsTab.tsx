"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Stack,
  LinearProgress,
} from "@mui/material";
import {
  Edit,
  ExpandMore,
  Save,
  Close,
  Assessment,
  EmojiEvents,
  Warning,
  CheckCircle,
  Print,
} from "@mui/icons-material";
import { toast } from "sonner";

interface ExamMark {
  id: string;
  exam: {
    id: string;
    name: string;
    examDate: string;
    totalMarks: number;
    passingMarks: number;
  };
  subject: {
    id: string;
    name: string;
    code?: string;
  };
  marksObtained: number | null;
  totalMarks: number;
  isAbsent: boolean;
  remarks?: string;
  grade?: string;
}

interface ResultCard {
  examId: string;
  examName: string;
  examDate: string;
  subjects: {
    id: string;
    markId: string;
    name: string;
    code: string;
    marksObtained: number | null;
    totalMarks: number;
    passingMarks: number;
    isAbsent: boolean;
    isPassed: boolean;
    grade: string;
  }[];
  totalObtained: number;
  totalMaxMarks: number;
  totalPassingMarks: number;
  percentage: number;
  isPassed: boolean;
  grade: string;
  isComplete: boolean;
  subjectsEntered: number;
  totalSubjects: number;
}

interface ResultCardsTabProps {
  studentId: string;
  studentMarks: ExamMark[];
  onRefresh: () => void;
}

// Grade calculation based on percentage
const getGrade = (percentage: number): string => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "F";
};

// Grade color
const getGradeColor = (
  grade: string
): "success" | "warning" | "error" | "info" | "default" => {
  if (["A+", "A"].includes(grade)) return "success";
  if (["B", "C"].includes(grade)) return "info";
  if (["D", "E"].includes(grade)) return "warning";
  return "error";
};

export default function ResultCardsTab({
  studentId,
  studentMarks,
  onRefresh,
}: ResultCardsTabProps) {
  const [resultCards, setResultCards] = useState<ResultCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMark, setEditingMark] = useState<{
    markId: string;
    subjectName: string;
    marksObtained: string;
    totalMarks: number;
    isAbsent: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch result cards from API
  const fetchResultCards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}/result-card`);
      if (!res.ok) throw new Error("Failed to fetch result cards");
      const data = await res.json();

      // Transform API response to ResultCard format
      const results = data.results || [];
      const transformed: ResultCard[] = results.map((result: any) => ({
        examId: result.exam.id,
        examName: result.exam.name,
        examDate: result.exam.examDate,
        subjects: result.subjects.map((sub: any) => ({
          id: sub.id,
          markId: sub.id, // Use subject id as markId for now
          name: sub.name,
          code: sub.code || "",
          marksObtained: sub.marksObtained,
          totalMarks: sub.totalMarks,
          passingMarks: result.exam.passingMarks || 33,
          isAbsent: sub.isAbsent,
          isPassed: sub.isPassed,
          grade: getGrade(
            sub.marksObtained !== null && sub.totalMarks > 0
              ? (sub.marksObtained / sub.totalMarks) * 100
              : 0
          ),
        })),
        totalObtained: result.summary.obtainedMarks,
        totalMaxMarks: result.summary.totalMarks,
        totalPassingMarks:
          result.exam.passingMarks * (result.subjects.length || 1),
        percentage: result.summary.percentage,
        isPassed: result.status.isPassed,
        grade: result.summary.grade,
        isComplete: result.status.isComplete,
        subjectsEntered: result.status.marksEntered,
        totalSubjects: result.status.totalSubjects,
      }));

      setResultCards(transformed);
    } catch (error) {
      console.error("Error fetching result cards:", error);
      // Fall back to processing studentMarks locally
      processMarksLocally();
    } finally {
      setLoading(false);
    }
  };

  // Process marks locally (fallback if API fails)
  const processMarksLocally = () => {
    const examMap = new Map<string, ResultCard>();

    studentMarks.forEach((mark) => {
      const examId = mark.exam.id;

      if (!examMap.has(examId)) {
        examMap.set(examId, {
          examId,
          examName: mark.exam.name,
          examDate: mark.exam.examDate,
          subjects: [],
          totalObtained: 0,
          totalMaxMarks: 0,
          totalPassingMarks: 0,
          percentage: 0,
          isPassed: false,
          grade: "N/A",
          isComplete: true,
          subjectsEntered: 0,
          totalSubjects: 0,
        });
      }

      const card = examMap.get(examId)!;
      const isPassed =
        mark.marksObtained !== null &&
        mark.marksObtained >= mark.exam.passingMarks;
      const percentage =
        mark.marksObtained !== null
          ? (mark.marksObtained / mark.totalMarks) * 100
          : 0;

      card.subjects.push({
        id: mark.subject.id,
        markId: mark.id,
        name: mark.subject.name,
        code: mark.subject.code || "",
        marksObtained: mark.marksObtained,
        totalMarks: mark.totalMarks,
        passingMarks: mark.exam.passingMarks,
        isAbsent: mark.isAbsent,
        isPassed,
        grade: getGrade(percentage),
      });

      if (mark.marksObtained !== null) {
        card.totalObtained += mark.marksObtained;
        card.subjectsEntered++;
      } else {
        card.isComplete = false;
      }
      card.totalMaxMarks += mark.totalMarks;
      card.totalPassingMarks += mark.exam.passingMarks;
      card.totalSubjects++;
    });

    // Calculate final stats for each card
    examMap.forEach((card) => {
      card.percentage =
        card.totalMaxMarks > 0
          ? (card.totalObtained / card.totalMaxMarks) * 100
          : 0;
      card.isPassed = card.subjects.every(
        (s) => s.isPassed || s.marksObtained === null
      );
      card.grade = getGrade(card.percentage);
    });

    setResultCards(Array.from(examMap.values()));
  };

  useEffect(() => {
    if (studentMarks.length > 0) {
      fetchResultCards();
    } else {
      setResultCards([]);
    }
  }, [studentId, studentMarks]);

  // Handle edit mark dialog
  const handleEditMark = (mark: ResultCard["subjects"][0]) => {
    setEditingMark({
      markId: mark.markId,
      subjectName: mark.name,
      marksObtained: mark.marksObtained?.toString() || "",
      totalMarks: mark.totalMarks,
      isAbsent: mark.isAbsent,
    });
    setEditDialogOpen(true);
  };

  // Save edited mark
  const handleSaveMark = async () => {
    if (!editingMark) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/student-marks/${editingMark.markId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marksObtained: editingMark.isAbsent
            ? null
            : parseFloat(editingMark.marksObtained),
          isAbsent: editingMark.isAbsent,
        }),
      });

      if (!res.ok) throw new Error("Failed to update marks");

      toast.success("Marks updated successfully");
      setEditDialogOpen(false);
      setEditingMark(null);
      onRefresh(); // Refresh parent data
    } catch (error) {
      toast.error("Failed to update marks");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (resultCards.length === 0) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ textAlign: "center", py: 5 }}>
          <Assessment sx={{ fontSize: 60, color: "grey.400", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No exam results found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Results will appear here once marks are entered
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: "#e3f2fd", borderRadius: 2 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Total Exams
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {resultCards.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: "#e8f5e9", borderRadius: 2 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Passed Exams
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {resultCards.filter((r) => r.isComplete && r.isPassed).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: "#fff3e0", borderRadius: 2 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                In Progress
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {resultCards.filter((r) => !r.isComplete).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: "#f3e5f5", borderRadius: 2 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Average Grade
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="secondary.main">
                {resultCards.length > 0
                  ? getGrade(
                      resultCards
                        .filter((r) => r.isComplete)
                        .reduce((sum, r) => sum + r.percentage, 0) /
                        (resultCards.filter((r) => r.isComplete).length || 1)
                    )
                  : "N/A"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Result Cards */}
      {resultCards.map((card) => (
        <Accordion
          key={card.examId}
          defaultExpanded={!card.isComplete}
          sx={{
            mb: 2,
            borderRadius: 2,
            "&:before": { display: "none" },
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{
              bgcolor: card.isComplete
                ? card.isPassed
                  ? "#e8f5e9"
                  : "#ffebee"
                : "#fff3e0",
              borderRadius: "8px 8px 0 0",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                width: "100%",
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6" fontWeight="bold">
                    {card.examName}
                  </Typography>
                  {!card.isComplete && (
                    <Chip
                      label="In Progress"
                      size="small"
                      color="warning"
                      icon={<Warning sx={{ fontSize: 16 }} />}
                    />
                  )}
                  {card.isComplete && card.isPassed && (
                    <Chip
                      label="Passed"
                      size="small"
                      color="success"
                      icon={<CheckCircle sx={{ fontSize: 16 }} />}
                    />
                  )}
                  {card.isComplete && !card.isPassed && (
                    <Chip label="Failed" size="small" color="error" />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(card.examDate)} • {card.subjectsEntered}/
                  {card.totalSubjects} subjects entered
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right", mr: 2 }}>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  color={card.isPassed ? "success.main" : "error.main"}
                >
                  {card.percentage.toFixed(1)}%
                </Typography>
                <Chip
                  label={`Grade: ${card.grade}`}
                  size="small"
                  color={getGradeColor(card.grade)}
                />
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {!card.isComplete && (
              <Alert severity="info" sx={{ borderRadius: 0 }}>
                <strong>Result card is being updated.</strong>{" "}
                {card.totalSubjects - card.subjectsEntered} subject(s) marks are
                still pending.
                <LinearProgress
                  variant="determinate"
                  value={(card.subjectsEntered / card.totalSubjects) * 100}
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </Alert>
            )}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      Marks Obtained
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      Total Marks
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      Passing
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      Grade
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {card.subjects.map((subject) => (
                    <TableRow key={subject.id} hover>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {subject.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {subject.code}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {subject.isAbsent ? (
                          <Chip
                            label="Absent"
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ) : subject.marksObtained !== null ? (
                          <Typography
                            fontWeight="bold"
                            color={
                              subject.isPassed ? "success.main" : "error.main"
                            }
                          >
                            {subject.marksObtained}
                          </Typography>
                        ) : (
                          <Chip
                            label="Pending"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">{subject.totalMarks}</TableCell>
                      <TableCell align="center">
                        {subject.passingMarks}
                      </TableCell>
                      <TableCell align="center">
                        {subject.marksObtained !== null ? (
                          subject.isPassed ? (
                            <CheckCircle color="success" fontSize="small" />
                          ) : (
                            <Close color="error" fontSize="small" />
                          )
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {subject.marksObtained !== null ? (
                          <Chip
                            label={subject.grade}
                            size="small"
                            color={getGradeColor(subject.grade)}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit Marks">
                          <IconButton
                            size="small"
                            onClick={() => handleEditMark(subject)}
                            color="primary"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary Row */}
            <Box
              sx={{
                p: 2,
                bgcolor: "grey.50",
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 8 }}>
                  <Stack direction="row" spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Obtained
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {card.totalObtained}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Maximum Marks
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {card.totalMaxMarks}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Percentage
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color={card.isPassed ? "success.main" : "error.main"}
                      >
                        {card.percentage.toFixed(2)}%
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Overall Grade
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {card.grade}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: "right" }}>
                  {card.isComplete && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Print />}
                      onClick={() => {
                        // TODO: Print result card
                        toast.info("Print functionality coming soon");
                      }}
                    >
                      Print Result Card
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Edit Marks Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Edit Marks - {editingMark?.subjectName}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Marks Obtained"
              type="number"
              value={editingMark?.marksObtained || ""}
              onChange={(e) =>
                setEditingMark((prev) =>
                  prev
                    ? {
                        ...prev,
                        marksObtained: e.target.value,
                        isAbsent: false,
                      }
                    : null
                )
              }
              disabled={editingMark?.isAbsent}
              inputProps={{ min: 0, max: editingMark?.totalMarks }}
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary">
              Maximum: {editingMark?.totalMarks}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant={editingMark?.isAbsent ? "contained" : "outlined"}
                color="error"
                size="small"
                onClick={() =>
                  setEditingMark((prev) =>
                    prev
                      ? { ...prev, isAbsent: !prev.isAbsent, marksObtained: "" }
                      : null
                  )
                }
              >
                {editingMark?.isAbsent ? "Marked as Absent" : "Mark as Absent"}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveMark}
            disabled={
              saving || (!editingMark?.isAbsent && !editingMark?.marksObtained)
            }
            startIcon={saving ? <CircularProgress size={16} /> : <Save />}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
