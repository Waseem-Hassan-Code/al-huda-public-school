"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
  Tab,
  Tabs,
  Tooltip,
  InputAdornment,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  Send as SendIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  CheckCircle,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";

interface Student {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  class?: { name: string };
  section?: { name: string };
  guardianName: string;
  guardianPhone: string;
  guardianWhatsapp?: string;
  photo?: string;
}

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface MessageHistory {
  id: string;
  type: string;
  status: string;
  content: string;
  templateName?: string;
  recipientName: string;
  recipientPhone: string;
  createdAt: string;
  sentAt?: string;
  errorMessage?: string;
  student: {
    firstName: string;
    lastName: string;
    registrationNo: string;
    class?: { name: string };
    section?: { name: string };
  };
  sentBy: {
    firstName: string;
    lastName: string;
  };
}

interface MessagingSettings {
  whatsappNumber?: string;
  whatsappEnabled: boolean;
  whatsappConfigured: boolean;
  smsNumber?: string;
  smsEnabled: boolean;
  smsConfigured: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`messaging-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// Message templates with placeholders
const MESSAGE_TEMPLATES = [
  {
    id: "fee_reminder",
    title: "Fee Reminder",
    message: "Dear {guardianName}, this is a reminder that {studentName}'s ({className}) monthly fee is due. Please pay at your earliest convenience. - Al-Huda Public School",
  },
  {
    id: "absent_notice",
    title: "Absent Notice",
    message: "Dear {guardianName}, your child {studentName} ({className}) was marked absent today ({date}). Please contact the school if there are any concerns. - Al-Huda Public School",
  },
  {
    id: "late_arrival",
    title: "Late Arrival",
    message: "Dear {guardianName}, your child {studentName} ({className}) arrived late to school today ({date}). Please ensure punctuality. - Al-Huda Public School",
  },
  {
    id: "ptm_notice",
    title: "PTM Notice",
    message: "Dear {guardianName}, you are invited to attend the Parent-Teacher Meeting for {studentName} ({className}) scheduled for [DATE]. Your presence is important. - Al-Huda Public School",
  },
  {
    id: "exam_schedule",
    title: "Exam Schedule",
    message: "Dear {guardianName}, please note that exams for {studentName} ({className}) will begin from [DATE]. Kindly ensure proper preparation. - Al-Huda Public School",
  },
  {
    id: "result_announcement",
    title: "Result Announcement",
    message: "Dear {guardianName}, the exam results for {studentName} ({className}) have been announced. Please visit the school to collect the report card. - Al-Huda Public School",
  },
  {
    id: "holiday_notice",
    title: "Holiday Notice",
    message: "Dear {guardianName}, please note that the school will remain closed on [DATE] due to [REASON]. Classes will resume on [DATE]. - Al-Huda Public School",
  },
  {
    id: "general",
    title: "General Message",
    message: "Dear {guardianName}, [Your message here]. - Al-Huda Public School",
  },
];

export default function MessagingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [messageType, setMessageType] = useState<"whatsapp" | "sms">("whatsapp");
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [selectAll, setSelectAll] = useState(false);
  
  // Message history state
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState<MessagingSettings | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    whatsappNumber: "",
    whatsappApiKey: "",
    whatsappEnabled: false,
    smsNumber: "",
    smsApiKey: "",
    smsEnabled: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [classesRes, studentsRes, settingsRes] = await Promise.all([
          fetch("/api/classes"),
          fetch("/api/students?limit=1000"),
          fetch("/api/messaging/settings"),
        ]);

        if (classesRes.ok) {
          const data = await classesRes.json();
          setClasses(data.classes || []);
        }

        if (studentsRes.ok) {
          const data = await studentsRes.json();
          setStudents(data.data || []);
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data);
          setSettingsForm({
            whatsappNumber: data.whatsappNumber || "",
            whatsappApiKey: "",
            whatsappEnabled: data.whatsappEnabled || false,
            smsNumber: data.smsNumber || "",
            smsApiKey: "",
            smsEnabled: data.smsEnabled || false,
          });
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  // Fetch message history
  const fetchMessageHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/messaging?limit=50");
      if (res.ok) {
        const data = await res.json();
        setMessageHistory(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch message history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchMessageHistory();
    }
  }, [status]);

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchLower) ||
        student.registrationNo.toLowerCase().includes(searchLower) ||
        student.guardianName.toLowerCase().includes(searchLower) ||
        student.guardianPhone.includes(searchQuery) ||
        student.fatherName.toLowerCase().includes(searchLower);

      const matchesClass =
        !selectedClass ||
        student.class?.name === classes.find((c) => c.id === selectedClass)?.name;
      const matchesSection =
        !selectedSection ||
        student.section?.name ===
          classes
            .find((c) => c.id === selectedClass)
            ?.sections.find((s) => s.id === selectedSection)?.name;

      return matchesSearch && matchesClass && matchesSection;
    });
  }, [students, searchQuery, selectedClass, selectedSection, classes]);

  const selectedClassData = classes.find((c) => c.id === selectedClass);
  const sections = selectedClassData?.sections || [];

  const handleStudentSelect = (student: Student) => {
    const isSelected = selectedStudents.some((s) => s.id === student.id);
    if (isSelected) {
      setSelectedStudents(selectedStudents.filter((s) => s.id !== student.id));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents);
    }
    setSelectAll(!selectAll);
  };

  const handleRemoveSelected = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter((s) => s.id !== studentId));
  };

  const handleClearSelection = () => {
    setSelectedStudents([]);
    setSelectAll(false);
  };

  // Apply template with student data
  const applyTemplate = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    
    // If only one student is selected, populate with their data
    if (selectedStudents.length === 1) {
      const student = selectedStudents[0];
      const today = new Date().toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      
      let populatedMessage = template.message
        .replace("{guardianName}", student.guardianName)
        .replace("{studentName}", `${student.firstName} ${student.lastName}`)
        .replace("{className}", `${student.class?.name || ""} ${student.section?.name || ""}`.trim())
        .replace("{date}", today);
      
      setMessage(populatedMessage);
    } else {
      // For multiple students, show template with placeholders
      setMessage(template.message);
    }
  };

  // Personalize message for each student
  const personalizeMessage = (student: Student, baseMessage: string): string => {
    const today = new Date().toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    
    return baseMessage
      .replace(/{guardianName}/g, student.guardianName)
      .replace(/{studentName}/g, `${student.firstName} ${student.lastName}`)
      .replace(/{className}/g, `${student.class?.name || ""} ${student.section?.name || ""}`.trim())
      .replace(/{date}/g, today);
  };

  const handleSendMessage = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    // Check if messaging is configured
    if (messageType === "whatsapp" && !settings?.whatsappEnabled) {
      toast.error("WhatsApp is not configured. Please configure it in settings.");
      setSettingsDialogOpen(true);
      return;
    }

    if (messageType === "sms" && !settings?.smsEnabled) {
      toast.error("SMS is not configured. Please configure it in settings.");
      setSettingsDialogOpen(true);
      return;
    }

    setSending(true);

    try {
      // Prepare recipients with personalized messages
      const recipients = selectedStudents.map((student) => ({
        studentId: student.id,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        guardianWhatsapp: student.guardianWhatsapp,
        personalizedMessage: personalizeMessage(student, message),
      }));

      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: messageType.toUpperCase(),
          content: message, // Base message
          templateName: selectedTemplate || undefined,
          recipients,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        setMessage("");
        setSelectedTemplate("");
        fetchMessageHistory(); // Refresh history
      } else {
        toast.error(data.error || "Failed to send messages");
      }
    } catch (error) {
      toast.error("Failed to send messages");
    } finally {
      setSending(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/messaging/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Settings saved successfully");
        setSettings({
          whatsappNumber: data.whatsappNumber,
          whatsappEnabled: data.whatsappEnabled,
          whatsappConfigured: data.whatsappConfigured,
          smsNumber: data.smsNumber,
          smsEnabled: data.smsEnabled,
          smsConfigured: data.smsConfigured,
        });
        setSettingsDialogOpen(false);
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SENT":
      case "DELIVERED":
        return "success";
      case "PENDING":
        return "warning";
      case "FAILED":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SENT":
      case "DELIVERED":
        return <CheckCircle fontSize="small" color="success" />;
      case "PENDING":
        return <ScheduleIcon fontSize="small" color="warning" />;
      case "FAILED":
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return null;
    }
  };

  if (status === "loading" || loading) {
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
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              Messaging Center
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Send WhatsApp or SMS messages to student parents
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsDialogOpen(true)}
          >
            Messaging Settings
          </Button>
        </Box>

        {/* Configuration Alert */}
        {settings && !settings.whatsappEnabled && !settings.smsEnabled && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Messaging is not configured. Please{" "}
            <Button size="small" onClick={() => setSettingsDialogOpen(true)}>
              configure settings
            </Button>{" "}
            to start sending messages.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Panel - Student Selection */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              sx={{
                p: 2,
                height: "calc(100vh - 250px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Select Recipients
              </Typography>

              {/* Search */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by name, father name, registration no, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchQuery("")}>
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <Grid container spacing={1}>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Class</InputLabel>
                      <Select
                        value={selectedClass}
                        label="Class"
                        onChange={(e) => {
                          setSelectedClass(e.target.value);
                          setSelectedSection("");
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
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small" disabled={!selectedClass}>
                      <InputLabel>Section</InputLabel>
                      <Select
                        value={selectedSection}
                        label="Section"
                        onChange={(e) => setSelectedSection(e.target.value)}
                      >
                        <MenuItem value="">All Sections</MenuItem>
                        {sections.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              {/* Select All */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox checked={selectAll} onChange={handleSelectAll} size="small" />
                  }
                  label={
                    <Typography variant="body2">
                      Select All ({filteredStudents.length})
                    </Typography>
                  }
                />
                <Chip
                  size="small"
                  label={`${selectedStudents.length} selected`}
                  color="primary"
                  variant="outlined"
                />
              </Box>

              <Divider sx={{ mb: 1 }} />

              {/* Student List */}
              <List sx={{ flex: 1, overflow: "auto" }}>
                {filteredStudents.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <SchoolIcon sx={{ fontSize: 48, color: "text.disabled" }} />
                    <Typography color="text.secondary">No students found</Typography>
                  </Box>
                ) : (
                  filteredStudents.map((student) => (
                    <ListItem
                      key={student.id}
                      dense
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        bgcolor: selectedStudents.some((s) => s.id === student.id)
                          ? "primary.50"
                          : "transparent",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Checkbox
                        edge="start"
                        checked={selectedStudents.some((s) => s.id === student.id)}
                        onChange={() => handleStudentSelect(student)}
                        size="small"
                      />
                      <ListItemAvatar>
                        <Avatar src={student.photo || undefined} sx={{ width: 36, height: 36 }}>
                          {student.firstName.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={500}>
                            {student.firstName} {student.lastName}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {student.class?.name} - {student.section?.name} | {student.registrationNo}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Father: {student.fatherName} | Guardian: {student.guardianName} • {student.guardianPhone}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Paper>
          </Grid>

          {/* Right Panel - Message Composition */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Compose Message
              </Typography>

              {/* Message Type Tabs */}
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => {
                  setTabValue(newValue);
                  setMessageType(newValue === 0 ? "whatsapp" : "sms");
                }}
                sx={{ mb: 2 }}
              >
                <Tab
                  icon={<WhatsAppIcon />}
                  iconPosition="start"
                  label={`WhatsApp ${settings?.whatsappEnabled ? "" : "(Not configured)"}`}
                  sx={{ minHeight: 48 }}
                  disabled={!settings?.whatsappEnabled}
                />
                <Tab
                  icon={<SmsIcon />}
                  iconPosition="start"
                  label={`SMS ${settings?.smsEnabled ? "" : "(Not configured)"}`}
                  sx={{ minHeight: 48 }}
                  disabled={!settings?.smsEnabled}
                />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  WhatsApp messages will be sent via CallMeBot API to {settings?.whatsappNumber || "configured number"}.
                  Recipients must have registered with CallMeBot first.
                </Alert>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  SMS messages will be sent from {settings?.smsNumber || "configured number"}.
                </Alert>
              </TabPanel>

              {/* Selected Recipients */}
              {selectedStudents.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Recipients ({selectedStudents.length})
                    </Typography>
                    <Button size="small" onClick={handleClearSelection}>
                      Clear All
                    </Button>
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, maxHeight: 100, overflow: "auto" }}>
                    {selectedStudents.slice(0, 10).map((student) => (
                      <Chip
                        key={student.id}
                        avatar={<Avatar src={student.photo || undefined}>{student.firstName.charAt(0)}</Avatar>}
                        label={`${student.firstName} ${student.lastName}`}
                        size="small"
                        onDelete={() => handleRemoveSelected(student.id)}
                        variant="outlined"
                      />
                    ))}
                    {selectedStudents.length > 10 && (
                      <Chip
                        label={`+${selectedStudents.length - 10} more`}
                        size="small"
                        variant="filled"
                        color="primary"
                      />
                    )}
                  </Box>
                </Box>
              )}

              {/* Message Templates */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Message Templates
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {MESSAGE_TEMPLATES.map((template) => (
                    <Chip
                      key={template.id}
                      label={template.title}
                      variant={selectedTemplate === template.id ? "filled" : "outlined"}
                      color={selectedTemplate === template.id ? "primary" : "default"}
                      size="small"
                      onClick={() => applyTemplate(template.id)}
                      sx={{ cursor: "pointer" }}
                    />
                  ))}
                </Box>
                {selectedStudents.length > 1 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Tip: Placeholders like {"{studentName}"}, {"{guardianName}"}, {"{className}"} will be replaced for each student.
                  </Typography>
                )}
              </Box>

              {/* Message Input */}
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Message"
                placeholder="Type your message here... Use {studentName}, {guardianName}, {className}, {date} for personalization"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                helperText={`${message.length} characters${messageType === "sms" ? " (160 chars per SMS)" : ""}`}
                sx={{ mb: 2 }}
              />

              {/* Send Button */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  onClick={handleSendMessage}
                  disabled={sending || selectedStudents.length === 0 || !message.trim()}
                  color={messageType === "whatsapp" ? "success" : "primary"}
                >
                  {sending
                    ? "Sending..."
                    : `Send ${messageType === "whatsapp" ? "WhatsApp" : "SMS"} (${selectedStudents.length})`}
                </Button>
              </Box>
            </Paper>

            {/* Message History */}
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <HistoryIcon />
                  <Typography variant="h6">Recent Messages</Typography>
                </Box>
                <IconButton onClick={fetchMessageHistory} disabled={historyLoading}>
                  <RefreshIcon />
                </IconButton>
              </Box>

              {historyLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : messageHistory.length === 0 ? (
                <Alert severity="info">No messages sent yet.</Alert>
              ) : (
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Recipient</TableCell>
                        <TableCell>Student</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {messageHistory.map((msg) => (
                        <TableRow key={msg.id} hover>
                          <TableCell>
                            {msg.type === "WHATSAPP" ? (
                              <WhatsAppIcon fontSize="small" color="success" />
                            ) : (
                              <SmsIcon fontSize="small" color="primary" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{msg.recipientName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {msg.recipientPhone}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {msg.student.firstName} {msg.student.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {msg.student.class?.name} - {msg.student.section?.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(msg.status) || undefined}
                              label={msg.status}
                              size="small"
                              color={getStatusColor(msg.status) as any}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {new Date(msg.createdAt).toLocaleString("en-PK")}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Messaging Settings</DialogTitle>
        <DialogContent dividers>
          {/* WhatsApp Settings */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            <WhatsAppIcon sx={{ mr: 1, verticalAlign: "middle", color: "success.main" }} />
            WhatsApp Settings
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Using CallMeBot free WhatsApp API. Each recipient needs to register their number first at{" "}
            <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener">
              callmebot.com
            </a>
          </Alert>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="School WhatsApp Number"
                placeholder="+92 300 1234567"
                value={settingsForm.whatsappNumber}
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                helperText="The number used to send messages"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="CallMeBot API Key"
                type="password"
                value={settingsForm.whatsappApiKey}
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsappApiKey: e.target.value })}
                helperText={settings?.whatsappConfigured ? "API key is configured (enter new to change)" : "Get from CallMeBot"}
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settingsForm.whatsappEnabled}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsappEnabled: e.target.checked })}
                  />
                }
                label="Enable WhatsApp Messaging"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* SMS Settings */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            <SmsIcon sx={{ mr: 1, verticalAlign: "middle", color: "primary.main" }} />
            SMS Settings
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Configure your SMS gateway provider credentials here.
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="SMS Sender Number/ID"
                placeholder="School SMS ID"
                value={settingsForm.smsNumber}
                onChange={(e) => setSettingsForm({ ...settingsForm, smsNumber: e.target.value })}
                helperText="The sender ID for SMS messages"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="SMS API Key"
                type="password"
                value={settingsForm.smsApiKey}
                onChange={(e) => setSettingsForm({ ...settingsForm, smsApiKey: e.target.value })}
                helperText={settings?.smsConfigured ? "API key is configured" : "From your SMS provider"}
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settingsForm.smsEnabled}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smsEnabled: e.target.checked })}
                  />
                }
                label="Enable SMS Messaging"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            startIcon={savingSettings ? <CircularProgress size={16} /> : null}
          >
            {savingSettings ? "Saving..." : "Save Settings"}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
