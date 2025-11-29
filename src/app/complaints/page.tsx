"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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
  Card,
  CardContent,
  Avatar,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import SimpleTable, { SimpleColumn } from "@/components/common/SimpleTable";
import { debounce, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Complaint {
  id: string;
  complaintNo: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
  complainant: {
    id: string;
    firstName: string;
    lastName: string;
    registrationNo?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
  };
}

const CATEGORIES = [
  { value: "ACADEMIC", label: "Academic" },
  { value: "DISCIPLINE", label: "Discipline" },
  { value: "FACILITIES", label: "Facilities" },
  { value: "BULLYING", label: "Bullying" },
  { value: "FEES", label: "Fees Related" },
  { value: "OTHER", label: "Other" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "default" },
  { value: "MEDIUM", label: "Medium", color: "warning" },
  { value: "HIGH", label: "High", color: "error" },
];

const STATUSES = [
  { value: "PENDING", label: "Pending", color: "warning" },
  { value: "IN_PROGRESS", label: "In Progress", color: "info" },
  { value: "RESOLVED", label: "Resolved", color: "success" },
  { value: "CLOSED", label: "Closed", color: "default" },
];

export default function ComplaintsPage() {
  const { data: session, status } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "OTHER",
    priority: "MEDIUM",
    complainantId: "",
  });

  const fetchComplaints = useCallback(
    async (searchQuery = "", statusFilter = "", categoryFilter = "") => {
      try {
        setLoading(true);
        // Mock data for now - would connect to API
        const mockComplaints: Complaint[] = [
          {
            id: "1",
            complaintNo: "CMP-2024-001",
            title: "Classroom AC Not Working",
            description:
              "The air conditioning in Class 8A has not been working for the past week.",
            category: "FACILITIES",
            status: "PENDING",
            priority: "HIGH",
            createdAt: new Date().toISOString(),
            complainant: {
              id: "1",
              firstName: "Ahmed",
              lastName: "Khan",
              registrationNo: "STU-2024-001",
            },
          },
          {
            id: "2",
            complaintNo: "CMP-2024-002",
            title: "Missing Library Books",
            description:
              "Several books borrowed 2 months ago have not been returned.",
            category: "ACADEMIC",
            status: "IN_PROGRESS",
            priority: "MEDIUM",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            complainant: {
              id: "2",
              firstName: "Sara",
              lastName: "Ali",
              registrationNo: "STU-2024-002",
            },
            assignedTo: {
              id: "1",
              name: "Admin User",
            },
          },
        ];

        // Filter mock data
        let filtered = mockComplaints;
        if (searchQuery) {
          filtered = filtered.filter(
            (c) =>
              c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.complaintNo.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        if (statusFilter) {
          filtered = filtered.filter((c) => c.status === statusFilter);
        }
        if (categoryFilter) {
          filtered = filtered.filter((c) => c.category === categoryFilter);
        }

        setComplaints(filtered);
      } catch (error) {
        toast.error("Failed to fetch complaints");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchComplaints();
    }
  }, [status, fetchComplaints]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      fetchComplaints(value, filterStatus, filterCategory);
    }, 300),
    [fetchComplaints, filterStatus, filterCategory]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setViewDialogOpen(true);
  };

  const handleUpdateStatus = async (complaintId: string, newStatus: string) => {
    toast.success(`Complaint status updated to ${newStatus}`);
    fetchComplaints(search, filterStatus, filterCategory);
  };

  const getStatusColor = (status: string) => {
    const found = STATUSES.find((s) => s.value === status);
    return (
      (found?.color as "warning" | "info" | "success" | "default") || "default"
    );
  };

  const getPriorityColor = (priority: string) => {
    const found = PRIORITIES.find((p) => p.value === priority);
    return (found?.color as "default" | "warning" | "error") || "default";
  };

  const columns: SimpleColumn[] = [
    { id: "complaintNo", label: "Complaint No", width: 130 },
    { id: "title", label: "Title" },
    {
      id: "category",
      label: "Category",
      render: (row: Complaint) => {
        const cat = CATEGORIES.find((c) => c.value === row.category);
        return (
          <Chip
            label={cat?.label || row.category}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      id: "complainant",
      label: "Complainant",
      render: (row: Complaint) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar sx={{ width: 28, height: 28 }}>
            <PersonIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="body2">
              {row.complainant.firstName} {row.complainant.lastName}
            </Typography>
            {row.complainant.registrationNo && (
              <Typography variant="caption" color="text.secondary">
                {row.complainant.registrationNo}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      id: "priority",
      label: "Priority",
      width: 100,
      render: (row: Complaint) => (
        <Chip
          label={row.priority}
          color={getPriorityColor(row.priority)}
          size="small"
        />
      ),
    },
    {
      id: "status",
      label: "Status",
      width: 120,
      render: (row: Complaint) => (
        <Chip
          label={
            STATUSES.find((s) => s.value === row.status)?.label || row.status
          }
          color={getStatusColor(row.status)}
          size="small"
        />
      ),
    },
    {
      id: "createdAt",
      label: "Date",
      render: (row: Complaint) => formatDate(row.createdAt),
    },
    {
      id: "actions",
      label: "Actions",
      width: 100,
      render: (row: Complaint) => (
        <Box>
          <IconButton size="small" onClick={() => handleViewComplaint(row)}>
            <ViewIcon fontSize="small" />
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

  // Summary counts
  const pendingCount = complaints.filter((c) => c.status === "PENDING").length;
  const inProgressCount = complaints.filter(
    (c) => c.status === "IN_PROGRESS"
  ).length;
  const resolvedCount = complaints.filter(
    (c) => c.status === "RESOLVED"
  ).length;

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
            Complaints Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New Complaint
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Complaints
                </Typography>
                <Typography variant="h4">{complaints.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Pending
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {pendingCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  In Progress
                </Typography>
                <Typography variant="h4" color="info.main">
                  {inProgressCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Resolved
                </Typography>
                <Typography variant="h4" color="success.main">
                  {resolvedCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder="Search complaints..."
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
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Category"
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    fetchComplaints(search, filterStatus, e.target.value);
                  }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    fetchComplaints(search, e.target.value, filterCategory);
                  }}
                >
                  <MenuItem value="">All Status</MenuItem>
                  {STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Complaints Table */}
        <Paper sx={{ p: 2 }}>
          <SimpleTable
            columns={columns}
            rows={complaints}
            loading={loading}
            emptyMessage="No complaints found"
          />
        </Paper>

        {/* View Complaint Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Complaint Details - {selectedComplaint?.complaintNo}
          </DialogTitle>
          <DialogContent>
            {selectedComplaint && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6">
                      {selectedComplaint.title}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Category
                    </Typography>
                    <Chip
                      label={
                        CATEGORIES.find(
                          (c) => c.value === selectedComplaint.category
                        )?.label
                      }
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Priority
                    </Typography>
                    <Chip
                      label={selectedComplaint.priority}
                      color={getPriorityColor(selectedComplaint.priority)}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={
                        STATUSES.find(
                          (s) => s.value === selectedComplaint.status
                        )?.label
                      }
                      color={getStatusColor(selectedComplaint.status)}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Submitted On
                    </Typography>
                    <Typography>
                      {formatDate(selectedComplaint.createdAt)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      Complainant
                    </Typography>
                    <Typography>
                      {selectedComplaint.complainant.firstName}{" "}
                      {selectedComplaint.complainant.lastName}
                      {selectedComplaint.complainant.registrationNo &&
                        ` (${selectedComplaint.complainant.registrationNo})`}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">
                      Description
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                      <Typography>{selectedComplaint.description}</Typography>
                    </Paper>
                  </Grid>
                  {selectedComplaint.resolution && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary">
                        Resolution
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{ p: 2, mt: 1, bgcolor: "success.50" }}
                      >
                        <Typography>{selectedComplaint.resolution}</Typography>
                      </Paper>
                    </Grid>
                  )}
                  <Grid size={{ xs: 12 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Update Status
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {STATUSES.map((status) => (
                        <Button
                          key={status.value}
                          variant={
                            selectedComplaint.status === status.value
                              ? "contained"
                              : "outlined"
                          }
                          size="small"
                          onClick={() =>
                            handleUpdateStatus(
                              selectedComplaint.id,
                              status.value
                            )
                          }
                          disabled={selectedComplaint.status === status.value}
                        >
                          {status.label}
                        </Button>
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* New Complaint Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Submit New Complaint</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                  >
                    {PRIORITIES.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                  rows={4}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                toast.success("Complaint submitted successfully");
                setDialogOpen(false);
              }}
            >
              Submit Complaint
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
