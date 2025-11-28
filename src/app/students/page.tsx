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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import SimpleTable, { SimpleColumn } from "@/components/common/SimpleTable";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate, getInitials, debounce } from "@/lib/utils";
import { toast } from "sonner";

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  status: string;
  class: { id: string; name: string };
  section: { id: string; name: string };
  guardian: { firstName: string; lastName: string; phone: string } | null;
  createdAt: string;
}

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

export default function StudentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch classes for filter
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

  // Fetch students
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append("search", search);
      if (classFilter) params.append("classId", classFilter);
      if (sectionFilter) params.append("sectionId", sectionFilter);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/students?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, classFilter, sectionFilter, statusFilter]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchStudents();
    }
  }, [status, fetchStudents]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  const handleDelete = async () => {
    if (!studentToDelete) return;

    try {
      const response = await fetch(`/api/students/${studentToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Student deleted successfully");
        fetchStudents();
      } else {
        toast.error("Failed to delete student");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const columns: SimpleColumn<Student>[] = [
    {
      id: "studentId",
      label: "Student ID",
      minWidth: 120,
      renderCell: (row: Student) => (
        <Typography variant="body2" fontWeight="500">
          {row.studentId}
        </Typography>
      ),
    },
    {
      id: "name",
      label: "Name",
      minWidth: 200,
      renderCell: (row: Student) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
            {getInitials(row.firstName, row.lastName)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="500">
              {row.firstName} {row.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: "class",
      label: "Class",
      minWidth: 120,
      renderCell: (row: Student) => (
        <Chip
          label={`${row.class?.name || "-"} - ${row.section?.name || "-"}`}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: "guardian",
      label: "Guardian",
      minWidth: 150,
      renderCell: (row: Student) => (
        <Box>
          <Typography variant="body2">
            {row.guardian
              ? `${row.guardian.firstName} ${row.guardian.lastName}`
              : "-"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.guardian?.phone || ""}
          </Typography>
        </Box>
      ),
    },
    {
      id: "phone",
      label: "Phone",
      minWidth: 130,
    },
    {
      id: "dateOfBirth",
      label: "Date of Birth",
      minWidth: 120,
      renderCell: (row: Student) => formatDate(row.dateOfBirth),
    },
    {
      id: "status",
      label: "Status",
      minWidth: 100,
      renderCell: (row: Student) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      label: "Actions",
      minWidth: 150,
      renderCell: (row: Student) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="View">
            <IconButton
              size="small"
              onClick={() => router.push(`/students/${row.id}`)}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => router.push(`/students/${row.id}/edit`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setStudentToDelete(row);
                setDeleteDialogOpen(true);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const selectedClass = classes.find((c) => c.id === classFilter);
  const sections = selectedClass?.sections || [];

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
              Students
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage student records and admissions
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => toast.info("Export feature coming soon")}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push("/students/admission")}
            >
              New Admission
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <TextField
              placeholder="Search students..."
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              onChange={(e) => debouncedSearch(e.target.value)}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Class</InputLabel>
              <Select
                value={classFilter}
                label="Class"
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSectionFilter("");
                  setPage(1);
                }}
              >
                <MenuItem value="">All Classes</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              size="small"
              sx={{ minWidth: 150 }}
              disabled={!classFilter}
            >
              <InputLabel>Section</InputLabel>
              <Select
                value={sectionFilter}
                label="Section"
                onChange={(e) => {
                  setSectionFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All Sections</MenuItem>
                {sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
                <MenuItem value="GRADUATED">Graduated</MenuItem>
                <MenuItem value="TRANSFERRED">Transferred</MenuItem>
                <MenuItem value="EXPELLED">Expelled</MenuItem>
              </Select>
            </FormControl>
            {(classFilter || sectionFilter || statusFilter) && (
              <Button
                size="small"
                onClick={() => {
                  setClassFilter("");
                  setSectionFilter("");
                  setStatusFilter("");
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        </Paper>

        {/* Data Grid */}
        <SimpleTable
          columns={columns}
          rows={students}
          loading={loading}
          page={page}
          pageSize={limit}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size: number) => {
            setLimit(size);
            setPage(1);
          }}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete student{" "}
            <strong>
              {studentToDelete?.firstName} {studentToDelete?.lastName}
            </strong>
            ? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
