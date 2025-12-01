"use client";

import { useState, useEffect } from "react";
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
  Autocomplete,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Tab,
  Tabs,
  Badge,
  Tooltip,
  InputAdornment,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  Send as SendIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";

interface Student {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
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
  const [messageType, setMessageType] = useState<"whatsapp" | "sms">(
    "whatsapp"
  );
  const [message, setMessage] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch classes and students
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [classesRes, studentsRes] = await Promise.all([
          fetch("/api/classes"),
          fetch("/api/students?limit=1000"),
        ]);

        if (classesRes.ok) {
          const data = await classesRes.json();
          setClasses(data.classes || []);
        }

        if (studentsRes.ok) {
          const data = await studentsRes.json();
          setStudents(data.data || []);
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

  // Filter students based on search and filters
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      !searchQuery ||
      `${student.firstName} ${student.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      student.registrationNo
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      student.guardianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.guardianPhone.includes(searchQuery);

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

  const handleSendMessage = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);

    // Simulate sending - this is just UI for now
    setTimeout(() => {
      toast.success(
        `Message queued for ${selectedStudents.length} recipient(s) via ${
          messageType === "whatsapp" ? "WhatsApp" : "SMS"
        }`
      );
      setSending(false);
      setMessage("");
      // Don't clear selection to allow sending follow-up messages
    }, 1500);
  };

  const getPhoneNumber = (student: Student) => {
    if (messageType === "whatsapp" && student.guardianWhatsapp) {
      return student.guardianWhatsapp;
    }
    return student.guardianPhone;
  };

  // Message templates
  const messageTemplates = [
    {
      title: "Fee Reminder",
      message:
        "Dear Parent, this is a reminder that your child's fee is due. Please pay at your earliest convenience. - Al-Huda Public School",
    },
    {
      title: "Attendance Alert",
      message:
        "Dear Parent, your child was marked absent today. Please contact the school if there are any concerns. - Al-Huda Public School",
    },
    {
      title: "PTM Notice",
      message:
        "Dear Parent, you are invited to attend the Parent-Teacher Meeting scheduled for [DATE]. Your presence is important. - Al-Huda Public School",
    },
    {
      title: "General Announcement",
      message: "Dear Parent, [Your message here]. - Al-Huda Public School",
    },
  ];

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
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            Messaging Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Send WhatsApp or SMS messages to student parents
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Left Panel - Student Selection */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              sx={{
                p: 2,
                height: "calc(100vh - 200px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Select Recipients
              </Typography>

              {/* Search and Filters */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search students, parents, or phone..."
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
                        <IconButton
                          size="small"
                          onClick={() => setSearchQuery("")}
                        >
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
                    <FormControl
                      fullWidth
                      size="small"
                      disabled={!selectedClass}
                    >
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
                    <Checkbox
                      checked={selectAll}
                      onChange={handleSelectAll}
                      size="small"
                    />
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
                    <Typography color="text.secondary">
                      No students found
                    </Typography>
                  </Box>
                ) : (
                  filteredStudents.map((student) => (
                    <ListItem
                      key={student.id}
                      dense
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        bgcolor: selectedStudents.some(
                          (s) => s.id === student.id
                        )
                          ? "primary.50"
                          : "transparent",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Checkbox
                        edge="start"
                        checked={selectedStudents.some(
                          (s) => s.id === student.id
                        )}
                        onChange={() => handleStudentSelect(student)}
                        size="small"
                      />
                      <ListItemAvatar>
                        <Avatar
                          src={student.photo || undefined}
                          sx={{ width: 36, height: 36 }}
                        >
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
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              {student.class?.name} - {student.section?.name} |{" "}
                              {student.registrationNo}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Parent: {student.guardianName} •{" "}
                              {student.guardianPhone}
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
                  label="WhatsApp"
                  sx={{ minHeight: 48 }}
                />
                <Tab
                  icon={<SmsIcon />}
                  iconPosition="start"
                  label="SMS"
                  sx={{ minHeight: 48 }}
                />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  WhatsApp messages will be sent to parents&apos; WhatsApp
                  numbers. If no WhatsApp number is provided, the primary phone
                  number will be used.
                </Alert>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  SMS messages will be sent to parents&apos; primary phone
                  numbers. Standard SMS charges may apply.
                </Alert>
              </TabPanel>

              {/* Selected Recipients */}
              {selectedStudents.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="subtitle2" color="text.secondary">
                      Recipients ({selectedStudents.length})
                    </Typography>
                    <Button size="small" onClick={handleClearSelection}>
                      Clear All
                    </Button>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.5,
                      maxHeight: 100,
                      overflow: "auto",
                    }}
                  >
                    {selectedStudents.slice(0, 10).map((student) => (
                      <Chip
                        key={student.id}
                        avatar={
                          <Avatar src={student.photo || undefined}>
                            {student.firstName.charAt(0)}
                          </Avatar>
                        }
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
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Quick Templates
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {messageTemplates.map((template, index) => (
                    <Chip
                      key={index}
                      label={template.title}
                      variant="outlined"
                      size="small"
                      onClick={() => setMessage(template.message)}
                      sx={{ cursor: "pointer" }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Message Input */}
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Message"
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                helperText={`${message.length} characters${
                  messageType === "sms" ? " (160 chars per SMS)" : ""
                }`}
                sx={{ mb: 2 }}
              />

              {/* Send Button */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  disabled
                >
                  Schedule (Coming Soon)
                </Button>
                <Button
                  variant="contained"
                  startIcon={
                    sending ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SendIcon />
                    )
                  }
                  onClick={handleSendMessage}
                  disabled={
                    sending || selectedStudents.length === 0 || !message.trim()
                  }
                  color={messageType === "whatsapp" ? "success" : "primary"}
                >
                  {sending
                    ? "Sending..."
                    : `Send ${
                        messageType === "whatsapp" ? "WhatsApp" : "SMS"
                      } (${selectedStudents.length})`}
                </Button>
              </Box>
            </Paper>

            {/* Message History Placeholder */}
            <Paper sx={{ p: 2 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <HistoryIcon />
                <Typography variant="h6">Recent Messages</Typography>
              </Box>
              <Alert severity="info">
                Message history will be available once the messaging feature is
                fully implemented.
              </Alert>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
}
