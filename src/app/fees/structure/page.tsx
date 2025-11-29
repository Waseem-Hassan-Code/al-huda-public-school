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
  FormControlLabel,
  Switch,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import SimpleTable, { SimpleColumn } from "@/components/common/SimpleTable";
import { debounce, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface FeeStructure {
  id: string;
  name: string;
  description?: string;
  amount: number;
  frequency: string;
  academicYear: string;
  isOptional: boolean;
  isActive: boolean;
  class?: { id: string; name: string };
  feeType: { id: string; name: string };
}

interface FeeType {
  id: string;
  name: string;
  description?: string;
}

interface Class {
  id: string;
  name: string;
}

const FREQUENCY_OPTIONS = [
  { value: "ONCE", label: "One Time (Admission)" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

export default function FeeStructurePage() {
  const { data: session, status } = useSession();
  const [tabValue, setTabValue] = useState(0);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(
    null
  );
  const [editingType, setEditingType] = useState<FeeType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    feeTypeId: "",
    classId: "",
    amount: 0,
    frequency: "ONCE",
    academicYear: new Date().getFullYear().toString(),
    isOptional: false,
    isActive: true,
  });
  const [typeFormData, setTypeFormData] = useState({
    name: "",
    description: "",
  });

  const fetchFeeStructures = useCallback(
    async (searchQuery = "", classId = "") => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.append("search", searchQuery);
        if (classId) params.append("classId", classId);

        const response = await fetch(`/api/fee-structures?${params}`);
        const data = await response.json();
        if (response.ok) {
          setFeeStructures(data.feeStructures || []);
        } else {
          toast.error(data.error || "Failed to fetch fee structures");
        }
      } catch (error) {
        toast.error("Failed to fetch fee structures");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchFeeTypes = useCallback(async () => {
    try {
      const response = await fetch("/api/fee-structures?feeTypes=true");
      const data = await response.json();
      if (response.ok) {
        setFeeTypes(data.feeTypes || []);
      }
    } catch (error) {
      console.error("Failed to fetch fee types:", error);
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

  useEffect(() => {
    if (status === "authenticated") {
      fetchFeeStructures();
      fetchFeeTypes();
      fetchClasses();
    }
  }, [status, fetchFeeStructures, fetchFeeTypes, fetchClasses]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      fetchFeeStructures(value, filterClass);
    }, 300),
    [fetchFeeStructures, filterClass]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleClassFilterChange = (classId: string) => {
    setFilterClass(classId);
    fetchFeeStructures(search, classId);
  };

  const handleOpenDialog = (structure?: FeeStructure) => {
    if (structure) {
      setEditingStructure(structure);
      setFormData({
        name: structure.name,
        description: structure.description || "",
        feeTypeId: structure.feeType.id,
        classId: structure.class?.id || "",
        amount: structure.amount,
        frequency: structure.frequency,
        academicYear: structure.academicYear,
        isOptional: structure.isOptional,
        isActive: structure.isActive,
      });
    } else {
      setEditingStructure(null);
      setFormData({
        name: "",
        description: "",
        feeTypeId: "",
        classId: "",
        amount: 0,
        frequency: "ONCE",
        academicYear: new Date().getFullYear().toString(),
        isOptional: false,
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleOpenTypeDialog = (feeType?: FeeType) => {
    if (feeType) {
      setEditingType(feeType);
      setTypeFormData({
        name: feeType.name,
        description: feeType.description || "",
      });
    } else {
      setEditingType(null);
      setTypeFormData({ name: "", description: "" });
    }
    setTypeDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.feeTypeId || formData.amount <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const url = editingStructure
        ? `/api/fee-structures?id=${editingStructure.id}`
        : "/api/fee-structures";
      const method = editingStructure ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(
          editingStructure
            ? "Fee structure updated successfully"
            : "Fee structure created successfully"
        );
        setDialogOpen(false);
        fetchFeeStructures(search, filterClass);
      } else {
        toast.error(data.error || "Failed to save fee structure");
      }
    } catch (error) {
      toast.error("Failed to save fee structure");
    }
  };

  const handleSubmitType = async () => {
    if (!typeFormData.name) {
      toast.error("Please enter a fee type name");
      return;
    }

    try {
      const response = await fetch("/api/fee-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createFeeType: true, ...typeFormData }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Fee type saved successfully");
        setTypeDialogOpen(false);
        fetchFeeTypes();
      } else {
        toast.error(data.error || "Failed to save fee type");
      }
    } catch (error) {
      toast.error("Failed to save fee type");
    }
  };

  const handleDelete = async (structure: FeeStructure) => {
    if (!confirm(`Are you sure you want to delete ${structure.name}?`)) return;

    try {
      const response = await fetch(`/api/fee-structures?id=${structure.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Fee structure deleted successfully");
        fetchFeeStructures(search, filterClass);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete fee structure");
      }
    } catch (error) {
      toast.error("Failed to delete fee structure");
    }
  };

  const columns: SimpleColumn[] = [
    { id: "name", label: "Fee Name" },
    {
      id: "feeType",
      label: "Type",
      render: (row: FeeStructure) => (
        <Chip label={row.feeType?.name} size="small" />
      ),
    },
    {
      id: "class",
      label: "Class",
      render: (row: FeeStructure) => row.class?.name || "All Classes",
    },
    {
      id: "amount",
      label: "Amount",
      render: (row: FeeStructure) => formatCurrency(row.amount),
    },
    {
      id: "frequency",
      label: "Frequency",
      render: (row: FeeStructure) => {
        const freq = FREQUENCY_OPTIONS.find((f) => f.value === row.frequency);
        return freq?.label || row.frequency;
      },
    },
    {
      id: "isOptional",
      label: "Optional",
      width: 100,
      render: (row: FeeStructure) => (
        <Chip
          label={row.isOptional ? "Yes" : "No"}
          color={row.isOptional ? "warning" : "default"}
          size="small"
        />
      ),
    },
    {
      id: "isActive",
      label: "Status",
      width: 100,
      render: (row: FeeStructure) => (
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
      render: (row: FeeStructure) => (
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
            Fee Structure
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={() => handleOpenTypeDialog()}>
              Add Fee Type
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Fee Structure
            </Button>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Tuition fee is custom per student and set
            during admission. One-time fees are collected at admission. Monthly
            fees are automatically added to vouchers.
          </Typography>
        </Alert>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Fee Structures" />
            <Tab label="Fee Types" />
          </Tabs>
        </Paper>

        {tabValue === 0 && (
          <>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    placeholder="Search fee structures..."
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
                rows={feeStructures}
                loading={loading}
                emptyMessage="No fee structures found"
              />
            </Paper>
          </>
        )}

        {tabValue === 1 && (
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {feeTypes.map((type) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={type.id}>
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
                          <Typography variant="h6">{type.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {type.description || "No description"}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenTypeDialog(type)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {feeTypes.length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Box display="flex" justifyContent="center" p={4}>
                    <Typography color="text.secondary">
                      No fee types found
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Add/Edit Fee Structure Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingStructure ? "Edit Fee Structure" : "Add New Fee Structure"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Fee Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="e.g., Admission Fee, Lab Fee"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Fee Type</InputLabel>
                  <Select
                    value={formData.feeTypeId}
                    label="Fee Type"
                    onChange={(e) =>
                      setFormData({ ...formData, feeTypeId: e.target.value })
                    }
                  >
                    {feeTypes.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Class (leave empty for all classes)</InputLabel>
                  <Select
                    value={formData.classId}
                    label="Class (leave empty for all classes)"
                    onChange={(e) =>
                      setFormData({ ...formData, classId: e.target.value })
                    }
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount (PKR)"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={formData.frequency}
                    label="Frequency"
                    onChange={(e) =>
                      setFormData({ ...formData, frequency: e.target.value })
                    }
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Academic Year"
                  value={formData.academicYear}
                  onChange={(e) =>
                    setFormData({ ...formData, academicYear: e.target.value })
                  }
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
                  rows={2}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
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
                  label="Optional Fee (not required for all students)"
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {editingStructure ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add/Edit Fee Type Dialog */}
        <Dialog
          open={typeDialogOpen}
          onClose={() => setTypeDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingType ? "Edit Fee Type" : "Add New Fee Type"}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Fee Type Name"
                  value={typeFormData.name}
                  onChange={(e) =>
                    setTypeFormData({ ...typeFormData, name: e.target.value })
                  }
                  placeholder="e.g., Tuition Fee, Admission Fee, Lab Fee"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  value={typeFormData.description}
                  onChange={(e) =>
                    setTypeFormData({
                      ...typeFormData,
                      description: e.target.value,
                    })
                  }
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTypeDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmitType}>
              {editingType ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
