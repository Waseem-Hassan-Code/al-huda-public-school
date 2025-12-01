"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  CircularProgress,
  Chip,
  Skeleton,
  Alert,
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  Edit as EditIcon,
  School as SchoolIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import ImageUpload from "@/components/common/ImageUpload";
import UserAvatar from "@/components/common/UserAvatar";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useAppDispatch } from "@/store";
import { updateUserAvatar } from "@/store/authSlice";

interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  avatar: string | null;
  phone: string | null;
  cnic: string | null;
  address: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  teacher: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    qualification: string;
    specialization: string | null;
    joiningDate: string;
    subjects: {
      subject: { name: string; code: string };
      class: { name: string } | null;
    }[];
  } | null;
  permissions: { permission: string }[];
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    avatar: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data.data);
        setFormData({
          name: data.data.name || "",
          phone: data.data.phone || "",
          address: data.data.address || "",
          avatar: data.data.avatar || "",
        });
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        // Update avatar in Redux store with the saved value
        const savedAvatar = data.data?.avatar || formData.avatar;
        if (savedAvatar) {
          dispatch(updateUserAvatar(savedAvatar));
        }
        toast.success("Profile updated successfully");
        setEditMode(false);
        fetchProfile();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        toast.success("Password changed successfully");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "error";
      case "PRINCIPAL":
        return "secondary";
      case "TEACHER":
        return "primary";
      case "ACCOUNTANT":
        return "warning";
      case "CLERK":
        return "info";
      default:
        return "default";
    }
  };

  if (!mounted || status === "loading") {
    return (
      <MainLayout>
        <Box sx={{ p: 3 }}>
          <Skeleton
            variant="rectangular"
            height={200}
            sx={{ mb: 3, borderRadius: 2 }}
          />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Skeleton
                variant="rectangular"
                height={400}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Skeleton
                variant="rectangular"
                height={400}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          </Grid>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box
        sx={{
          p: 3,
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
        }}
      >
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 3,
            background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
            color: "white",
            borderRadius: 3,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              position: "relative",
            }}
          >
            <UserAvatar
              src={profile?.avatar}
              name={profile?.name}
              size={100}
              sx={{
                border: "4px solid rgba(255,255,255,0.3)",
              }}
            />
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {profile?.name || "Loading..."}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mb: 1 }}>
                @{profile?.username}
              </Typography>
              <Chip
                icon={<AdminIcon sx={{ color: "inherit !important" }} />}
                label={profile?.role || "User"}
                color={getRoleBadgeColor(profile?.role || "") as any}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {/* Left Column - Profile Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                height: "100%",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Typography variant="h6" fontWeight={600}>
                    Profile Information
                  </Typography>
                  <IconButton
                    onClick={() => setEditMode(!editMode)}
                    color={editMode ? "primary" : "default"}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                </Box>

                {editMode && (
                  <Box
                    sx={{ mb: 3, display: "flex", justifyContent: "center" }}
                  >
                    <ImageUpload
                      value={formData.avatar}
                      onChange={(url) =>
                        setFormData({ ...formData, avatar: url || "" })
                      }
                      type="user"
                      name={profile?.name || undefined}
                    />
                  </Box>
                )}

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <EmailIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body2">{profile?.email}</Typography>
                    </Box>
                  </Box>

                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <PersonIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Full Name
                        </Typography>
                        <Typography variant="body2">{profile?.name}</Typography>
                      </Box>
                    </Box>
                  )}

                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <PhoneIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography variant="body2">
                          {profile?.phone || "Not set"}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {editMode ? (
                    <TextField
                      fullWidth
                      label="Address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      size="small"
                      multiline
                      rows={2}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <LocationIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Address
                        </Typography>
                        <Typography variant="body2">
                          {profile?.address || "Not set"}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <CalendarIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Member Since
                      </Typography>
                      <Typography variant="body2">
                        {profile?.createdAt
                          ? formatDate(profile.createdAt)
                          : "N/A"}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <CalendarIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Last Login
                      </Typography>
                      <Typography variant="body2">
                        {profile?.lastLogin
                          ? formatDate(profile.lastLogin)
                          : "N/A"}
                      </Typography>
                    </Box>
                  </Box>

                  {editMode && (
                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setEditMode(false);
                          setFormData({
                            name: profile?.name || "",
                            phone: profile?.phone || "",
                            address: profile?.address || "",
                            avatar: profile?.avatar || "",
                          });
                        }}
                        fullWidth
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleUpdateProfile}
                        disabled={saving}
                        startIcon={
                          saving ? <CircularProgress size={20} /> : <SaveIcon />
                        }
                        fullWidth
                      >
                        Save
                      </Button>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Grid container spacing={3}>
              {/* Teacher Information (if applicable) */}
              {profile?.teacher && (
                <Grid size={{ xs: 12 }}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 3,
                        }}
                      >
                        <SchoolIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                          Teacher Information
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <BadgeIcon color="action" />
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Employee ID
                              </Typography>
                              <Typography variant="body2">
                                {profile.teacher.employeeId}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <SchoolIcon color="action" />
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Qualification
                              </Typography>
                              <Typography variant="body2">
                                {profile.teacher.qualification}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        {profile.teacher.specialization && (
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <SchoolIcon color="action" />
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Specialization
                                </Typography>
                                <Typography variant="body2">
                                  {profile.teacher.specialization}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                        )}
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <CalendarIcon color="action" />
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Joining Date
                              </Typography>
                              <Typography variant="body2">
                                {formatDate(profile.teacher.joiningDate)}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>

                      {profile.teacher.subjects.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            Assigned Subjects
                          </Typography>
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                          >
                            {profile.teacher.subjects.map((ts, index) => (
                              <Chip
                                key={index}
                                label={`${ts.subject.name}${
                                  ts.class ? ` (${ts.class.name})` : ""
                                }`}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Change Password */}
              <Grid size={{ xs: 12 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 3,
                      }}
                    >
                      <LockIcon color="primary" />
                      <Typography variant="h6" fontWeight={600}>
                        Change Password
                      </Typography>
                    </Box>

                    <Alert severity="info" sx={{ mb: 3 }}>
                      For security reasons, you need to enter your current
                      password to change it.
                    </Alert>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Current Password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              currentPassword: e.target.value,
                            })
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowCurrentPassword(!showCurrentPassword)
                                  }
                                  edge="end"
                                >
                                  {showCurrentPassword ? (
                                    <VisibilityOff />
                                  ) : (
                                    <Visibility />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="New Password"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value,
                            })
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowNewPassword(!showNewPassword)
                                  }
                                  edge="end"
                                >
                                  {showNewPassword ? (
                                    <VisibilityOff />
                                  ) : (
                                    <Visibility />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Confirm New Password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value,
                            })
                          }
                          error={
                            passwordData.confirmPassword !== "" &&
                            passwordData.newPassword !==
                              passwordData.confirmPassword
                          }
                          helperText={
                            passwordData.confirmPassword !== "" &&
                            passwordData.newPassword !==
                              passwordData.confirmPassword
                              ? "Passwords do not match"
                              : ""
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                  edge="end"
                                >
                                  {showConfirmPassword ? (
                                    <VisibilityOff />
                                  ) : (
                                    <Visibility />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Button
                          variant="contained"
                          onClick={handleChangePassword}
                          disabled={
                            saving ||
                            !passwordData.currentPassword ||
                            !passwordData.newPassword ||
                            !passwordData.confirmPassword ||
                            passwordData.newPassword !==
                              passwordData.confirmPassword
                          }
                          startIcon={
                            saving ? (
                              <CircularProgress size={20} />
                            ) : (
                              <LockIcon />
                            )
                          }
                        >
                          Change Password
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Permissions (if any) */}
              {profile?.permissions && profile.permissions.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 3,
                        }}
                      >
                        <AdminIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                          Custom Permissions
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {profile.permissions.map((p, index) => (
                          <Chip
                            key={index}
                            label={p.permission.replace(/_/g, " ")}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
}
