"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import {
  Search as SearchIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Payment as PaymentIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import SimpleTable, { SimpleColumn } from "@/components/common/SimpleTable";
import { debounce, formatDate } from "@/lib/utils";

interface TransactionLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const ACTION_TYPES = [
  {
    value: "CREATE",
    label: "Create",
    icon: <AddIcon fontSize="small" />,
    color: "success",
  },
  {
    value: "UPDATE",
    label: "Update",
    icon: <EditIcon fontSize="small" />,
    color: "info",
  },
  {
    value: "DELETE",
    label: "Delete",
    icon: <DeleteIcon fontSize="small" />,
    color: "error",
  },
  {
    value: "VIEW",
    label: "View",
    icon: <ViewIcon fontSize="small" />,
    color: "default",
  },
  {
    value: "LOGIN",
    label: "Login",
    icon: <PersonIcon fontSize="small" />,
    color: "primary",
  },
  {
    value: "LOGOUT",
    label: "Logout",
    icon: <PersonIcon fontSize="small" />,
    color: "default",
  },
  {
    value: "PAYMENT",
    label: "Payment",
    icon: <PaymentIcon fontSize="small" />,
    color: "success",
  },
];

const ENTITY_TYPES = [
  { value: "STUDENT", label: "Student" },
  { value: "TEACHER", label: "Teacher" },
  { value: "USER", label: "User" },
  { value: "FEE", label: "Fee" },
  { value: "PAYMENT", label: "Payment" },
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "EXAM", label: "Exam" },
  { value: "RESULT", label: "Result" },
  { value: "SALARY", label: "Salary" },
  { value: "CLASS", label: "Class" },
  { value: "SECTION", label: "Section" },
  { value: "SUBJECT", label: "Subject" },
];

export default function LogsPage() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");

  const fetchLogs = useCallback(
    async (searchQuery = "", action = "", entity = "") => {
      try {
        setLoading(true);
        // Mock data for demonstration
        const mockLogs: TransactionLog[] = [
          {
            id: "1",
            action: "CREATE",
            entityType: "STUDENT",
            entityId: "STU-001",
            description: "Created new student: Ahmed Khan",
            createdAt: new Date().toISOString(),
            user: { id: "1", name: "Admin User", email: "admin@school.com" },
          },
          {
            id: "2",
            action: "UPDATE",
            entityType: "FEE",
            entityId: "FEE-001",
            description: "Updated fee structure for Class 5",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            user: { id: "1", name: "Admin User", email: "admin@school.com" },
          },
          {
            id: "3",
            action: "PAYMENT",
            entityType: "PAYMENT",
            entityId: "PAY-001",
            description: "Fee payment received from Sara Ali - Rs. 5,000",
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            user: {
              id: "2",
              name: "Accountant",
              email: "accountant@school.com",
            },
          },
          {
            id: "4",
            action: "LOGIN",
            entityType: "USER",
            entityId: "USR-001",
            description: "User logged in",
            ipAddress: "192.168.1.100",
            createdAt: new Date(Date.now() - 10800000).toISOString(),
            user: { id: "1", name: "Admin User", email: "admin@school.com" },
          },
          {
            id: "5",
            action: "CREATE",
            entityType: "ATTENDANCE",
            entityId: "ATT-001",
            description: "Marked attendance for Class 5A",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            user: { id: "3", name: "Teacher", email: "teacher@school.com" },
          },
          {
            id: "6",
            action: "DELETE",
            entityType: "STUDENT",
            entityId: "STU-002",
            description: "Deleted student record: Test Student",
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            user: { id: "1", name: "Admin User", email: "admin@school.com" },
          },
          {
            id: "7",
            action: "UPDATE",
            entityType: "SALARY",
            entityId: "SAL-001",
            description: "Updated salary status to PAID for Teacher ID: T001",
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            user: { id: "1", name: "Admin User", email: "admin@school.com" },
          },
        ];

        // Apply filters
        let filtered = mockLogs;
        if (searchQuery) {
          filtered = filtered.filter(
            (log) =>
              log.description
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              log.user.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        if (action) {
          filtered = filtered.filter((log) => log.action === action);
        }
        if (entity) {
          filtered = filtered.filter((log) => log.entityType === entity);
        }

        setLogs(filtered);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (status === "authenticated") {
      fetchLogs();
    }
  }, [status, fetchLogs]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      fetchLogs(value, filterAction, filterEntity);
    }, 300),
    [fetchLogs, filterAction, filterEntity]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const getActionInfo = (action: string) => {
    return ACTION_TYPES.find((a) => a.value === action) || ACTION_TYPES[0];
  };

  const columns: SimpleColumn[] = [
    {
      id: "createdAt",
      label: "Timestamp",
      width: 180,
      render: (row: TransactionLog) => (
        <Box>
          <Typography variant="body2">{formatDate(row.createdAt)}</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(row.createdAt).toLocaleTimeString()}
          </Typography>
        </Box>
      ),
    },
    {
      id: "action",
      label: "Action",
      width: 120,
      render: (row: TransactionLog) => {
        const actionInfo = getActionInfo(row.action);
        return (
          <Chip
            icon={actionInfo.icon}
            label={actionInfo.label}
            color={actionInfo.color as any}
            size="small"
            variant="outlined"
          />
        );
      },
    },
    {
      id: "entityType",
      label: "Entity",
      width: 100,
      render: (row: TransactionLog) => (
        <Chip
          label={
            ENTITY_TYPES.find((e) => e.value === row.entityType)?.label ||
            row.entityType
          }
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: "description",
      label: "Description",
      render: (row: TransactionLog) => (
        <Typography variant="body2">{row.description}</Typography>
      ),
    },
    {
      id: "user",
      label: "User",
      width: 150,
      render: (row: TransactionLog) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PersonIcon fontSize="small" color="action" />
          <Box>
            <Typography variant="body2">{row.user.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.user.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: "ipAddress",
      label: "IP Address",
      width: 120,
      render: (row: TransactionLog) => row.ipAddress || "-",
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
  const todayLogs = logs.filter(
    (log) =>
      new Date(log.createdAt).toDateString() === new Date().toDateString()
  );
  const createCount = logs.filter((log) => log.action === "CREATE").length;
  const updateCount = logs.filter((log) => log.action === "UPDATE").length;
  const deleteCount = logs.filter((log) => log.action === "DELETE").length;

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
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <HistoryIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" fontWeight="bold">
              Transaction Logs
            </Typography>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Logs
                </Typography>
                <Typography variant="h4">{logs.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Created
                </Typography>
                <Typography variant="h4" color="success.main">
                  {createCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Updated
                </Typography>
                <Typography variant="h4" color="info.main">
                  {updateCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Deleted
                </Typography>
                <Typography variant="h4" color="error.main">
                  {deleteCount}
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
                placeholder="Search logs..."
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
                <InputLabel>Action Type</InputLabel>
                <Select
                  value={filterAction}
                  label="Action Type"
                  onChange={(e) => {
                    setFilterAction(e.target.value);
                    fetchLogs(search, e.target.value, filterEntity);
                  }}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  {ACTION_TYPES.map((action) => (
                    <MenuItem key={action.value} value={action.value}>
                      {action.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={filterEntity}
                  label="Entity Type"
                  onChange={(e) => {
                    setFilterEntity(e.target.value);
                    fetchLogs(search, filterAction, e.target.value);
                  }}
                >
                  <MenuItem value="">All Entities</MenuItem>
                  {ENTITY_TYPES.map((entity) => (
                    <MenuItem key={entity.value} value={entity.value}>
                      {entity.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Logs Table */}
        <Paper sx={{ p: 2 }}>
          <SimpleTable
            columns={columns}
            rows={logs}
            loading={loading}
            emptyMessage="No transaction logs found"
          />
        </Paper>
      </Box>
    </MainLayout>
  );
}
