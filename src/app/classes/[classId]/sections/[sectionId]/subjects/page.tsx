"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  Delete,
  Save,
  MenuBook,
  School,
  Edit,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ClassSubject {
  id: string;
  subjectId: string;
  classId: string;
  sectionId: string | null;
  isOptional: boolean;
  totalMarks: number;
  passingMarks: number;
  subject: Subject;
}

interface SectionData {
  id: string;
  name: string;
  classId: string;
  class: {
    id: string;
    name: string;
  };
}

export default function SectionSubjectsPage({
  params,
}: {
  params: Promise<{ classId: string; sectionId: string }>;
}) {
  const { classId, sectionId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<SectionData | null>(null);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<ClassSubject | null>(
    null
  );
  const [formData, setFormData] = useState({
    subjectId: "",
    totalMarks: 100,
    passingMarks: 33,
    isOptional: false,
  });

  useEffect(() => {
    fetchData();
  }, [classId, sectionId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch section details
      const sectionRes = await fetch(`/api/sections/${sectionId}`);
      if (sectionRes.ok) {
        const sectionData = await sectionRes.json();
        setSection(sectionData);
      }

      // Fetch class subjects for this section
      const subjectsRes = await fetch(
        `/api/class-subjects?classId=${classId}&sectionId=${sectionId}`
      );
      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setClassSubjects(data.data || []);
      }

      // Fetch all available subjects
      const allSubjectsRes = await fetch("/api/subjects");
      if (allSubjectsRes.ok) {
        const data = await allSubjectsRes.json();
        setAllSubjects(data.subjects || data.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (subject?: ClassSubject) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        subjectId: subject.subjectId,
        totalMarks: subject.totalMarks,
        passingMarks: subject.passingMarks,
        isOptional: subject.isOptional,
      });
    } else {
      setEditingSubject(null);
      setFormData({
        subjectId: "",
        totalMarks: 100,
        passingMarks: 33,
        isOptional: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSaveSubject = async () => {
    if (!formData.subjectId) {
      toast.error("Please select a subject");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/class-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          sectionId,
          subjects: [
            {
              subjectId: formData.subjectId,
              totalMarks: formData.totalMarks,
              passingMarks: formData.passingMarks,
              isOptional: formData.isOptional,
            },
          ],
        }),
      });

      if (res.ok) {
        toast.success("Subject added successfully");
        setDialogOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add subject");
      }
    } catch (error) {
      toast.error("Failed to add subject");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (id: string) => {
    if (!confirm("Are you sure you want to remove this subject?")) return;

    try {
      const res = await fetch(`/api/class-subjects?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Subject removed successfully");
        fetchData();
      } else {
        toast.error("Failed to remove subject");
      }
    } catch (error) {
      toast.error("Failed to remove subject");
    }
  };

  // Filter out already assigned subjects
  const availableSubjects = allSubjects.filter(
    (s) => !classSubjects.some((cs) => cs.subjectId === s.id)
  );

  if (loading) {
    return (
      <MainLayout>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "60vh",
          }}
        >
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            href="/classes"
            color="inherit"
            sx={{
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Classes
          </Link>
          <Typography color="text.primary">
            {section?.class?.name} - Section {section?.name}
          </Typography>
          <Typography color="text.primary">Subjects</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
            color: "white",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton
              onClick={() => router.push("/classes")}
              sx={{ color: "white" }}
            >
              <ArrowBack />
            </IconButton>
            <MenuBook sx={{ fontSize: 40 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight="bold">
                Manage Subjects for {section?.class?.name} - Section{" "}
                {section?.name}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Assign subjects with specific marks configuration for this
                section
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              Add Subject
            </Button>
          </Box>
        </Paper>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          Subjects assigned here are specific to this section. You can have
          different subjects for different sections (e.g., Computer Science for
          Section A, Biology for Section B).
        </Alert>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary">
                  {classSubjects.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Subjects
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="success.main">
                  {classSubjects.filter((s) => !s.isOptional).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Compulsory Subjects
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="warning.main">
                  {classSubjects.filter((s) => s.isOptional).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Optional Subjects
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Subjects Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  background:
                    "linear-gradient(135deg, #1a237e 0%, #283593 100%)",
                }}
              >
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Subject
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Code
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: "white", fontWeight: "bold" }}
                >
                  Total Marks
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: "white", fontWeight: "bold" }}
                >
                  Passing Marks
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: "white", fontWeight: "bold" }}
                >
                  Type
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: "white", fontWeight: "bold" }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classSubjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No subjects assigned to this section yet
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => handleOpenDialog()}
                      sx={{ mt: 2 }}
                    >
                      Add First Subject
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                classSubjects.map((cs) => (
                  <TableRow key={cs.id} hover>
                    <TableCell>
                      <Typography fontWeight="medium">
                        {cs.subject.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={cs.subject.code} size="small" />
                    </TableCell>
                    <TableCell align="center">{cs.totalMarks}</TableCell>
                    <TableCell align="center">{cs.passingMarks}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={cs.isOptional ? "Optional" : "Compulsory"}
                        color={cs.isOptional ? "warning" : "success"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(cs)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveSubject(cs.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Subject Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingSubject ? "Edit Subject" : "Add Subject to Section"}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    value={formData.subjectId}
                    label="Subject"
                    onChange={(e) =>
                      setFormData({ ...formData, subjectId: e.target.value })
                    }
                    disabled={!!editingSubject}
                  >
                    {(editingSubject ? allSubjects : availableSubjects).map(
                      (subject) => (
                        <MenuItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Marks"
                  value={formData.totalMarks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalMarks: parseInt(e.target.value) || 100,
                    })
                  }
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Passing Marks"
                  value={formData.passingMarks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passingMarks: parseInt(e.target.value) || 33,
                    })
                  }
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isOptional}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isOptional: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Optional Subject"
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Optional subjects are not mandatory for all students
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveSubject}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
