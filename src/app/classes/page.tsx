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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Close,
  School,
  People,
  ExpandMore,
  Class as ClassIcon,
  MenuBook,
  FilterList,
  Refresh,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";

interface Section {
  id: string;
  name: string;
  capacity: number;
  classTeacherId: string | null;
  classTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    students: number;
  };
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ClassData {
  id: string;
  name: string;
  grade: number;
  description: string | null;
  sections: Section[];
  subjects: Subject[];
  feeStructures: { id: string; name: string }[];
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [deleteType, setDeleteType] = useState<"class" | "section" | "subject">(
    "class"
  );
  const [saving, setSaving] = useState(false);

  const [classFormData, setClassFormData] = useState({
    name: "",
    grade: 1,
    description: "",
    subjectIds: [] as string[],
  });

  const [sectionFormData, setSectionFormData] = useState({
    name: "",
    capacity: 30,
    classTeacherId: "",
  });

  const [subjectFormData, setSubjectFormData] = useState({
    name: "",
    code: "",
    description: "",
    classIds: [] as string[],
  });

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
      });

      const res = await fetch(`/api/classes?${params}`);
      const data = await res.json();

      if (res.ok) {
        setClasses(data.classes || []);
      } else {
        toast.error(data.error || "Failed to fetch classes");
      }
    } catch (error) {
      toast.error("Failed to fetch classes");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/subjects");
      const data = await res.json();
      if (res.ok) {
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error("Failed to fetch subjects", error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/teachers?status=active&limit=100");
      const data = await res.json();
      if (res.ok) {
        setTeachers(data.teachers || []);
      }
    } catch (error) {
      console.error("Failed to fetch teachers", error);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

  // Class handlers
  const handleOpenClassDialog = (cls?: ClassData) => {
    if (cls) {
      setSelectedClass(cls);
      setClassFormData({
        name: cls.name,
        grade: cls.grade,
        description: cls.description || "",
        subjectIds: cls.subjects?.map((s) => s.id) || [],
      });
    } else {
      setSelectedClass(null);
      setClassFormData({
        name: "",
        grade: 1,
        description: "",
        subjectIds: [],
      });
    }
    setClassDialogOpen(true);
  };

  const handleSaveClass = async () => {
    if (!classFormData.name || !classFormData.grade) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = selectedClass
        ? `/api/classes?id=${selectedClass.id}`
        : "/api/classes";
      const method = selectedClass ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classFormData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          selectedClass
            ? "Class updated successfully"
            : "Class added successfully"
        );
        setClassDialogOpen(false);
        setSelectedClass(null);
        fetchClasses();
      } else {
        toast.error(data.error || "Failed to save class");
      }
    } catch (error) {
      toast.error("Failed to save class");
    } finally {
      setSaving(false);
    }
  };

  // Section handlers
  const handleOpenSectionDialog = (cls: ClassData, section?: Section) => {
    setSelectedClass(cls);
    if (section) {
      setSelectedSection(section);
      setSectionFormData({
        name: section.name,
        capacity: section.capacity,
        classTeacherId: section.classTeacherId || "",
      });
    } else {
      setSelectedSection(null);
      setSectionFormData({
        name: "",
        capacity: 30,
        classTeacherId: "",
      });
    }
    setSectionDialogOpen(true);
  };

  const handleSaveSection = async () => {
    if (!sectionFormData.name || !selectedClass) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = "/api/sections";
      const method = selectedSection ? "PUT" : "POST";

      const res = await fetch(
        selectedSection ? `${url}?id=${selectedSection.id}` : url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...sectionFormData,
            classId: selectedClass.id,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success(
          selectedSection
            ? "Section updated successfully"
            : "Section added successfully"
        );
        setSectionDialogOpen(false);
        setSelectedSection(null);
        fetchClasses();
      } else {
        toast.error(data.error || "Failed to save section");
      }
    } catch (error) {
      toast.error("Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  // Subject handlers
  const handleOpenSubjectDialog = (subject?: Subject) => {
    if (subject) {
      setSelectedSubject(subject);
      const subjectClasses = classes
        .filter((c) => c.subjects?.some((s) => s.id === subject.id))
        .map((c) => c.id);
      setSubjectFormData({
        name: subject.name,
        code: subject.code,
        description: "",
        classIds: subjectClasses,
      });
    } else {
      setSelectedSubject(null);
      setSubjectFormData({
        name: "",
        code: "",
        description: "",
        classIds: [],
      });
    }
    setSubjectDialogOpen(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectFormData.name || !subjectFormData.code) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = selectedSubject
        ? `/api/subjects?id=${selectedSubject.id}`
        : "/api/subjects";
      const method = selectedSubject ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectFormData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          selectedSubject
            ? "Subject updated successfully"
            : "Subject added successfully"
        );
        setSubjectDialogOpen(false);
        setSelectedSubject(null);
        fetchSubjects();
        fetchClasses();
      } else {
        toast.error(data.error || "Failed to save subject");
      }
    } catch (error) {
      toast.error("Failed to save subject");
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    setSaving(true);
    try {
      let url = "";
      if (deleteType === "class" && selectedClass) {
        url = `/api/classes?id=${selectedClass.id}`;
      } else if (deleteType === "section" && selectedSection) {
        url = `/api/sections?id=${selectedSection.id}`;
      } else if (deleteType === "subject" && selectedSubject) {
        url = `/api/subjects?id=${selectedSubject.id}`;
      }

      const res = await fetch(url, { method: "DELETE" });

      if (res.ok) {
        toast.success(`${deleteType} deleted successfully`);
        setDeleteDialogOpen(false);
        setSelectedClass(null);
        setSelectedSection(null);
        setSelectedSubject(null);
        fetchClasses();
        if (deleteType === "subject") {
          fetchSubjects();
        }
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to delete ${deleteType}`);
      }
    } catch (error) {
      toast.error(`Failed to delete ${deleteType}`);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (
    type: "class" | "section" | "subject",
    cls?: ClassData,
    section?: Section,
    subject?: Subject
  ) => {
    setDeleteType(type);
    setSelectedClass(cls || null);
    setSelectedSection(section || null);
    setSelectedSubject(subject || null);
    setDeleteDialogOpen(true);
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
            Classes & Subjects
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<MenuBook />}
              onClick={() => handleOpenSubjectDialog()}
            >
              Add Subject
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenClassDialog()}
            >
              Add Class
            </Button>
          </Box>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3 }}
        >
          <Tab icon={<ClassIcon />} label="Classes" />
          <Tab icon={<MenuBook />} label="Subjects" />
        </Tabs>

        {/* Search */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={
                  activeTab === 0 ? "Search classes..." : "Search subjects..."
                }
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => setSearch("")}
                >
                  Clear
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    fetchClasses();
                    fetchSubjects();
                  }}
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : activeTab === 0 ? (
          // Classes Tab
          <Box>
            {classes.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">No classes found</Typography>
              </Paper>
            ) : (
              classes
                .filter(
                  (c) =>
                    !search ||
                    c.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((cls) => (
                  <Accordion key={cls.id} defaultExpanded={false}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          width: "100%",
                          pr: 2,
                        }}
                      >
                        <School color="primary" />
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight="bold">{cls.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Grade {cls.grade} • {cls.sections?.length || 0}{" "}
                            sections • {cls.subjects?.length || 0} subjects
                          </Typography>
                        </Box>
                        <Box
                          sx={{ display: "flex", gap: 0.5 }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                        >
                          <Tooltip title="Edit Class">
                            <Box
                              component="span"
                              sx={{ display: "inline-flex" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenClassDialog(cls);
                              }}
                            >
                              <IconButton size="small" component="span">
                                <Edit />
                              </IconButton>
                            </Box>
                          </Tooltip>
                          <Tooltip title="Delete Class">
                            <Box
                              component="span"
                              sx={{
                                display: "inline-flex",
                                color: "error.main",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog("class", cls);
                              }}
                            >
                              <IconButton
                                size="small"
                                component="span"
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                          </Tooltip>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <Typography variant="subtitle1" fontWeight="bold">
                                Sections
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<Add />}
                                onClick={() => handleOpenSectionDialog(cls)}
                              >
                                Add Section
                              </Button>
                            </Box>
                            {cls.sections?.length === 0 ? (
                              <Typography
                                color="text.secondary"
                                variant="body2"
                              >
                                No sections created
                              </Typography>
                            ) : (
                              <List dense>
                                {cls.sections?.map((section, idx) => (
                                  <Box key={section.id}>
                                    {idx > 0 && <Divider />}
                                    <ListItem>
                                      <ListItemText
                                        primary={`Section ${section.name}`}
                                        secondary={
                                          <>
                                            Capacity: {section.capacity}
                                            {section.classTeacher && (
                                              <>
                                                {" • Teacher: "}
                                                {
                                                  section.classTeacher.firstName
                                                }{" "}
                                                {section.classTeacher.lastName}
                                              </>
                                            )}
                                            {section._count && (
                                              <>
                                                {" • Students: "}
                                                {section._count.students}
                                              </>
                                            )}
                                          </>
                                        }
                                      />
                                      <ListItemSecondaryAction>
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            handleOpenSectionDialog(
                                              cls,
                                              section
                                            )
                                          }
                                        >
                                          <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            openDeleteDialog(
                                              "section",
                                              cls,
                                              section
                                            )
                                          }
                                        >
                                          <Delete fontSize="small" />
                                        </IconButton>
                                      </ListItemSecondaryAction>
                                    </ListItem>
                                  </Box>
                                ))}
                              </List>
                            )}
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography
                              variant="subtitle1"
                              fontWeight="bold"
                              sx={{ mb: 2 }}
                            >
                              Subjects
                            </Typography>
                            {cls.subjects?.length === 0 ? (
                              <Typography
                                color="text.secondary"
                                variant="body2"
                              >
                                No subjects assigned
                              </Typography>
                            ) : (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}
                              >
                                {cls.subjects?.map((subject) => (
                                  <Chip
                                    key={subject.id}
                                    label={`${subject.name} (${subject.code})`}
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            )}
                          </Paper>
                          {cls.feeStructures &&
                            cls.feeStructures.length > 0 && (
                              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                                <Typography
                                  variant="subtitle1"
                                  fontWeight="bold"
                                  sx={{ mb: 2 }}
                                >
                                  Fee Structures
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 1,
                                  }}
                                >
                                  {cls.feeStructures.map((fee) => (
                                    <Chip
                                      key={fee.id}
                                      label={fee.name}
                                      color="primary"
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              </Paper>
                            )}
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))
            )}
          </Box>
        ) : (
          // Subjects Tab
          <Grid container spacing={3}>
            {subjects.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    No subjects found
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              subjects
                .filter(
                  (s) =>
                    !search ||
                    s.name.toLowerCase().includes(search.toLowerCase()) ||
                    s.code.toLowerCase().includes(search.toLowerCase())
                )
                .map((subject) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={subject.id}>
                    <Card>
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <Box>
                            <Typography variant="h6">{subject.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Code: {subject.code}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenSubjectDialog(subject)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                openDeleteDialog(
                                  "subject",
                                  undefined,
                                  undefined,
                                  subject
                                )
                              }
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Classes
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.5,
                              mt: 0.5,
                            }}
                          >
                            {classes
                              .filter((c) =>
                                c.subjects?.some((s) => s.id === subject.id)
                              )
                              .map((c) => (
                                <Chip
                                  key={c.id}
                                  label={c.name}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
            )}
          </Grid>
        )}

        {/* Class Dialog */}
        <Dialog
          open={classDialogOpen}
          onClose={() => setClassDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              {selectedClass ? "Edit Class" : "Add New Class"}
              <IconButton onClick={() => setClassDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Class Name"
                  value={classFormData.name}
                  onChange={(e) =>
                    setClassFormData({ ...classFormData, name: e.target.value })
                  }
                  required
                  placeholder="e.g., Class 1, Nursery"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Grade"
                  type="number"
                  value={classFormData.grade}
                  onChange={(e) =>
                    setClassFormData({
                      ...classFormData,
                      grade: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                  inputProps={{ min: 1, max: 12 }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={classFormData.description}
                  onChange={(e) =>
                    setClassFormData({
                      ...classFormData,
                      description: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Subjects</InputLabel>
                  <Select
                    multiple
                    value={classFormData.subjectIds}
                    label="Subjects"
                    onChange={(e) =>
                      setClassFormData({
                        ...classFormData,
                        subjectIds: e.target.value as string[],
                      })
                    }
                    renderValue={(selected) =>
                      subjects
                        .filter((s) => selected.includes(s.id))
                        .map((s) => s.name)
                        .join(", ")
                    }
                  >
                    {subjects.map((subject) => (
                      <MenuItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClassDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveClass}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Section Dialog */}
        <Dialog
          open={sectionDialogOpen}
          onClose={() => setSectionDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              {selectedSection ? "Edit Section" : "Add New Section"}
              <IconButton onClick={() => setSectionDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Section Name"
                  value={sectionFormData.name}
                  onChange={(e) =>
                    setSectionFormData({
                      ...sectionFormData,
                      name: e.target.value,
                    })
                  }
                  required
                  placeholder="e.g., A, B, C"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  value={sectionFormData.capacity}
                  onChange={(e) =>
                    setSectionFormData({
                      ...sectionFormData,
                      capacity: parseInt(e.target.value) || 30,
                    })
                  }
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Class Teacher</InputLabel>
                  <Select
                    value={sectionFormData.classTeacherId}
                    label="Class Teacher"
                    onChange={(e) =>
                      setSectionFormData({
                        ...sectionFormData,
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveSection}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Subject Dialog */}
        <Dialog
          open={subjectDialogOpen}
          onClose={() => setSubjectDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              {selectedSubject ? "Edit Subject" : "Add New Subject"}
              <IconButton onClick={() => setSubjectDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Subject Name"
                  value={subjectFormData.name}
                  onChange={(e) =>
                    setSubjectFormData({
                      ...subjectFormData,
                      name: e.target.value,
                    })
                  }
                  required
                  placeholder="e.g., Mathematics"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Subject Code"
                  value={subjectFormData.code}
                  onChange={(e) =>
                    setSubjectFormData({
                      ...subjectFormData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  required
                  placeholder="e.g., MATH"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={subjectFormData.description}
                  onChange={(e) =>
                    setSubjectFormData({
                      ...subjectFormData,
                      description: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Assign to Classes</InputLabel>
                  <Select
                    multiple
                    value={subjectFormData.classIds}
                    label="Assign to Classes"
                    onChange={(e) =>
                      setSubjectFormData({
                        ...subjectFormData,
                        classIds: e.target.value as string[],
                      })
                    }
                    renderValue={(selected) =>
                      classes
                        .filter((c) => selected.includes(c.id))
                        .map((c) => c.name)
                        .join(", ")
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubjectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveSubject}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this {deleteType}
              {deleteType === "class" && selectedClass && (
                <>
                  : <strong>{selectedClass.name}</strong>
                </>
              )}
              {deleteType === "section" && selectedSection && (
                <>
                  : <strong>Section {selectedSection.name}</strong>
                </>
              )}
              {deleteType === "subject" && selectedSubject && (
                <>
                  : <strong>{selectedSubject.name}</strong>
                </>
              )}
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
