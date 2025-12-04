"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Avatar,
  TextField,
  CircularProgress,
  alpha,
  Divider,
} from "@mui/material";
import {
  Sync as SyncIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  Subject as SubjectIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface SyncCounts {
  teachers: number;
  students: number;
  classes: number;
  subjects: number;
}

interface SyncLog {
  id: string;
  syncType: string;
  direction: string;
  status: string;
  recordsProcessed: number;
  recordsFailed: number;
  startedAt: any;
  completedAt?: any;
  error?: string;
  initiatedBy: string;
}

interface PendingRegistration {
  id: string;
  email: string;
  displayName: string;
  firebaseUid: string;
  deviceInfo?: string;
  requestedAt: string;
  status: string;
  teacher?: {
    id: string;
    name: string;
    employeeId: string;
    designation?: string;
    phone?: string;
    assignedClasses: { className: string; sectionName?: string }[];
    assignedSubjects: { subjectName: string; className: string }[];
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function FirebaseSyncPage() {
  const { data: session, status } = useSession();
  const [tabValue, setTabValue] = useState(0);
  const [counts, setCounts] = useState<SyncCounts | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<
    PendingRegistration[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: string;
    title: string;
    message: string;
  }>({ open: false, type: "", title: "", message: "" });
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    registration: PendingRegistration | null;
    reason: string;
  }>({ open: false, registration: null, reason: "" });

  const fetchSyncStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/firebase-sync");
      const data = await response.json();
      if (response.ok) {
        setCounts(data.counts);
      }
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSyncLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/firebase-sync?action=logs");
      const data = await response.json();
      if (response.ok) {
        setSyncLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch sync logs:", error);
    }
  }, []);

  const fetchPendingRegistrations = useCallback(async () => {
    try {
      const response = await fetch("/api/firebase-sync/teacher-approval");
      const data = await response.json();
      if (response.ok) {
        setPendingRegistrations(data.registrations || []);
      }
    } catch (error) {
      console.error("Failed to fetch pending registrations:", error);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSyncStatus();
      fetchSyncLogs();
      fetchPendingRegistrations();
    }
  }, [status, fetchSyncStatus, fetchSyncLogs, fetchPendingRegistrations]);

  const handleSync = async (type: string) => {
    setSyncing(true);
    setSyncType(type);
    try {
      const response = await fetch("/api/firebase-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncType: type }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(
          `Sync completed: ${data.recordsProcessed} records processed`
        );
        fetchSyncLogs();
        fetchSyncStatus();
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch (error) {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
      setSyncType(null);
      setConfirmDialog({ open: false, type: "", title: "", message: "" });
    }
  };

  const handleApproveRegistration = async (
    registration: PendingRegistration
  ) => {
    if (!registration.teacher) {
      toast.error("No matching teacher found in the system");
      return;
    }

    try {
      const response = await fetch("/api/firebase-sync/teacher-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: registration.id,
          action: "APPROVE",
          teacherId: registration.teacher.id,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Teacher registration approved");
        fetchPendingRegistrations();
      } else {
        toast.error(data.error || "Failed to approve registration");
      }
    } catch (error) {
      toast.error("Failed to approve registration");
    }
  };

  const handleRejectRegistration = async () => {
    if (!rejectDialog.registration) return;

    try {
      const response = await fetch("/api/firebase-sync/teacher-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: rejectDialog.registration.id,
          action: "REJECT",
          rejectionReason: rejectDialog.reason,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Teacher registration rejected");
        fetchPendingRegistrations();
        setRejectDialog({ open: false, registration: null, reason: "" });
      } else {
        toast.error(data.error || "Failed to reject registration");
      }
    } catch (error) {
      toast.error("Failed to reject registration");
    }
  };

  const openConfirmDialog = (type: string, title: string, message: string) => {
    setConfirmDialog({ open: true, type, title, message });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircleIcon color="success" fontSize="small" />;
      case "FAILED":
        return <ErrorIcon color="error" fontSize="small" />;
      case "IN_PROGRESS":
        return <CircularProgress size={16} />;
      default:
        return <InfoIcon color="info" fontSize="small" />;
    }
  };

  const getStatusColor = (
    status: string
  ): "success" | "error" | "warning" | "info" => {
    switch (status) {
      case "SUCCESS":
        return "success";
      case "FAILED":
        return "error";
      case "IN_PROGRESS":
        return "warning";
      default:
        return "info";
    }
  };

  if (status === "loading" || loading) {
    return (
      <MainLayout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48 }}>
            <SyncIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Firebase Sync
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage data synchronization between PostgreSQL and Firebase
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Sync Data" icon={<SyncIcon />} iconPosition="start" />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  Teacher Approvals
                  {pendingRegistrations.length > 0 && (
                    <Chip
                      label={pendingRegistrations.length}
                      size="small"
                      color="error"
                    />
                  )}
                </Box>
              }
              icon={<PersonIcon />}
              iconPosition="start"
            />
            <Tab
              label="Sync History"
              icon={<ScheduleIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          {/* Sync Status Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: (theme) =>
                    `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                  border: 1,
                  borderColor: "primary.light",
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography color="text.secondary" variant="body2">
                      Teachers
                    </Typography>
                    <Avatar
                      sx={{ bgcolor: "primary.main", width: 36, height: 36 }}
                    >
                      <PersonIcon fontSize="small" />
                    </Avatar>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {counts?.teachers || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active teachers to sync
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: (theme) =>
                    `linear-gradient(135deg, ${alpha(
                      theme.palette.success.main,
                      0.1
                    )} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                  border: 1,
                  borderColor: "success.light",
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography color="text.secondary" variant="body2">
                      Students
                    </Typography>
                    <Avatar
                      sx={{ bgcolor: "success.main", width: 36, height: 36 }}
                    >
                      <SchoolIcon fontSize="small" />
                    </Avatar>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {counts?.students || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active students to sync
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: (theme) =>
                    `linear-gradient(135deg, ${alpha(
                      theme.palette.info.main,
                      0.1
                    )} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                  border: 1,
                  borderColor: "info.light",
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography color="text.secondary" variant="body2">
                      Classes
                    </Typography>
                    <Avatar
                      sx={{ bgcolor: "info.main", width: 36, height: 36 }}
                    >
                      <ClassIcon fontSize="small" />
                    </Avatar>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {counts?.classes || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Classes to sync
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: (theme) =>
                    `linear-gradient(135deg, ${alpha(
                      theme.palette.warning.main,
                      0.1
                    )} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                  border: 1,
                  borderColor: "warning.light",
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography color="text.secondary" variant="body2">
                      Subjects
                    </Typography>
                    <Avatar
                      sx={{ bgcolor: "warning.main", width: 36, height: 36 }}
                    >
                      <SubjectIcon fontSize="small" />
                    </Avatar>
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {counts?.subjects || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Subject assignments to sync
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Sync Actions */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Push Data to Firebase
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sync data from PostgreSQL database to Firebase for mobile app
              access
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={
                    syncing && syncType === "FULL" ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <CloudUploadIcon />
                    )
                  }
                  onClick={() =>
                    openConfirmDialog(
                      "FULL",
                      "Full Sync",
                      "This will sync all teachers, students, classes, and subjects to Firebase. Continue?"
                    )
                  }
                  disabled={syncing}
                >
                  Full Sync
                </Button>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={
                    syncing && syncType === "TEACHERS" ? (
                      <CircularProgress size={20} />
                    ) : (
                      <PersonIcon />
                    )
                  }
                  onClick={() => handleSync("TEACHERS")}
                  disabled={syncing}
                >
                  Sync Teachers
                </Button>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={
                    syncing && syncType === "STUDENTS" ? (
                      <CircularProgress size={20} />
                    ) : (
                      <SchoolIcon />
                    )
                  }
                  onClick={() => handleSync("STUDENTS")}
                  disabled={syncing}
                >
                  Sync Students
                </Button>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={
                    syncing && syncType === "CLASSES" ? (
                      <CircularProgress size={20} />
                    ) : (
                      <ClassIcon />
                    )
                  }
                  onClick={() => handleSync("CLASSES")}
                  disabled={syncing}
                >
                  Sync Classes
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pull Data from Firebase
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sync attendance and results marked by teachers from mobile app to
              PostgreSQL
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={
                    syncing && syncType === "PULL_ATTENDANCE" ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <CloudDownloadIcon />
                    )
                  }
                  onClick={() => handleSync("PULL_ATTENDANCE")}
                  disabled={syncing}
                >
                  Pull Attendance
                </Button>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={
                    syncing && syncType === "PULL_RESULTS" ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <CloudDownloadIcon />
                    )
                  }
                  onClick={() => handleSync("PULL_RESULTS")}
                  disabled={syncing}
                >
                  Pull Results
                </Button>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={
                    syncing && syncType === "CLEANUP" ? (
                      <CircularProgress size={20} />
                    ) : (
                      <DeleteIcon />
                    )
                  }
                  onClick={() =>
                    openConfirmDialog(
                      "CLEANUP",
                      "Cleanup Old Data",
                      "This will delete synced attendance and result records older than 7 days from Firebase to save storage. Continue?"
                    )
                  }
                  disabled={syncing}
                >
                  Cleanup Firebase
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Firebase sync is used for the mobile app.
              Teachers can mark attendance and results on the mobile app, which
              are then synced back to the main database. Old synced records are
              automatically cleaned up to save Firebase storage.
            </Typography>
          </Alert>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Teacher Approvals */}
          <Paper sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="h6">
                Pending Teacher Registrations
              </Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={fetchPendingRegistrations}
              >
                Refresh
              </Button>
            </Box>

            {pendingRegistrations.length === 0 ? (
              <Alert severity="success">No pending teacher registrations</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Display Name</TableCell>
                      <TableCell>Matched Teacher</TableCell>
                      <TableCell>Assigned Classes</TableCell>
                      <TableCell>Requested At</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingRegistrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell>{reg.email}</TableCell>
                        <TableCell>{reg.displayName}</TableCell>
                        <TableCell>
                          {reg.teacher ? (
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {reg.teacher.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {reg.teacher.employeeId} -{" "}
                                {reg.teacher.designation}
                              </Typography>
                            </Box>
                          ) : (
                            <Chip label="No Match" color="error" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {reg.teacher?.assignedClasses.map((ac, idx) => (
                            <Chip
                              key={idx}
                              label={`${ac.className}${
                                ac.sectionName ? ` - ${ac.sectionName}` : ""
                              }`}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </TableCell>
                        <TableCell>{formatDate(reg.requestedAt)}</TableCell>
                        <TableCell>
                          <Tooltip title="Approve">
                            <IconButton
                              color="success"
                              onClick={() => handleApproveRegistration(reg)}
                              disabled={!reg.teacher}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              color="error"
                              onClick={() =>
                                setRejectDialog({
                                  open: true,
                                  registration: reg,
                                  reason: "",
                                })
                              }
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>How it works:</strong> When a teacher registers on the
              mobile app using their email, a pending registration is created.
              You must approve the registration for them to access the app. Only
              teachers whose email matches an existing teacher record in the
              system can be approved.
            </Typography>
          </Alert>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Sync History */}
          <Paper sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="h6">Sync History</Typography>
              <Button startIcon={<RefreshIcon />} onClick={fetchSyncLogs}>
                Refresh
              </Button>
            </Box>

            {syncLogs.length === 0 ? (
              <Alert severity="info">No sync history available</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Direction</TableCell>
                      <TableCell>Records Processed</TableCell>
                      <TableCell>Records Failed</TableCell>
                      <TableCell>Started</TableCell>
                      <TableCell>Completed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {getStatusIcon(log.status)}
                            <Chip
                              label={log.status}
                              size="small"
                              color={getStatusColor(log.status)}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>{log.syncType}</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              log.direction === "TO_FIREBASE" ? "Push" : "Pull"
                            }
                            size="small"
                            color={
                              log.direction === "TO_FIREBASE"
                                ? "primary"
                                : "success"
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{log.recordsProcessed}</TableCell>
                        <TableCell>
                          {log.recordsFailed > 0 ? (
                            <Chip
                              label={log.recordsFailed}
                              size="small"
                              color="error"
                            />
                          ) : (
                            log.recordsFailed
                          )}
                        </TableCell>
                        <TableCell>
                          {log.startedAt
                            ? formatDate(
                                log.startedAt.toDate?.() || log.startedAt
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {log.completedAt
                            ? formatDate(
                                log.completedAt.toDate?.() || log.completedAt
                              )
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </TabPanel>

        {/* Confirm Dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        >
          <DialogTitle>{confirmDialog.title}</DialogTitle>
          <DialogContent>
            <DialogContentText>{confirmDialog.message}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() =>
                setConfirmDialog({ ...confirmDialog, open: false })
              }
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => handleSync(confirmDialog.type)}
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Confirm"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog
          open={rejectDialog.open}
          onClose={() =>
            setRejectDialog({ open: false, registration: null, reason: "" })
          }
        >
          <DialogTitle>Reject Registration</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Please provide a reason for rejecting this registration.
            </DialogContentText>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Rejection Reason"
              value={rejectDialog.reason}
              onChange={(e) =>
                setRejectDialog({ ...rejectDialog, reason: e.target.value })
              }
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() =>
                setRejectDialog({ open: false, registration: null, reason: "" })
              }
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleRejectRegistration}
            >
              Reject
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
