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
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  Snackbar,
} from "@mui/material";
import {
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Group as GroupIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
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

interface ResultCard {
  id: string;
  examId: string;
  examName: string;
  examType: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  academicYear: string;
  totalStudents: number;
  generatedAt: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress?: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  isOptional: boolean;
}

export default function ResultCardsPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [resultCards, setResultCards] = useState<ResultCard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    name: "",
    type: "mid_term",
    totalMarks: 100,
    passingMarks: 33,
  });

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

  // Fetch result cards when class/section changes
  const fetchResultCards = useCallback(async () => {
    if (!selectedClassId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ classId: selectedClassId });
      if (selectedSectionId) params.append("sectionId", selectedSectionId);

      const response = await fetch(`/api/result-cards?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResultCards(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching result cards:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSectionId]);

  useEffect(() => {
    fetchResultCards();
  }, [fetchResultCards]);

  // Fetch subjects when class/section changes
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedClassId) return;

      try {
        const params = new URLSearchParams({ classId: selectedClassId });
        if (selectedSectionId) params.append("sectionId", selectedSectionId);

        const response = await fetch(`/api/class-subjects?${params}`);
        if (response.ok) {
          const data = await response.json();
          // Transform the data to get subject info
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

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];

  const handleGenerateResultCard = async () => {
    if (!selectedClassId || subjects.length === 0) {
      setError("Please select a class and ensure subjects are assigned");
      return;
    }

    setGeneratingCard(true);
    setError(null);

    try {
      const response = await fetch("/api/result-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          sectionId: selectedSectionId || undefined,
          examName: examForm.name,
          examType: examForm.type,
          subjects: subjects.map((s) => ({
            subjectId: s.id,
            totalMarks: examForm.totalMarks,
            passingMarks: examForm.passingMarks,
          })),
        }),
      });

      if (response.ok) {
        setSuccess("Result card generation initiated successfully!");
        setDialogOpen(false);
        setExamForm({
          name: "",
          type: "mid_term",
          totalMarks: 100,
          passingMarks: 33,
        });
        fetchResultCards();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate result card");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate result card"
      );
    } finally {
      setGeneratingCard(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "warning";
      case "pending":
        return "info";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon fontSize="small" />;
      case "in_progress":
        return <CircularProgress size={16} />;
      case "pending":
        return <AssignmentIcon fontSize="small" />;
      case "failed":
        return <WarningIcon fontSize="small" />;
      default:
        return undefined;
    }
  };

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
            Result Cards Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate and manage student result cards for examinations
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
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Class</InputLabel>
                <Select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId("");
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

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small" disabled={!selectedClassId}>
                <InputLabel>Select Section (Optional)</InputLabel>
                <Select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  label="Select Section (Optional)"
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

            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  disabled={!selectedClassId}
                  onClick={() => setDialogOpen(true)}
                  sx={{
                    background: "linear-gradient(45deg, #1a237e, #283593)",
                    "&:hover": {
                      background: "linear-gradient(45deg, #0d1642, #1a237e)",
                    },
                  }}
                >
                  Generate Result Card
                </Button>
                <IconButton
                  onClick={fetchResultCards}
                  disabled={!selectedClassId}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Info Cards */}
        {selectedClassId && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <SchoolIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Selected Class
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {selectedClass?.name || "N/A"}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  background:
                    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  color: "white",
                }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <GroupIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Section
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {selectedSectionId
                          ? sections.find((s) => s.id === selectedSectionId)
                              ?.name
                          : "All Sections"}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  background:
                    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  color: "white",
                }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <AssignmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Subjects Assigned
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {subjects.length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Result Cards Table */}
        <Paper
          elevation={0}
          sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}
        >
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6" fontWeight="bold">
              Result Cards
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : resultCards.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <AssignmentIcon
                sx={{ fontSize: 60, color: "text.disabled", mb: 2 }}
              />
              <Typography color="text.secondary">
                {selectedClassId
                  ? "No result cards found. Generate one to get started."
                  : "Select a class to view result cards."}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "rgba(26, 35, 126, 0.05)" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>Exam Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Class</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Section</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Students</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Generated</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resultCards.map((card) => (
                    <TableRow key={card.id} hover>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {card.examName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={card.examType.replace("_", " ").toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: "rgba(26, 35, 126, 0.1)",
                            color: "#1a237e",
                          }}
                        />
                      </TableCell>
                      <TableCell>{card.className}</TableCell>
                      <TableCell>{card.sectionName || "All"}</TableCell>
                      <TableCell>{card.totalStudents}</TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(card.status)}
                          label={card.status.replace("_", " ")}
                          size="small"
                          color={getStatusColor(card.status) as any}
                        />
                        {card.status === "in_progress" && card.progress && (
                          <Box sx={{ mt: 1, width: "100%" }}>
                            <LinearProgress
                              variant="determinate"
                              value={card.progress}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(card.generatedAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary">
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download PDF">
                            <IconButton
                              size="small"
                              color="success"
                              disabled={card.status !== "completed"}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Print">
                            <IconButton
                              size="small"
                              disabled={card.status !== "completed"}
                            >
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Generate Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle
            sx={{
              background: "linear-gradient(45deg, #1a237e, #283593)",
              color: "white",
            }}
          >
            Generate Result Card
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  This will create result cards for all students in{" "}
                  {selectedClass?.name}
                  {selectedSectionId &&
                    ` - Section ${
                      sections.find((s) => s.id === selectedSectionId)?.name
                    }`}
                </Alert>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Exam Name"
                  value={examForm.name}
                  onChange={(e) =>
                    setExamForm({ ...examForm, name: e.target.value })
                  }
                  placeholder="e.g., First Term Examination 2025"
                  required
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Exam Type</InputLabel>
                  <Select
                    value={examForm.type}
                    onChange={(e) =>
                      setExamForm({ ...examForm, type: e.target.value })
                    }
                    label="Exam Type"
                  >
                    <MenuItem value="mid_term">Mid Term</MenuItem>
                    <MenuItem value="final">Final</MenuItem>
                    <MenuItem value="monthly">Monthly Test</MenuItem>
                    <MenuItem value="weekly">Weekly Test</MenuItem>
                    <MenuItem value="unit_test">Unit Test</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Marks (per subject)"
                  value={examForm.totalMarks}
                  onChange={(e) =>
                    setExamForm({
                      ...examForm,
                      totalMarks: Number(e.target.value),
                    })
                  }
                />
              </Grid>

              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Passing Marks"
                  value={examForm.passingMarks}
                  onChange={(e) =>
                    setExamForm({
                      ...examForm,
                      passingMarks: Number(e.target.value),
                    })
                  }
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Subjects to include ({subjects.length}):
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {subjects.map((subject) => (
                    <Chip
                      key={subject.id}
                      label={`${subject.name}${
                        subject.isOptional ? " (Optional)" : ""
                      }`}
                      size="small"
                      color={subject.isOptional ? "warning" : "primary"}
                      variant="outlined"
                    />
                  ))}
                </Box>
                {subjects.length === 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    No subjects assigned to this class/section. Please assign
                    subjects first.
                  </Alert>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleGenerateResultCard}
              disabled={
                generatingCard || !examForm.name || subjects.length === 0
              }
              startIcon={
                generatingCard ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <AssignmentIcon />
                )
              }
              sx={{
                background: "linear-gradient(45deg, #1a237e, #283593)",
                "&:hover": {
                  background: "linear-gradient(45deg, #0d1642, #1a237e)",
                },
              }}
            >
              {generatingCard ? "Generating..." : "Generate"}
            </Button>
          </DialogActions>
        </Dialog>

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
