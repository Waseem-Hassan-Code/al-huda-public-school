"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import SimpleTable, { SimpleColumn } from "@/components/common/SimpleTable";
import { debounce } from "@/lib/utils";
import { toast } from "sonner";

interface Subject {
  id: string;
  code: string;
  name: string;
  nameUrdu?: string;
  description?: string;
  isActive: boolean;
  classes: { id: string; name: string }[];
  teachers: { id: string; firstName: string; lastName: string }[];
}

export default function SubjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nameUrdu: "",
    description: "",
    isActive: true,
  });

  const fetchSubjects = useCallback(async (searchQuery = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/subjects?${params}`);
      const data = await response.json();
      if (response.ok) {
        setSubjects(data.subjects || []);
      } else {
        toast.error(data.error || "Failed to fetch subjects");
      }
    } catch (error) {
      toast.error("Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSubjects();
    }
  }, [status, fetchSubjects]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      fetchSubjects(value);
    }, 300),
    [fetchSubjects]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleOpenDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        code: subject.code,
        name: subject.name,
        nameUrdu: subject.nameUrdu || "",
        description: subject.description || "",
        isActive: subject.isActive,
      });
    } else {
      setEditingSubject(null);
      setFormData({
        code: "",
        name: "",
        nameUrdu: "",
        description: "",
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSubject(null);
  };

  const handleSubmit = async () => {
    try {
      const url = editingSubject
        ? `/api/subjects?id=${editingSubject.id}`
        : "/api/subjects";
      const method = editingSubject ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(
          editingSubject
            ? "Subject updated successfully"
            : "Subject created successfully"
        );
        handleCloseDialog();
        fetchSubjects(search);
      } else {
        toast.error(data.error || "Failed to save subject");
      }
    } catch (error) {
      toast.error("Failed to save subject");
    }
  };

  const handleDelete = async (subject: Subject) => {
    if (!confirm(`Are you sure you want to delete ${subject.name}?`)) return;

    try {
      const response = await fetch(`/api/subjects?id=${subject.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Subject deleted successfully");
        fetchSubjects(search);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete subject");
      }
    } catch (error) {
      toast.error("Failed to delete subject");
    }
  };

  const columns: SimpleColumn[] = [
    { id: "code", label: "Code", width: 100 },
    { id: "name", label: "Name (English)" },
    { id: "nameUrdu", label: "Name (Urdu)" },
    {
      id: "classes",
      label: "Classes",
      render: (row: Subject) => (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {row.classes?.slice(0, 3).map((cls) => (
            <Chip key={cls.id} label={cls.name} size="small" />
          ))}
          {row.classes?.length > 3 && (
            <Chip label={`+${row.classes.length - 3}`} size="small" />
          )}
        </Box>
      ),
    },
    {
      id: "isActive",
      label: "Status",
      render: (row: Subject) => (
        <Chip
          label={row.isActive ? "Active" : "Inactive"}
          color={row.isActive ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      id: "actions",
      label: "Actions",
      width: 120,
      render: (row: Subject) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpenDialog(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(row)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

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
            Subjects Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Subject
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search subjects..."
            value={search}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        <Paper sx={{ p: 2 }}>
          <SimpleTable
            columns={columns}
            rows={subjects}
            loading={loading}
            emptyMessage="No subjects found"
          />
        </Paper>

        {/* Add/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingSubject ? "Edit Subject" : "Add New Subject"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Subject Code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., ENG, MATH"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Name (English)"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Name (Urdu)"
                  value={formData.nameUrdu}
                  onChange={(e) =>
                    setFormData({ ...formData, nameUrdu: e.target.value })
                  }
                  dir="rtl"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                    />
                  }
                  label="Active"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {editingSubject ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
