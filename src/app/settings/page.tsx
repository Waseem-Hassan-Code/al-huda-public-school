"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import {
  Save as SaveIcon,
  School as SchoolIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle,
  Warning as WarningIcon,
  DeleteForever as DeleteForeverIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean;
}

interface SchoolSettings {
  name: string;
  nameUrdu: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  principalName: string;
  academicYear: string;
  sessionStartMonth: number;
  sessionEndMonth: number;
}

interface FeeSettings {
  defaultLateFee: number;
  lateFeeAfterDays: number;
  feeReminderDays: number;
  allowPartialPayment: boolean;
  generateMonthlyVouchers: boolean;
  voucherGenerationDay: number;
  voucherDueDay: number;
}

interface AttendanceSettings {
  workingDays: string[];
  schoolStartTime: string;
  schoolEndTime: string;
  lateThresholdMinutes: number;
  halfDayThresholdHours: number;
}

interface NotificationSettings {
  sendFeeReminders: boolean;
  sendAttendanceAlerts: boolean;
  sendResultNotifications: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
}

const DAYS_OF_WEEK = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [saving, setSaving] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    name: "Al-Huda Public School",
    nameUrdu: "الھدیٰ پبلک سکول",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo: "",
    principalName: "",
    academicYear: new Date().getFullYear().toString(),
    sessionStartMonth: 4,
    sessionEndMonth: 3,
  });

  const [feeSettings, setFeeSettings] = useState<FeeSettings>({
    defaultLateFee: 500,
    lateFeeAfterDays: 10,
    feeReminderDays: 5,
    allowPartialPayment: true,
    generateMonthlyVouchers: true,
    voucherGenerationDay: 1,
    voucherDueDay: 10,
  });

  const [attendanceSettings, setAttendanceSettings] =
    useState<AttendanceSettings>({
      workingDays: [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ],
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      lateThresholdMinutes: 15,
      halfDayThresholdHours: 4,
    });

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      sendFeeReminders: true,
      sendAttendanceAlerts: true,
      sendResultNotifications: true,
      smsEnabled: false,
      emailEnabled: true,
    });

  // Academic Year state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(true);
  const [academicYearDialogOpen, setAcademicYearDialogOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] =
    useState<AcademicYear | null>(null);
  const [academicYearForm, setAcademicYearForm] = useState({
    name: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
    isCurrent: false,
  });
  const [savingAcademicYear, setSavingAcademicYear] = useState(false);

  // Database cleanup state
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupPassword, setCleanupPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cleaningDatabase, setCleaningDatabase] = useState(false);
  const [cleanupConfirmText, setCleanupConfirmText] = useState("");

  // Fetch academic years
  const fetchAcademicYears = useCallback(async () => {
    try {
      setLoadingAcademicYears(true);
      const res = await fetch("/api/academic-years");
      const data = await res.json();
      if (res.ok) {
        setAcademicYears(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch academic years", error);
    } finally {
      setLoadingAcademicYears(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSchoolSettings = localStorage.getItem("schoolSettings");
      const savedFeeSettings = localStorage.getItem("feeSettings");
      const savedAttendanceSettings =
        localStorage.getItem("attendanceSettings");
      const savedNotificationSettings = localStorage.getItem(
        "notificationSettings"
      );

      if (savedSchoolSettings)
        setSchoolSettings(JSON.parse(savedSchoolSettings));
      if (savedFeeSettings) setFeeSettings(JSON.parse(savedFeeSettings));
      if (savedAttendanceSettings)
        setAttendanceSettings(JSON.parse(savedAttendanceSettings));
      if (savedNotificationSettings)
        setNotificationSettings(JSON.parse(savedNotificationSettings));
    }
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save to localStorage (in production, this would go to API)
      localStorage.setItem("schoolSettings", JSON.stringify(schoolSettings));
      localStorage.setItem("feeSettings", JSON.stringify(feeSettings));
      localStorage.setItem(
        "attendanceSettings",
        JSON.stringify(attendanceSettings)
      );
      localStorage.setItem(
        "notificationSettings",
        JSON.stringify(notificationSettings)
      );

      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleWorkingDaysChange = (day: string) => {
    setAttendanceSettings((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  // Academic Year functions
  const handleOpenAcademicYearDialog = (academicYear?: AcademicYear) => {
    if (academicYear) {
      setSelectedAcademicYear(academicYear);
      setAcademicYearForm({
        name: academicYear.name,
        startDate: new Date(academicYear.startDate),
        endDate: new Date(academicYear.endDate),
        isCurrent: academicYear.isCurrent,
      });
    } else {
      setSelectedAcademicYear(null);
      const now = new Date();
      const nextYear = new Date(
        now.getFullYear() + 1,
        now.getMonth(),
        now.getDate()
      );
      setAcademicYearForm({
        name: `${now.getFullYear()}-${now.getFullYear() + 1}`,
        startDate: now,
        endDate: nextYear,
        isCurrent: academicYears.length === 0,
      });
    }
    setAcademicYearDialogOpen(true);
  };

  const handleSaveAcademicYear = async () => {
    if (
      !academicYearForm.name ||
      !academicYearForm.startDate ||
      !academicYearForm.endDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSavingAcademicYear(true);
    try {
      const url = "/api/academic-years";
      const method = selectedAcademicYear ? "PUT" : "POST";
      const body = selectedAcademicYear
        ? { id: selectedAcademicYear.id, ...academicYearForm }
        : academicYearForm;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          selectedAcademicYear
            ? "Academic year updated"
            : "Academic year created"
        );
        setAcademicYearDialogOpen(false);
        fetchAcademicYears();
      } else {
        toast.error(data.error || "Failed to save academic year");
      }
    } catch (error) {
      toast.error("Failed to save academic year");
    } finally {
      setSavingAcademicYear(false);
    }
  };

  const handleSetCurrentSession = async (academicYear: AcademicYear) => {
    try {
      const res = await fetch("/api/academic-years", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: academicYear.id, isCurrent: true }),
      });

      if (res.ok) {
        toast.success(`${academicYear.name} is now the active session`);
        fetchAcademicYears();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update session");
      }
    } catch (error) {
      toast.error("Failed to update session");
    }
  };

  const handleDeleteAcademicYear = async (id: string) => {
    if (!confirm("Are you sure you want to delete this academic year?")) return;

    try {
      const res = await fetch(`/api/academic-years?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Academic year deleted");
        fetchAcademicYears();
      } else {
        toast.error(data.error || "Failed to delete academic year");
      }
    } catch (error) {
      toast.error("Failed to delete academic year");
    }
  };

  // Database cleanup handler
  const handleDatabaseCleanup = async () => {
    if (cleanupConfirmText !== "DELETE ALL DATA") {
      toast.error("Please type 'DELETE ALL DATA' to confirm");
      return;
    }

    if (!cleanupPassword) {
      toast.error("Please enter your admin password");
      return;
    }

    setCleaningDatabase(true);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: cleanupPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          `Database cleaned successfully. ${data.totalDeleted} records deleted.`
        );
        setCleanupDialogOpen(false);
        setCleanupPassword("");
        setCleanupConfirmText("");
        // Refresh academic years as we created a new default one
        fetchAcademicYears();
      } else {
        toast.error(data.error || "Failed to clean database");
      }
    } catch (error) {
      toast.error("Failed to clean database");
    } finally {
      setCleaningDatabase(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
            System Settings
          </Typography>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save All Settings"}
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Changes to settings will take effect immediately after saving.
        </Alert>

        <Grid container spacing={3}>
          {/* School Information */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardHeader
                avatar={<SchoolIcon color="primary" />}
                title="School Information"
                subheader="Basic school details and branding"
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="School Name (English)"
                      value={schoolSettings.name}
                      onChange={(e) =>
                        setSchoolSettings({
                          ...schoolSettings,
                          name: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="School Name (Urdu)"
                      value={schoolSettings.nameUrdu}
                      onChange={(e) =>
                        setSchoolSettings({
                          ...schoolSettings,
                          nameUrdu: e.target.value,
                        })
                      }
                      dir="rtl"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={schoolSettings.address}
                      onChange={(e) =>
                        setSchoolSettings({
                          ...schoolSettings,
                          address: e.target.value,
                        })
                      }
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={schoolSettings.phone}
                      onChange={(e) =>
                        setSchoolSettings({
                          ...schoolSettings,
                          phone: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={schoolSettings.email}
                      onChange={(e) =>
                        setSchoolSettings({
                          ...schoolSettings,
                          email: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={schoolSettings.website}
                      onChange={(e) =>
                        setSchoolSettings({
                          ...schoolSettings,
                          website: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Principal Name"
                      value={schoolSettings.principalName}
                      onChange={(e) =>
                        setSchoolSettings({
                          ...schoolSettings,
                          principalName: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="Academic Year"
                      value={schoolSettings.academicYear}
                      onChange={(e) =>
                        setSchoolSettings({
                          ...schoolSettings,
                          academicYear: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Session Start Month</InputLabel>
                      <Select
                        value={schoolSettings.sessionStartMonth}
                        label="Session Start Month"
                        onChange={(e) =>
                          setSchoolSettings({
                            ...schoolSettings,
                            sessionStartMonth: e.target.value as number,
                          })
                        }
                      >
                        {MONTHS.map((month) => (
                          <MenuItem key={month.value} value={month.value}>
                            {month.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Session End Month</InputLabel>
                      <Select
                        value={schoolSettings.sessionEndMonth}
                        label="Session End Month"
                        onChange={(e) =>
                          setSchoolSettings({
                            ...schoolSettings,
                            sessionEndMonth: e.target.value as number,
                          })
                        }
                      >
                        {MONTHS.map((month) => (
                          <MenuItem key={month.value} value={month.value}>
                            {month.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Fee Settings */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardHeader
                avatar={<PaymentIcon color="primary" />}
                title="Fee Settings"
                subheader="Configure fee collection and voucher generation"
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Default Late Fee (PKR)"
                      value={feeSettings.defaultLateFee}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          defaultLateFee: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Late Fee After (Days)"
                      value={feeSettings.lateFeeAfterDays}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          lateFeeAfterDays: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Fee Reminder Before (Days)"
                      value={feeSettings.feeReminderDays}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          feeReminderDays: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Voucher Generation Day"
                      value={feeSettings.voucherGenerationDay}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          voucherGenerationDay: parseInt(e.target.value) || 1,
                        })
                      }
                      helperText="Day of month to generate vouchers"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Voucher Due Day"
                      value={feeSettings.voucherDueDay}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          voucherDueDay: parseInt(e.target.value) || 10,
                        })
                      }
                      helperText="Day of month when fee is due"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={feeSettings.allowPartialPayment}
                          onChange={(e) =>
                            setFeeSettings({
                              ...feeSettings,
                              allowPartialPayment: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Allow Partial Payment"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={feeSettings.generateMonthlyVouchers}
                          onChange={(e) =>
                            setFeeSettings({
                              ...feeSettings,
                              generateMonthlyVouchers: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Auto-generate Monthly Fee Vouchers"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Attendance Settings */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardHeader
                avatar={<ScheduleIcon color="primary" />}
                title="Attendance Settings"
                subheader="Configure school timings and attendance rules"
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="time"
                      label="School Start Time"
                      value={attendanceSettings.schoolStartTime}
                      onChange={(e) =>
                        setAttendanceSettings({
                          ...attendanceSettings,
                          schoolStartTime: e.target.value,
                        })
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="time"
                      label="School End Time"
                      value={attendanceSettings.schoolEndTime}
                      onChange={(e) =>
                        setAttendanceSettings({
                          ...attendanceSettings,
                          schoolEndTime: e.target.value,
                        })
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Late Threshold (Minutes)"
                      value={attendanceSettings.lateThresholdMinutes}
                      onChange={(e) =>
                        setAttendanceSettings({
                          ...attendanceSettings,
                          lateThresholdMinutes: parseInt(e.target.value) || 0,
                        })
                      }
                      helperText="Minutes after start time to mark as late"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Half Day Threshold (Hours)"
                      value={attendanceSettings.halfDayThresholdHours}
                      onChange={(e) =>
                        setAttendanceSettings({
                          ...attendanceSettings,
                          halfDayThresholdHours: parseInt(e.target.value) || 0,
                        })
                      }
                      helperText="Hours present to count as half day"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Working Days
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {DAYS_OF_WEEK.map((day) => (
                        <FormControlLabel
                          key={day.value}
                          control={
                            <Switch
                              checked={attendanceSettings.workingDays.includes(
                                day.value
                              )}
                              onChange={() =>
                                handleWorkingDaysChange(day.value)
                              }
                              size="small"
                            />
                          }
                          label={day.label}
                        />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Notification Settings */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardHeader
                avatar={<NotificationsIcon color="primary" />}
                title="Notification Settings"
                subheader="Configure alerts and reminders"
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.sendFeeReminders}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              sendFeeReminders: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Send Fee Reminders"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.sendAttendanceAlerts}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              sendAttendanceAlerts: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Send Attendance Alerts"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.sendResultNotifications}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              sendResultNotifications: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Send Result Notifications"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Notification Channels
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.smsEnabled}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              smsEnabled: e.target.checked,
                            })
                          }
                        />
                      }
                      label="SMS Notifications"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.emailEnabled}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              emailEnabled: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Email Notifications"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Academic Sessions */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                avatar={<CalendarIcon color="primary" />}
                title="Academic Sessions"
                subheader="Manage academic years and set the active session"
                action={
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenAcademicYearDialog()}
                    size="small"
                  >
                    Add Session
                  </Button>
                }
              />
              <CardContent>
                {loadingAcademicYears ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", py: 3 }}
                  >
                    <CircularProgress />
                  </Box>
                ) : academicYears.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 3 }}>
                    <Typography color="text.secondary" gutterBottom>
                      No academic sessions found
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenAcademicYearDialog()}
                    >
                      Create First Session
                    </Button>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Session Name</TableCell>
                          <TableCell>Start Date</TableCell>
                          <TableCell>End Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {academicYears.map((year) => (
                          <TableRow key={year.id} hover>
                            <TableCell>
                              <Typography
                                fontWeight={year.isCurrent ? "bold" : "normal"}
                              >
                                {year.name}
                              </Typography>
                            </TableCell>
                            <TableCell>{formatDate(year.startDate)}</TableCell>
                            <TableCell>{formatDate(year.endDate)}</TableCell>
                            <TableCell>
                              {year.isCurrent ? (
                                <Chip
                                  icon={<CheckCircle />}
                                  label="Active Session"
                                  color="success"
                                  size="small"
                                />
                              ) : year.isActive ? (
                                <Chip label="Inactive" size="small" />
                              ) : (
                                <Chip
                                  label="Archived"
                                  size="small"
                                  color="default"
                                />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: 0.5,
                                }}
                              >
                                {!year.isCurrent && year.isActive && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    onClick={() =>
                                      handleSetCurrentSession(year)
                                    }
                                  >
                                    Set Active
                                  </Button>
                                )}
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleOpenAcademicYearDialog(year)
                                  }
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                {!year.isCurrent && (
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      handleDeleteAcademicYear(year.id)
                                    }
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Danger Zone */}
          {session?.user?.role === "ADMIN" && (
            <Grid size={{ xs: 12 }}>
              <Card sx={{ border: "1px solid", borderColor: "error.main" }}>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <WarningIcon color="error" />
                      <Typography variant="h6" color="error">
                        Danger Zone
                      </Typography>
                    </Box>
                  }
                  subheader="Irreversible actions that affect your data"
                />
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 2,
                      bgcolor: "error.50",
                      borderRadius: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Clean Database
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Delete all data except users, roles, and settings. This
                        action cannot be undone.
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={() => setCleanupDialogOpen(true)}
                    >
                      Clean All Data
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Academic Year Dialog */}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Dialog
            open={academicYearDialogOpen}
            onClose={() => setAcademicYearDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {selectedAcademicYear
                ? "Edit Academic Session"
                : "Create Academic Session"}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Session Name"
                    value={academicYearForm.name}
                    onChange={(e) =>
                      setAcademicYearForm({
                        ...academicYearForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g., 2024-2025"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Start Date"
                    value={academicYearForm.startDate}
                    onChange={(date) =>
                      setAcademicYearForm({
                        ...academicYearForm,
                        startDate: date,
                      })
                    }
                    slotProps={{
                      textField: { fullWidth: true, required: true },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="End Date"
                    value={academicYearForm.endDate}
                    onChange={(date) =>
                      setAcademicYearForm({
                        ...academicYearForm,
                        endDate: date,
                      })
                    }
                    slotProps={{
                      textField: { fullWidth: true, required: true },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={academicYearForm.isCurrent}
                        onChange={(e) =>
                          setAcademicYearForm({
                            ...academicYearForm,
                            isCurrent: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Set as active session (this will deactivate other sessions)"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAcademicYearDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveAcademicYear}
                disabled={savingAcademicYear}
              >
                {savingAcademicYear ? <CircularProgress size={24} /> : "Save"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Database Cleanup Dialog */}
          <Dialog
            open={cleanupDialogOpen}
            onClose={() => {
              setCleanupDialogOpen(false);
              setCleanupPassword("");
              setCleanupConfirmText("");
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ bgcolor: "error.main", color: "white" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <WarningIcon />
                <Typography variant="h6">Danger: Clean Database</Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Warning: This action is irreversible!
                </Typography>
                <Typography variant="body2">
                  This will permanently delete all data including:
                </Typography>
                <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                  <li>All students and their records</li>
                  <li>All teachers (User accounts will be kept)</li>
                  <li>All classes, sections, and subjects</li>
                  <li>All fee vouchers and payments</li>
                  <li>All attendance records</li>
                  <li>All exams and results</li>
                  <li>All salary records</li>
                  <li>All complaints and logs</li>
                </ul>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="success.main"
                >
                  The following will NOT be deleted: User accounts, roles, and
                  school settings.
                </Typography>
              </Alert>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Type <strong>DELETE ALL DATA</strong> to confirm:
              </Typography>
              <TextField
                fullWidth
                value={cleanupConfirmText}
                onChange={(e) => setCleanupConfirmText(e.target.value)}
                placeholder="Type DELETE ALL DATA"
                sx={{ mb: 2 }}
                error={
                  cleanupConfirmText !== "" &&
                  cleanupConfirmText !== "DELETE ALL DATA"
                }
              />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Enter your admin password to proceed:
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? "text" : "password"}
                value={cleanupPassword}
                onChange={(e) => setCleanupPassword(e.target.value)}
                placeholder="Admin Password"
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
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button
                onClick={() => {
                  setCleanupDialogOpen(false);
                  setCleanupPassword("");
                  setCleanupConfirmText("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDatabaseCleanup}
                disabled={
                  cleaningDatabase ||
                  cleanupConfirmText !== "DELETE ALL DATA" ||
                  !cleanupPassword
                }
                startIcon={
                  cleaningDatabase ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <DeleteForeverIcon />
                  )
                }
              >
                {cleaningDatabase ? "Cleaning..." : "Clean Database"}
              </Button>
            </DialogActions>
          </Dialog>
        </LocalizationProvider>
      </Box>
    </MainLayout>
  );
}
