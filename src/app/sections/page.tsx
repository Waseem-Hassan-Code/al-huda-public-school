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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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

interface Section {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
  class: { id: string; name: string };
  classTeacher?: { id: string; firstName: string; lastName: string };
  _count?: { students: number };
}

interface Class {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

export default function SectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    classId: "",
    classTeacherId: "",
    capacity: 40,
    isActive: true,
  });

  const fetchSections = useCallback(async (searchQuery = "", classId = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (classId) params.append("classId", classId);

      const response = await fetch(`/api/sections?${params}`);
      const data = await response.json();
      if (response.ok) {
        setSections(data.sections || []);
      } else {
        toast.error(data.error || "Failed to fetch sections");
      }
    } catch (error) {
      toast.error("Failed to fetch sections");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch("/api/classes?limit=100");
      const data = await response.json();
      if (response.ok) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const response = await fetch("/api/teachers?limit=100");
      const data = await response.json();
      if (response.ok) {
        setTeachers(data.teachers || []);
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSections();
      fetchClasses();
      fetchTeachers();
    }
  }, [status, fetchSections, fetchClasses, fetchTeachers]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      fetchSections(value, filterClass);
    }, 300),
    [fetchSections, filterClass]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleClassFilterChange = (classId: string) => {
    setFilterClass(classId);
    fetchSections(search, classId);
  };

  const handleOpenDialog = (section?: Section) => {
    if (section) {
      setEditingSection(section);
      setFormData({
        name: section.name,
        classId: section.class.id,
        classTeacherId: section.classTeacher?.id || "",
        capacity: section.capacity,
        isActive: section.isActive,
      });
    } else {
      setEditingSection(null);
      setFormData({
        name: "",
        classId: "",
        classTeacherId: "",
        capacity: 40,
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSection(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.classId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const url = editingSection
        ? `/api/sections?id=${editingSection.id}`
        : "/api/sections";
      const method = editingSection ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(
          editingSection
            ? "Section updated successfully"
            : "Section created successfully"
        );
        handleCloseDialog();
        fetchSections(search, filterClass);
      } else {
        toast.error(data.error || "Failed to save section");
      }
    } catch (error) {
      toast.error("Failed to save section");
    }
  };

  const handleDelete = async (section: Section) => {
    if (!confirm(`Are you sure you want to delete ${section.name}?`)) return;

    try {
      const response = await fetch(`/api/sections?id=${section.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Section deleted successfully");
        fetchSections(search, filterClass);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete section");
      }
    } catch (error) {
      toast.error("Failed to delete section");
    }
  };

  const columns: SimpleColumn[] = [
    { id: "name", label: "Section Name", width: 120 },
    {
      id: "class",
      label: "Class",
      render: (row: Section) => row.class?.name || "-",
    },
    {
      id: "classTeacher",
      label: "Class Teacher",
      render: (row: Section) =>
        row.classTeacher
          ? `${row.classTeacher.firstName} ${row.classTeacher.lastName}`
          : "-",
    },
    { id: "capacity", label: "Capacity", width: 100 },
    {
      id: "students",
      label: "Students",
      width: 100,
      render: (row: Section) => row._count?.students || 0,
    },
    {
      id: "isActive",
      label: "Status",
      width: 100,
      render: (row: Section) => (
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
      render: (row: Section) => (
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
            Sections Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Section
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                placeholder="Search sections..."
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
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Filter by Class</InputLabel>
                <Select
                  value={filterClass}
                  label="Filter by Class"
                  onChange={(e) => handleClassFilterChange(e.target.value)}
                >
                  <MenuItem value="">All Classes</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <SimpleTable
            columns={columns}
            rows={sections}
            loading={loading}
            emptyMessage="No sections found"
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
            {editingSection ? "Edit Section" : "Add New Section"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Section Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., A, B, Blue, Red"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={formData.classId}
                    label="Class"
                    onChange={(e) =>
                      setFormData({ ...formData, classId: e.target.value })
                    }
                  >
                    {classes.map((cls) => (
                      <MenuItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Class Teacher</InputLabel>
                  <Select
                    value={formData.classTeacherId}
                    label="Class Teacher"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        classTeacherId: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="">None</MenuItem>
                    {teachers.map((teacher) => (
                      <MenuItem key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Capacity"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {editingSection ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
