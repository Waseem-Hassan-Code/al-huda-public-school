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
  Avatar,
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
  Autocomplete,
  Divider,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Phone,
  Email,
  Person,
  School,
  FilterList,
  Refresh,
  Close,
  Visibility,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import ImageUpload from "@/components/common/ImageUpload";
import {
  formatDate,
  maskCNIC,
  maskPhone,
  isValidCNIC,
  isValidEmail,
} from "@/lib/utils";
import { toast } from "sonner";

// Interface for class-subject assignment
interface ClassSubjectAssignment {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cnic: string;
  gender: string;
  dateOfBirth: string;
  joiningDate: string;
  qualification: string;
  specialization: string | null;
  address: string;
  basicSalary: number;
  isActive: boolean;
  photo?: string | null;
  subjects: {
    id: string;
    subject: { id: string; name: string; code: string };
    classId?: string;
    class?: { id: string; name: string } | null;
  }[];
  classes: { id: string; name: string }[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Class {
  id: string;
  name: string;
  displayOrder?: number;
  subjects?: { id: string; subjectId: string; subject: Subject }[];
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [saving, setSaving] = useState(false);
  const [classSubjectAssignments, setClassSubjectAssignments] = useState<
    ClassSubjectAssignment[]
  >([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [availableSubjectsForClass, setAvailableSubjectsForClass] = useState<
    Subject[]
  >([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    cnic: "",
    gender: "MALE",
    dateOfBirth: "",
    joiningDate: new Date().toISOString().split("T")[0],
    qualification: "",
    specialization: "",
    address: "",
    basicSalary: 0,
    photo: "",
  });

  // Get available subjects for selected class
  const getSubjectsForClass = useCallback((cls: Class | null): Subject[] => {
    if (!cls || !cls.subjects) return [];
    return cls.subjects.map((cs) => cs.subject);
  }, []);

  // Update available subjects when class changes
  useEffect(() => {
    if (selectedClass) {
      setAvailableSubjectsForClass(getSubjectsForClass(selectedClass));
    } else {
      setAvailableSubjectsForClass([]);
    }
  }, [selectedClass, getSubjectsForClass]);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const res = await fetch(`/api/teachers?${params}`);
      const data = await res.json();

      if (res.ok) {
        setTeachers(data.teachers);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error(data.error || "Failed to fetch teachers");
      }
    } catch (error) {
      toast.error("Failed to fetch teachers");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const fetchSubjectsAndClasses = async () => {
    try {
      const [subjectsRes, classesRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/classes"),
      ]);

      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData.subjects || []);
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch subjects/classes", error);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  useEffect(() => {
    fetchSubjectsAndClasses();
  }, []);

  const handleOpenDialog = (teacher?: Teacher) => {
    if (teacher) {
      setSelectedTeacher(teacher);
      setFormData({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: teacher.phone,
        cnic: teacher.cnic,
        gender: teacher.gender,
        dateOfBirth: teacher.dateOfBirth?.split("T")[0] || "",
        joiningDate: teacher.joiningDate?.split("T")[0] || "",
        qualification: teacher.qualification,
        specialization: teacher.specialization || "",
        address: teacher.address,
        basicSalary: teacher.basicSalary || 0,
        photo: teacher.photo || "",
      });
      // Extract class-subject assignments from teacher data
      const assignments: ClassSubjectAssignment[] = [];
      if (teacher.subjects) {
        teacher.subjects.forEach((ts) => {
          if (ts.classId && ts.subject) {
            // Use included class data or fall back to looking up in classes list
            const className =
              ts.class?.name ||
              classes.find((c) => c.id === ts.classId)?.name ||
              "Unknown Class";
            assignments.push({
              classId: ts.classId,
              className,
              subjectId: ts.subject.id,
              subjectName: ts.subject.name,
            });
          }
        });
      }
      setClassSubjectAssignments(assignments);
    } else {
      setSelectedTeacher(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        cnic: "",
        gender: "MALE",
        dateOfBirth: "",
        joiningDate: new Date().toISOString().split("T")[0],
        qualification: "",
        specialization: "",
        address: "",
        basicSalary: 0,
        photo: "",
      });
      setClassSubjectAssignments([]);
    }
    setSelectedClass(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTeacher(null);
    setClassSubjectAssignments([]);
    setSelectedClass(null);
  };

  // Add a class-subject assignment
  const handleAddAssignment = (subject: Subject) => {
    if (!selectedClass) return;

    // Check if this assignment already exists
    const exists = classSubjectAssignments.some(
      (a) => a.classId === selectedClass.id && a.subjectId === subject.id
    );

    if (exists) {
      toast.error("This subject is already assigned for this class");
      return;
    }

    setClassSubjectAssignments([
      ...classSubjectAssignments,
      {
        classId: selectedClass.id,
        className: selectedClass.name,
        subjectId: subject.id,
        subjectName: subject.name,
      },
    ]);
  };

  // Remove a class-subject assignment
  const handleRemoveAssignment = (classId: string, subjectId: string) => {
    setClassSubjectAssignments(
      classSubjectAssignments.filter(
        (a) => !(a.classId === classId && a.subjectId === subjectId)
      )
    );
  };

  const handleSave = async () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.cnic
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = selectedTeacher
        ? `/api/teachers?id=${selectedTeacher.id}`
        : "/api/teachers";
      const method = selectedTeacher ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          classSubjectAssignments,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          selectedTeacher
            ? "Teacher updated successfully"
            : "Teacher added successfully"
        );
        handleCloseDialog();
        fetchTeachers();
      } else {
        toast.error(data.error || "Failed to save teacher");
      }
    } catch (error) {
      toast.error("Failed to save teacher");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTeacher) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/teachers?id=${selectedTeacher.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Teacher deleted successfully");
        setDeleteDialogOpen(false);
        setSelectedTeacher(null);
        fetchTeachers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete teacher");
      }
    } catch (error) {
      toast.error("Failed to delete teacher");
    } finally {
      setSaving(false);
    }
  };

  const handleView = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setViewDialogOpen(true);
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
            Teachers Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Teacher
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name, email, or employee ID..."
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
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => fetchTeachers()}
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Teachers List */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : teachers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No teachers found</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {teachers.map((teacher) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={teacher.id}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Avatar
                        src={teacher.photo || undefined}
                        sx={{
                          width: 80,
                          height: 80,
                          mb: 1,
                          bgcolor: "primary.main",
                          fontSize: "1.5rem",
                        }}
                      >
                        {teacher.firstName[0]}
                        {teacher.lastName[0]}
                      </Avatar>
                      <Typography variant="h6" textAlign="center">
                        {teacher.firstName} {teacher.lastName}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        textAlign="center"
                      >
                        {teacher.employeeId}
                      </Typography>
                      <Chip
                        size="small"
                        label={teacher.isActive ? "Active" : "Inactive"}
                        color={teacher.isActive ? "success" : "default"}
                        sx={{ mt: 1 }}
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Email fontSize="small" color="action" />
                        <Typography variant="body2" noWrap>
                          {teacher.email}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Phone fontSize="small" color="action" />
                        <Typography variant="body2">{teacher.phone}</Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <School fontSize="small" color="action" />
                        <Typography variant="body2">
                          {teacher.qualification}
                        </Typography>
                      </Box>
                    </Box>

                    {teacher.subjects && teacher.subjects.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Teaching
                        </Typography>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {teacher.subjects.slice(0, 3).map((ts) => (
                            <Chip
                              key={ts.id}
                              label={
                                ts.class
                                  ? `${ts.subject?.name || "Subject"} (${
                                      ts.class.name
                                    })`
                                  : ts.subject?.name || "Subject"
                              }
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {teacher.subjects.length > 3 && (
                            <Chip
                              label={`+${teacher.subjects.length - 3}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    )}

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 1,
                        pt: 1,
                        borderTop: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleView(teacher)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(teacher)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box
            sx={{ display: "flex", justifyContent: "center", mt: 3, gap: 1 }}
          >
            <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Box sx={{ display: "flex", alignItems: "center", px: 2 }}>
              Page {page} of {totalPages}
            </Box>
            <Button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </Box>
        )}

        {/* Add/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              {selectedTeacher ? "Edit Teacher" : "Add New Teacher"}
              <IconButton onClick={handleCloseDialog}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid
                size={{ xs: 12 }}
                sx={{ display: "flex", justifyContent: "center", mb: 2 }}
              >
                <ImageUpload
                  value={formData.photo}
                  onChange={(path) =>
                    setFormData({ ...formData, photo: path || "" })
                  }
                  type="teacher"
                  size={120}
                  name={`${formData.firstName} ${formData.lastName}`.trim()}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value.toLowerCase(),
                    })
                  }
                  required
                  error={
                    formData.email.length > 0 && !isValidEmail(formData.email)
                  }
                  helperText={
                    formData.email.length > 0 && !isValidEmail(formData.email)
                      ? "Invalid email format"
                      : ""
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: maskPhone(e.target.value),
                    })
                  }
                  placeholder="03XX-XXXXXXX"
                  helperText="Format: 03XX-XXXXXXX or +92-3XX-XXXXXXX"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="CNIC"
                  value={formData.cnic}
                  onChange={(e) =>
                    setFormData({ ...formData, cnic: maskCNIC(e.target.value) })
                  }
                  required
                  placeholder="XXXXX-XXXXXXX-X"
                  helperText="Format: XXXXX-XXXXXXX-X"
                  error={
                    formData.cnic.length > 0 && !isValidCNIC(formData.cnic)
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={formData.gender}
                    label="Gender"
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                  >
                    <MenuItem value="MALE">Male</MenuItem>
                    <MenuItem value="FEMALE">Female</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Joining Date"
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) =>
                    setFormData({ ...formData, joiningDate: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Qualification"
                  value={formData.qualification}
                  onChange={(e) =>
                    setFormData({ ...formData, qualification: e.target.value })
                  }
                  placeholder="e.g., M.Sc, B.Ed"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Specialization"
                  value={formData.specialization}
                  onChange={(e) =>
                    setFormData({ ...formData, specialization: e.target.value })
                  }
                  placeholder="e.g., Mathematics"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Basic Salary"
                  type="number"
                  value={formData.basicSalary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      basicSalary: parseFloat(e.target.value) || 0,
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">PKR</InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Address"
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </Grid>

              {/* Class-Subject Assignments Section */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Class & Subject Assignments
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Select a class first, then add subjects that this teacher will
                  teach in that class.
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={classes}
                  getOptionLabel={(option) => option.name}
                  value={selectedClass}
                  onChange={(_, newValue) => setSelectedClass(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Class"
                      placeholder="Search classes..."
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {option.name}
                    </li>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={availableSubjectsForClass}
                  getOptionLabel={(option) => `${option.name} (${option.code})`}
                  disabled={!selectedClass}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      handleAddAssignment(newValue);
                    }
                  }}
                  value={null}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Add Subject"
                      placeholder={
                        selectedClass
                          ? "Search subjects..."
                          : "Select a class first"
                      }
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {option.name} ({option.code})
                    </li>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2, minHeight: 100 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Assigned Classes & Subjects:
                  </Typography>
                  {classSubjectAssignments.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="text.disabled"
                      sx={{ textAlign: "center", py: 2 }}
                    >
                      No assignments yet. Select a class and add subjects above.
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {classSubjectAssignments.map((assignment) => (
                        <Chip
                          key={`${assignment.classId}-${assignment.subjectId}`}
                          label={`${assignment.className} - ${assignment.subjectName}`}
                          onDelete={() =>
                            handleRemoveAssignment(
                              assignment.classId,
                              assignment.subjectId
                            )
                          }
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={24} /> : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              Teacher Details
              <IconButton onClick={() => setViewDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {selectedTeacher && (
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Avatar
                    src={selectedTeacher.photo || undefined}
                    sx={{
                      width: 100,
                      height: 100,
                      mb: 2,
                      bgcolor: "primary.main",
                      fontSize: "2rem",
                    }}
                  >
                    {selectedTeacher.firstName[0]}
                    {selectedTeacher.lastName[0]}
                  </Avatar>
                  <Typography variant="h5">
                    {selectedTeacher.firstName} {selectedTeacher.lastName}
                  </Typography>
                  <Typography color="text.secondary">
                    {selectedTeacher.employeeId}
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography>{selectedTeacher.email}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography>{selectedTeacher.phone}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      CNIC
                    </Typography>
                    <Typography>{selectedTeacher.cnic}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Gender
                    </Typography>
                    <Typography>{selectedTeacher.gender}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography>
                      {formatDate(selectedTeacher.dateOfBirth)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Joining Date
                    </Typography>
                    <Typography>
                      {formatDate(selectedTeacher.joiningDate)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Qualification
                    </Typography>
                    <Typography>{selectedTeacher.qualification}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Specialization
                    </Typography>
                    <Typography>
                      {selectedTeacher.specialization || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Basic Salary
                    </Typography>
                    <Typography>
                      PKR {selectedTeacher.basicSalary?.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Box>
                      <Chip
                        size="small"
                        label={selectedTeacher.isActive ? "Active" : "Inactive"}
                        color={selectedTeacher.isActive ? "success" : "default"}
                      />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography>{selectedTeacher.address}</Typography>
                  </Grid>
                  {selectedTeacher.subjects &&
                    selectedTeacher.subjects.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary">
                          Teaching Assignments
                        </Typography>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selectedTeacher.subjects.map((ts) => (
                            <Chip
                              key={ts.id}
                              label={
                                ts.class
                                  ? `${ts.subject?.name || "Subject"} (${
                                      ts.class.name
                                    })`
                                  : ts.subject?.name || "Subject"
                              }
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                  {selectedTeacher.classes &&
                    selectedTeacher.classes.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary">
                          Classes
                        </Typography>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selectedTeacher.classes.map((cls) => (
                            <Chip
                              key={cls.id}
                              label={cls.name}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                </Grid>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete teacher{" "}
              <strong>
                {selectedTeacher?.firstName} {selectedTeacher?.lastName}
              </strong>
              ? This action cannot be undone.
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
