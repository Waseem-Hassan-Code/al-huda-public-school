"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Avatar,
  Switch,
  FormControlLabel,
  Checkbox,
  Divider,
  FormGroup,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Close,
  Person,
  Security,
  FilterList,
  Refresh,
  Visibility,
  VisibilityOff,
  Key,
  ExpandMore,
  ExpandLess,
  Check,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import UserAvatar from "@/components/common/UserAvatar";
import ImageUpload from "@/components/common/ImageUpload";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  permissions: { permission: string }[];
}

// Helper function to parse name into firstName/lastName
const parseUserName = (name: string) => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }
  return {
    firstName: name,
    lastName: "",
  };
};

const ROLES = ["ADMIN", "TEACHER", "ACCOUNTANT", "RECEPTIONIST"];

const ALL_PERMISSIONS = [
  // Student permissions
  {
    category: "Students",
    permissions: [
      "students:view",
      "students:create",
      "students:edit",
      "students:delete",
      "students:export",
    ],
  },
  // Teachers permissions
  {
    category: "Teachers",
    permissions: [
      "teachers:view",
      "teachers:create",
      "teachers:edit",
      "teachers:delete",
    ],
  },
  // Classes permissions
  {
    category: "Classes",
    permissions: [
      "classes:view",
      "classes:create",
      "classes:edit",
      "classes:delete",
    ],
  },
  // Fees permissions
  {
    category: "Fees",
    permissions: [
      "fees:view",
      "fees:create",
      "fees:collect",
      "fees:edit",
      "fees:delete",
      "fees:generate",
    ],
  },
  // Attendance permissions
  {
    category: "Attendance",
    permissions: ["attendance:view", "attendance:mark", "attendance:edit"],
  },
  // Exams permissions
  {
    category: "Exams",
    permissions: [
      "exams:view",
      "exams:create",
      "exams:edit",
      "exams:delete",
      "results:view",
      "results:enter",
    ],
  },
  // Salary permissions
  {
    category: "Salary",
    permissions: ["salary:view", "salary:create", "salary:edit", "salary:pay"],
  },
  // Reports permissions
  { category: "Reports", permissions: ["reports:view", "reports:export"] },
  // Settings permissions
  {
    category: "Settings",
    permissions: [
      "settings:view",
      "settings:edit",
      "users:view",
      "users:create",
      "users:edit",
      "users:delete",
    ],
  },
];

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "TEACHER",
    isActive: true,
    avatar: "",
  });

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        toast.error(data.error || "Failed to fetch users");
      }
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      const { firstName, lastName } = parseUserName(user.name);
      setSelectedUser(user);
      setFormData({
        email: user.email,
        password: "",
        firstName,
        lastName,
        phone: user.phone || "",
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar || "",
      });
    } else {
      setSelectedUser(null);
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        role: "",
        isActive: true,
        avatar: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!selectedUser && !formData.password) {
      toast.error("Password is required for new users");
      return;
    }

    setSaving(true);
    try {
      const url = selectedUser ? `/api/users/${selectedUser.id}` : "/api/users";
      const method = selectedUser ? "PUT" : "POST";

      const body = { ...formData };
      if (selectedUser && !formData.password) {
        delete (body as Record<string, unknown>).password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          selectedUser
            ? "User updated successfully"
            : "User created successfully"
        );
        setDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to save user");
      }
    } catch (error) {
      toast.error("Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPermissionsDialog = async (user: User) => {
    setSelectedUser(user);
    try {
      const res = await fetch(`/api/users/${user.id}/permissions`);
      const data = await res.json();
      if (res.ok) {
        setSelectedPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error("Failed to fetch permissions");
    }
    setPermissionsDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });

      if (res.ok) {
        toast.success("Permissions updated successfully");
        setPermissionsDialogOpen(false);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update permissions");
      }
    } catch (error) {
      toast.error("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("User deleted successfully");
        setDeleteDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete user");
      }
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleCategoryPermissions = (permissions: string[]) => {
    const allSelected = permissions.every((p) =>
      selectedPermissions.includes(p)
    );
    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((p) => !permissions.includes(p))
      );
    } else {
      setSelectedPermissions((prev) => [
        ...prev,
        ...permissions.filter((p) => !prev.includes(p)),
      ]);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "error";
      case "TEACHER":
        return "primary";
      case "ACCOUNTANT":
        return "success";
      case "RECEPTIONIST":
        return "info";
      default:
        return "default";
    }
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
            User Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add User
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name or email..."
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
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={roleFilter}
                  label="Role"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  {ROLES.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
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
                    setRoleFilter("");
                    setStatusFilter("");
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchUsers}
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Users Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No users found</Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.100" }}>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <UserAvatar
                          src={user.avatar}
                          name={user.name}
                          size="sm"
                          showBadge
                          badgeColor={user.isActive ? "success" : "default"}
                        />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.name}
                          </Typography>
                          {user.phone && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {user.phone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        color={
                          getRoleColor(user.role) as
                            | "error"
                            | "primary"
                            | "success"
                            | "info"
                            | "default"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? "Active" : "Inactive"}
                        size="small"
                        color={user.isActive ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Click to manage permissions">
                        <Chip
                          icon={<Security />}
                          label={
                            user.permissions?.length
                              ? `${user.permissions.length} permissions`
                              : "No permissions"
                          }
                          size="small"
                          color={
                            user.permissions?.length ? "primary" : "warning"
                          }
                          variant={
                            user.permissions?.length ? "filled" : "outlined"
                          }
                          onClick={() =>
                            router.push(`/users/${user.id}/permissions`)
                          }
                          sx={{ cursor: "pointer" }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <Tooltip title="Manage Permissions">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() =>
                              router.push(`/users/${user.id}/permissions`)
                            }
                          >
                            <Security />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(user)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              {selectedUser ? "Edit User" : "Add New User"}
              <IconButton onClick={() => setDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Avatar Upload */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <ImageUpload
                    value={formData.avatar}
                    onChange={(url) =>
                      setFormData({ ...formData, avatar: url || "" })
                    }
                    type="user"
                    name={
                      `${formData.firstName} ${formData.lastName}`.trim() ||
                      undefined
                    }
                    size={100}
                  />
                </Box>
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
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label={
                    selectedUser
                      ? "New Password (leave blank to keep current)"
                      : "Password"
                  }
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!selectedUser}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Role (Optional)</InputLabel>
                  <Select
                    value={formData.role}
                    label="Role (Optional)"
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                  >
                    <MenuItem value="">
                      <em>No Role - Custom Permissions</em>
                    </MenuItem>
                    {ROLES.map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={24} /> : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog
          open={permissionsDialogOpen}
          onClose={() => setPermissionsDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box>
                Manage Permissions
                {selectedUser && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.name} ({selectedUser.role})
                  </Typography>
                )}
              </Box>
              <IconButton onClick={() => setPermissionsDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ maxHeight: 400 }}>
            <List>
              {ALL_PERMISSIONS.map((category) => {
                const isExpanded = expandedCategories.includes(
                  category.category
                );
                const selectedCount = category.permissions.filter((p) =>
                  selectedPermissions.includes(p)
                ).length;
                const allSelected =
                  selectedCount === category.permissions.length;

                return (
                  <Box key={category.category}>
                    <ListItem
                      onClick={() => toggleCategory(category.category)}
                      sx={{
                        cursor: "pointer",
                        bgcolor: "grey.50",
                        "&:hover": { bgcolor: "grey.100" },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          checked={allSelected}
                          indeterminate={selectedCount > 0 && !allSelected}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategoryPermissions(category.permissions);
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={category.category}
                        secondary={`${selectedCount}/${category.permissions.length} selected`}
                      />
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </ListItem>
                    <Collapse in={isExpanded}>
                      <List disablePadding>
                        {category.permissions.map((permission) => (
                          <ListItem
                            key={permission}
                            sx={{ pl: 4 }}
                            onClick={() => togglePermission(permission)}
                            dense
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Checkbox
                                checked={selectedPermissions.includes(
                                  permission
                                )}
                                size="small"
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={permission}
                              primaryTypographyProps={{ variant: "body2" }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Collapse>
                    <Divider />
                  </Box>
                );
              })}
            </List>
          </DialogContent>
          <DialogActions>
            <Box sx={{ flex: 1, pl: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedPermissions.length} permissions selected
              </Typography>
            </Box>
            <Button onClick={() => setPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSavePermissions}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : "Save Permissions"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete user{" "}
              <strong>{selectedUser?.name}</strong>? This action cannot be
              undone.
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
