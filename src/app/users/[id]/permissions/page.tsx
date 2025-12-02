"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Switch,
  FormControlLabel,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  ArrowBack,
  Save,
  Person,
  Security,
  Check,
  Close,
  Visibility,
  Edit,
  Delete,
  Add,
  ExpandMore,
  ExpandLess,
  Warning,
  CheckCircle,
  Info,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";
import {
  Permission,
  permissionGroups,
  rolePermissions,
} from "@/lib/permissions";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Permission display names
const permissionLabels: Record<string, string> = {
  "dashboard.view": "View Dashboard",
  "reports.view": "View Reports",
  "users.view": "View Users",
  "users.create": "Create Users",
  "users.update": "Update Users",
  "users.delete": "Delete Users",
  "users.permissions": "Manage Permissions",
  "students.view": "View Students",
  "students.create": "Create Students",
  "students.update": "Update Students",
  "students.delete": "Delete Students",
  "students.promote": "Promote Students",
  "students.transfer": "Transfer Students",
  "students.fees.view": "View Student Fees",
  "teachers.view": "View Teachers",
  "teachers.create": "Create Teachers",
  "teachers.update": "Update Teachers",
  "teachers.delete": "Delete Teachers",
  "teachers.salary": "Manage Teacher Salary",
  "classes.view": "View Classes",
  "classes.create": "Create Classes",
  "classes.update": "Update Classes",
  "classes.delete": "Delete Classes",
  "sections.view": "View Sections",
  "sections.create": "Create Sections",
  "sections.update": "Update Sections",
  "sections.delete": "Delete Sections",
  "subjects.view": "View Subjects",
  "subjects.create": "Create Subjects",
  "subjects.update": "Update Subjects",
  "subjects.delete": "Delete Subjects",
  "fees.view": "View Fees",
  "fees.create": "Create Fee Voucher",
  "fees.update": "Update Fee Voucher",
  "fees.delete": "Delete Fee Voucher",
  "fees.payment": "Receive Payment",
  "fees.generate": "Generate Fee Vouchers",
  "fees.structure": "Manage Fee Structure",
  "attendance.view": "View Attendance",
  "attendance.mark": "Mark Attendance",
  "attendance.edit": "Edit Attendance",
  "complaints.view": "View Complaints",
  "complaints.create": "Create Complaint",
  "complaints.resolve": "Resolve Complaint",
  "exams.view": "View Exams",
  "exams.create": "Create Exam",
  "exams.update": "Update Exam",
  "exams.delete": "Delete Exam",
  "exams.marks.enter": "Enter Marks",
  "exams.marks.view": "View Marks",
  "results.view": "View Results",
  "results.generate": "Generate Results",
  "results.publish": "Publish Results",
  "timetable.view": "View Timetable",
  "timetable.create": "Create Timetable",
  "timetable.update": "Update Timetable",
  "timetable.delete": "Delete Timetable",
  "academic.view": "View Academic Year",
  "academic.manage": "Manage Academic Year",
  "settings.view": "View Settings",
  "settings.manage": "Manage Settings",
  "logs.view": "View Logs",
  "messaging.send": "Send Messages",
};

// Permission icons based on action type
const getPermissionIcon = (permission: string) => {
  if (permission.includes(".view")) return <Visibility fontSize="small" />;
  if (permission.includes(".create") || permission.includes(".generate"))
    return <Add fontSize="small" />;
  if (
    permission.includes(".update") ||
    permission.includes(".edit") ||
    permission.includes(".mark")
  )
    return <Edit fontSize="small" />;
  if (permission.includes(".delete")) return <Delete fontSize="small" />;
  return <Security fontSize="small" />;
};

// Group icons
const groupIcons: Record<string, React.ReactNode> = {
  Dashboard: "📊",
  Users: "👥",
  Students: "🎓",
  Teachers: "👨‍🏫",
  Classes: "🏫",
  Sections: "📚",
  Subjects: "📖",
  Fees: "💰",
  Attendance: "📋",
  Complaints: "📝",
  Exams: "📝",
  Results: "🏆",
  Timetable: "🗓️",
  Settings: "⚙️",
};

const PREDEFINED_ROLES = [
  { value: "", label: "Custom Permissions (No Role)" },
  { value: "SUPER_ADMIN", label: "Super Admin - Full Access" },
  { value: "ADMIN", label: "Admin - Almost Full Access" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "VICE_PRINCIPAL", label: "Vice Principal" },
  { value: "TEACHER", label: "Teacher" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "CLERK", label: "Clerk" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "VIEWER", label: "Viewer - Read Only" },
];

export default function UserPermissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [defaultPermissions, setDefaultPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    Object.keys(permissionGroups)
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchUserPermissions();
  }, [id]);

  const fetchUserPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/permissions`);
      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        setCurrentPermissions(data.currentPermissions || []);
        setDefaultPermissions(data.defaultPermissions || []);
        setSelectedRole(data.user?.role || "");
      } else {
        toast.error(data.error || "Failed to fetch user permissions");
        router.push("/users");
      }
    } catch (error) {
      toast.error("Failed to fetch user permissions");
      router.push("/users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    if (role && rolePermissions[role]) {
      // Apply role's default permissions
      setCurrentPermissions(rolePermissions[role] as string[]);
    }
    setHasChanges(true);
  };

  const togglePermission = (permission: string) => {
    setCurrentPermissions((prev) => {
      if (prev.includes(permission)) {
        return prev.filter((p) => p !== permission);
      }
      return [...prev, permission];
    });
    setHasChanges(true);
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((g) => g !== groupName)
        : [...prev, groupName]
    );
  };

  const toggleAllInGroup = (permissions: Permission[]) => {
    const allSelected = permissions.every((p) =>
      currentPermissions.includes(p)
    );
    if (allSelected) {
      setCurrentPermissions((prev) =>
        prev.filter((p) => !permissions.includes(p as Permission))
      );
    } else {
      setCurrentPermissions((prev) => [
        ...prev,
        ...permissions.filter((p) => !prev.includes(p)),
      ]);
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: currentPermissions,
          role: selectedRole || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Permissions saved successfully");
        setHasChanges(false);
        fetchUserPermissions();
      } else {
        toast.error(data.error || "Failed to save permissions");
      }
    } catch (error) {
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const getPermissionStatus = (permission: string) => {
    const isCustomEnabled = currentPermissions.includes(permission);
    const isRoleDefault = defaultPermissions.includes(permission);
    return { isCustomEnabled, isRoleDefault };
  };

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
      <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            href="/users"
            color="inherit"
            sx={{
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Users
          </Link>
          <Typography color="text.primary">Permissions</Typography>
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
              onClick={() => router.push("/users")}
              sx={{ color: "white" }}
            >
              <ArrowBack />
            </IconButton>
            <Avatar
              sx={{ width: 60, height: 60, bgcolor: "rgba(255,255,255,0.2)" }}
            >
              <Person sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight="bold">
                {user?.name}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {user?.email}
              </Typography>
              <Chip
                label={user?.role || "No Role"}
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                }}
              />
            </Box>
            <Button
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Save />
                )
              }
              onClick={handleSave}
              disabled={saving || !hasChanges}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              Save Changes
            </Button>
          </Box>
        </Paper>

        {hasChanges && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You have unsaved changes. Click "Save Changes" to apply them.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Role Selection */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ position: "sticky", top: 80 }}>
              <CardHeader
                avatar={<Security color="primary" />}
                title="Quick Role Assignment"
                subheader="Select a predefined role or customize"
              />
              <CardContent>
                <FormControl fullWidth>
                  <InputLabel>Assign Role</InputLabel>
                  <Select
                    value={selectedRole}
                    label="Assign Role"
                    onChange={(e) => handleRoleChange(e.target.value)}
                  >
                    {PREDEFINED_ROLES.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Divider sx={{ my: 3 }} />

                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Permission Summary
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                  <Chip
                    icon={<CheckCircle />}
                    label={`${currentPermissions.length} Active`}
                    color="success"
                    size="small"
                  />
                  <Chip
                    icon={<Info />}
                    label={`${Object.values(Permission).length} Total`}
                    variant="outlined"
                    size="small"
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Legend
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    mt: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Switch
                      size="small"
                      checked
                      disabled
                      sx={{ "& .MuiSwitch-thumb": { bgcolor: "success.main" } }}
                    />
                    <Typography variant="caption">
                      Permission Enabled
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Switch size="small" disabled />
                    <Typography variant="caption">
                      Permission Disabled
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Permissions Grid */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardHeader
                title="Module Permissions"
                subheader="Toggle individual permissions for each module"
                action={
                  <Button
                    size="small"
                    onClick={() =>
                      setExpandedGroups(
                        expandedGroups.length ===
                          Object.keys(permissionGroups).length
                          ? []
                          : Object.keys(permissionGroups)
                      )
                    }
                  >
                    {expandedGroups.length ===
                    Object.keys(permissionGroups).length
                      ? "Collapse All"
                      : "Expand All"}
                  </Button>
                }
              />
              <CardContent sx={{ p: 0 }}>
                {Object.entries(permissionGroups).map(
                  ([groupName, permissions]) => {
                    const isExpanded = expandedGroups.includes(groupName);
                    const enabledCount = permissions.filter((p) =>
                      currentPermissions.includes(p)
                    ).length;
                    const allEnabled = enabledCount === permissions.length;
                    const someEnabled = enabledCount > 0 && !allEnabled;

                    return (
                      <Box key={groupName}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            p: 2,
                            bgcolor: isExpanded ? "primary.50" : "grey.50",
                            borderBottom: 1,
                            borderColor: "divider",
                            cursor: "pointer",
                            "&:hover": {
                              bgcolor: isExpanded ? "primary.100" : "grey.100",
                            },
                          }}
                          onClick={() => toggleGroup(groupName)}
                        >
                          <Typography variant="h6" sx={{ mr: 1 }}>
                            {groupIcons[groupName] || "📁"}
                          </Typography>
                          <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            sx={{ flex: 1 }}
                          >
                            {groupName}
                          </Typography>
                          <Chip
                            label={`${enabledCount}/${permissions.length}`}
                            size="small"
                            color={
                              allEnabled
                                ? "success"
                                : someEnabled
                                ? "warning"
                                : "default"
                            }
                            sx={{ mr: 2 }}
                          />
                          <Tooltip
                            title={allEnabled ? "Disable All" : "Enable All"}
                          >
                            <Switch
                              checked={allEnabled || someEnabled}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleAllInGroup(permissions);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              color={allEnabled ? "success" : "warning"}
                            />
                          </Tooltip>
                          {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </Box>

                        <Collapse in={isExpanded}>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: "grey.100" }}>
                                  <TableCell width={50}></TableCell>
                                  <TableCell>Permission</TableCell>
                                  <TableCell width={100} align="center">
                                    Status
                                  </TableCell>
                                  <TableCell width={100} align="center">
                                    Toggle
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {permissions.map((permission) => {
                                  const { isCustomEnabled, isRoleDefault } =
                                    getPermissionStatus(permission);

                                  return (
                                    <TableRow
                                      key={permission}
                                      sx={{
                                        "&:hover": { bgcolor: "grey.50" },
                                        bgcolor: isCustomEnabled
                                          ? "success.50"
                                          : "inherit",
                                      }}
                                    >
                                      <TableCell>
                                        <Box
                                          sx={{
                                            color: isCustomEnabled
                                              ? "success.main"
                                              : "grey.400",
                                          }}
                                        >
                                          {getPermissionIcon(permission)}
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Typography
                                          variant="body2"
                                          fontWeight={500}
                                        >
                                          {permissionLabels[permission] ||
                                            permission}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {permission}
                                        </Typography>
                                      </TableCell>
                                      <TableCell align="center">
                                        {isCustomEnabled ? (
                                          <Chip
                                            icon={<Check />}
                                            label="Enabled"
                                            size="small"
                                            color="success"
                                            variant="outlined"
                                          />
                                        ) : (
                                          <Chip
                                            icon={<Close />}
                                            label="Disabled"
                                            size="small"
                                            variant="outlined"
                                          />
                                        )}
                                      </TableCell>
                                      <TableCell align="center">
                                        <Switch
                                          checked={isCustomEnabled}
                                          onChange={() =>
                                            togglePermission(permission)
                                          }
                                          color="success"
                                          size="small"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Collapse>
                      </Box>
                    );
                  }
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
}
