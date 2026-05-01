"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  IconButton,
  Divider,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  InputAdornment,
  Tooltip,
  ClickAwayListener,
  Popper,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  OpenInNew as OpenInNewIcon,
  FamilyRestroom as FamilyIcon,
  AccountBalance as OpenBalanceIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import ImageUpload from "@/components/common/ImageUpload";
import {
  formatCurrency,
  maskCNIC,
  maskPhone,
  isValidCNIC,
  capitalizeFirst,
} from "@/lib/utils";
import { toast } from "sonner";

const steps = [
  "Student Information",
  "Academic Details",
  "Guardian Information",
  "Fee Structure",
  "Review & Submit",
];

interface SimilarStudent {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  photo?: string;
  class?: { id: string; name: string };
  section?: { id: string; name: string };
  status: string;
}

interface ParentMatch {
  parent: { id: string; name: string; cnic?: string; phone: string } | null;
  syntheticParent: {
    name: string;
    cnic?: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    occupation?: string;
    address?: string;
    city?: string;
  } | null;
  siblings: SimilarStudent[];
  legacySiblings: SimilarStudent[];
  matchedBy: string | null;
}

interface FormData {
  registrationNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  cnic: string;
  religion: string;
  nationality: string;
  bloodGroup: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  photo: string;
  classId: string;
  sectionId: string;
  admissionDate: string;
  previousSchool: string;
  previousClass: string;
  guardian: {
    firstName: string;
    lastName: string;
    relationship: string;
    cnic: string;
    phone: string;
    whatsapp: string;
    sameAsPhone: boolean;
    email: string;
    occupation: string;
    address: string;
    city: string;
  };
  parentId: string | null;
  monthlyFee: number;
  previousBalance: number;
  fees: {
    feeStructureId: string;
    name: string;
    feeType: string;
    amount: number;
    discount: number;
    discountReason: string;
    selected: boolean;
  }[];
}

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  classId: string | null;
  feeType: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AdmissionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Duplicate / sibling detection state ──────────────────────────────────
  const [similarStudents, setSimilarStudents] = useState<SimilarStudent[]>([]);
  const [totalSimilar, setTotalSimilar] = useState(0);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [duplicateWarningDismissed, setDuplicateWarningDismissed] = useState(false);
  const nameFieldsRef = useRef<HTMLDivElement | null>(null);

  // "Show all duplicates" modal
  const [allDuplicatesOpen, setAllDuplicatesOpen] = useState(false);
  const [allDuplicates, setAllDuplicates] = useState<SimilarStudent[]>([]);
  const [loadingAllDuplicates, setLoadingAllDuplicates] = useState(false);

  const [parentMatch, setParentMatch] = useState<ParentMatch | null>(null);
  const [searchingParent, setSearchingParent] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    registrationNo: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    cnic: "",
    religion: "",
    nationality: "Pakistani",
    bloodGroup: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    photo: "",
    classId: "",
    sectionId: "",
    admissionDate: new Date().toISOString().split("T")[0],
    previousSchool: "",
    previousClass: "",
    guardian: {
      firstName: "",
      lastName: "",
      relationship: "",
      cnic: "",
      phone: "",
      whatsapp: "",
      sameAsPhone: false,
      email: "",
      occupation: "",
      address: "",
      city: "",
    },
    parentId: null,
    monthlyFee: 0,
    previousBalance: 0,
    fees: [],
  });

  // Debounced values for search
  const debouncedName = useDebounce(
    `${formData.firstName} ${formData.lastName}`.trim(),
    400
  );
  const debouncedGuardianCnic = useDebounce(formData.guardian.cnic, 500);
  const debouncedGuardianName = useDebounce(
    `${formData.guardian.firstName} ${formData.guardian.lastName}`.trim(),
    600
  );

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // ── Fetch classes & fee structures ─────────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        setLoading(true);
        const [classesRes, feesRes] = await Promise.all([
          fetch("/api/classes"),
          fetch("/api/fee-structures"),
        ]);
        if (classesRes.ok) {
          const d = await classesRes.json();
          setClasses(d.classes || d.data || []);
        }
        if (feesRes.ok) {
          const d = await feesRes.json();
          setFeeStructures(d.feeStructures || d.data || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  // ── Update fee list when class changes ─────────────────────────────────
  useEffect(() => {
    if (!formData.classId) return;
    const applicable = feeStructures
      .filter((f) => !f.classId || f.classId === formData.classId)
      .map((f) => ({
        feeStructureId: f.id,
        name: f.name,
        feeType: f.feeType,
        amount: f.amount,
        discount: 0,
        discountReason: "",
        selected: false, // unchecked by default
      }));
    setFormData((prev) => ({ ...prev, fees: applicable }));
  }, [formData.classId, feeStructures]);

  // ── Duplicate student detection (debounced, limit=3) ────────────────────
  useEffect(() => {
    if (debouncedName.length < 3) {
      setSimilarStudents([]);
      setTotalSimilar(0);
      return;
    }
    let cancelled = false;
    setSearchingStudents(true);
    fetch(`/api/students/search?q=${encodeURIComponent(debouncedName)}&limit=3&offset=0`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setSimilarStudents(d.students || []);
          setTotalSimilar(d.total ?? d.students?.length ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSearchingStudents(false); });
    return () => { cancelled = true; };
  }, [debouncedName]);

  // Reset dismissed state when name changes
  useEffect(() => {
    setDuplicateWarningDismissed(false);
    setAllDuplicates([]);
    setAllDuplicatesOpen(false);
  }, [formData.firstName, formData.lastName]);

  // Lazy-load full duplicates list when modal opens
  const handleOpenAllDuplicates = async () => {
    setAllDuplicatesOpen(true);
    if (allDuplicates.length > 0) return; // already fetched
    setLoadingAllDuplicates(true);
    try {
      const r = await fetch(
        `/api/students/search?q=${encodeURIComponent(debouncedName)}&limit=20&offset=0`
      );
      const d = await r.json();
      setAllDuplicates(d.students || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingAllDuplicates(false);
    }
  };

  // ── Parent / sibling detection (debounced) ──────────────────────────────
  useEffect(() => {
    const cnic = debouncedGuardianCnic;
    const name = debouncedGuardianName;
    if (!cnic && (!name || name.length < 3)) {
      setParentMatch(null);
      return;
    }
    let cancelled = false;
    setSearchingParent(true);
    const params = new URLSearchParams();
    if (cnic) params.set("cnic", cnic);
    if (name) params.set("name", name);
    fetch(`/api/parents/search?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setParentMatch(d);
          // Auto-fill guardian fields if parent found in DB
          if (d.matchedBy === "cnic" && d.parent && !d.parent.id.startsWith("synth")) {
            // Only auto-fill if form is mostly empty
            const g = formData.guardian;
            if (!g.phone || g.phone === d.parent.phone) {
              setFormData((prev) => ({
                ...prev,
                parentId: d.parent?.id ?? null,
              }));
            } else {
              setFormData((prev) => ({ ...prev, parentId: d.parent?.id ?? null }));
            }
          }
          if (d.matchedBy === "legacy_cnic" && d.syntheticParent) {
            // Auto-fill from legacy student data
            const sp = d.syntheticParent;
            setFormData((prev) => ({
              ...prev,
              guardian: {
                ...prev.guardian,
                phone: sp.phone || prev.guardian.phone,
                whatsapp: sp.whatsapp || prev.guardian.whatsapp,
                email: sp.email || prev.guardian.email,
                occupation: sp.occupation || prev.guardian.occupation,
                address: sp.address || prev.guardian.address,
                city: sp.city || prev.guardian.city,
              },
            }));
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSearchingParent(false); });
    return () => { cancelled = true; };
  }, [debouncedGuardianCnic, debouncedGuardianName]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleGuardianChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      guardian: { ...prev.guardian, [field]: value },
    }));
    if (errors[`guardian.${field}`])
      setErrors((prev) => ({ ...prev, [`guardian.${field}`]: "" }));
  };

  const handleFeeChange = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newFees = [...prev.fees];
      newFees[index] = { ...newFees[index], [field]: value };
      return { ...prev, fees: newFees };
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    switch (step) {
      case 0:
        if (!formData.firstName) newErrors.firstName = "First name is required";
        if (!formData.lastName) newErrors.lastName = "Last name is required";
        if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
        if (!formData.gender) newErrors.gender = "Gender is required";
        if (!formData.address) newErrors.address = "Address is required";
        if (!formData.city) newErrors.city = "City is required";
        break;
      case 1:
        if (!formData.classId) newErrors.classId = "Class is required";
        if (!formData.sectionId) newErrors.sectionId = "Section is required";
        if (!formData.admissionDate) newErrors.admissionDate = "Admission date is required";
        break;
      case 2:
        if (!formData.guardian.firstName) newErrors["guardian.firstName"] = "Guardian first name is required";
        if (!formData.guardian.lastName) newErrors["guardian.lastName"] = "Guardian last name is required";
        if (!formData.guardian.relationship) newErrors["guardian.relationship"] = "Relationship is required";
        if (!formData.guardian.phone) newErrors["guardian.phone"] = "Guardian phone is required";
        if (!formData.guardian.cnic) newErrors["guardian.cnic"] = "Guardian CNIC is required";
        break;
      case 3:
        // Monthly fee is now optional (can be 0)
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) setActiveStep((p) => p + 1);
  };
  const handleBack = () => setActiveStep((p) => p - 1);

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;
    try {
      setSubmitting(true);
      const selectedFees = formData.fees
        .filter((f) => f.selected)
        .map((f) => ({
          feeStructureId: f.feeStructureId,
          name: f.name,
          feeType: f.feeType,
          amount: f.amount,
          discount: f.discount,
          discountReason: f.discountReason,
        }));

      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          firstName: capitalizeFirst(formData.firstName),
          lastName: capitalizeFirst(formData.lastName),
          fees: selectedFees,
          previousBalance: formData.previousBalance || 0,
          parentId: formData.parentId || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Student admitted! ID: ${data.studentId || data.registrationNo}`);
        router.push(`/students/${data.id}`);
      } else {
        const err = await response.json();
        toast.error(err.error || err.message || "Failed to admit student");
      }
    } catch {
      toast.error("An error occurred during admission");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === formData.classId);
  const sections = selectedClass?.sections || [];
  const additionalFees = formData.fees
    .filter((f) => f.selected)
    .reduce((s, f) => s + f.amount - f.discount, 0);
  const totalFees = formData.monthlyFee + additionalFees;

  const allSiblings = [
    ...(parentMatch?.siblings || []),
    ...(parentMatch?.legacySiblings || []),
  ];
  const hasSiblings = allSiblings.length > 0;
  const showDuplicateWarning =
    similarStudents.length > 0 && !duplicateWarningDismissed;

  // ── Step renderers ───────────────────────────────────────────────────────

  const renderStudentInfoStep = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="h6" gutterBottom>
          Personal Information
        </Typography>
      </Grid>

      <Grid size={{ xs: 12 }} sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <ImageUpload
          value={formData.photo}
          onChange={(path) => handleInputChange("photo", path || "")}
          type="student"
          size={120}
          name={`${formData.firstName} ${formData.lastName}`.trim()}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          label="Registration Number"
          fullWidth
          value={formData.registrationNo}
          onChange={(e) => handleInputChange("registrationNo", e.target.value.toUpperCase())}
          placeholder={`ALH-${new Date().getFullYear()}-00001`}
          helperText="Leave empty to auto-generate"
        />
      </Grid>

      {/* ── Name fields with inline suggestion dropdown ─────────────── */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Box ref={nameFieldsRef} sx={{ position: "relative" }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="First Name"
                fullWidth
                required
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                error={!!errors.firstName}
                helperText={errors.firstName}
                InputProps={{
                  endAdornment: searchingStudents ? (
                    <InputAdornment position="end">
                      <CircularProgress size={16} />
                    </InputAdornment>
                  ) : similarStudents.length > 0 && !duplicateWarningDismissed ? (
                    <InputAdornment position="end">
                      <Tooltip title={`${similarStudents.length} similar student(s) found`}>
                        <WarningIcon color="warning" fontSize="small" />
                      </Tooltip>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Last Name"
                fullWidth
                required
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                error={!!errors.lastName}
                helperText={errors.lastName}
              />
            </Grid>
          </Grid>

          {/* ── Inline suggestion dropdown ─────────────────────────────── */}
          <Popper
            open={showDuplicateWarning}
            anchorEl={nameFieldsRef.current}
            placement="bottom-start"
            transition
            style={{ zIndex: 1300, width: nameFieldsRef.current?.offsetWidth }}
          >
            {({ TransitionProps }) => (
              <Fade {...TransitionProps} timeout={200}>
                <ClickAwayListener onClickAway={() => setDuplicateWarningDismissed(true)}>
                  <Paper
                    elevation={8}
                    sx={{
                      mt: 0.5,
                      border: "1px solid",
                      borderColor: "warning.main",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    {/* Header */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 2,
                        py: 1,
                        bgcolor: "warning.50",
                        borderBottom: "1px solid",
                        borderColor: "warning.200",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <WarningIcon color="warning" fontSize="small" />
                        <Typography variant="body2" fontWeight={700} color="warning.dark">
                          {similarStudents.length} similar student
                          {similarStudents.length > 1 ? "s" : ""} already enrolled
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => setDuplicateWarningDismissed(true)}
                        sx={{ color: "warning.dark" }}
                      >
                        <Typography variant="caption" sx={{ lineHeight: 1 }}>✕</Typography>
                      </IconButton>
                    </Box>

                    {/* Student list */}
                    <List dense disablePadding>
                      {similarStudents.map((s, idx) => (
                        <ListItem
                          key={s.id}
                          divider={idx < similarStudents.length - 1}
                          sx={{
                            px: 2,
                            py: 1,
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                          secondaryAction={
                            <Tooltip title="Open profile in new tab">
                              <IconButton
                                size="small"
                                onClick={() => window.open(`/students/${s.id}`, "_blank")}
                                color="primary"
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar src={s.photo} sx={{ width: 36, height: 36, fontSize: 14 }}>
                              {s.firstName[0]}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {s.firstName} {s.lastName}
                                </Typography>
                                <Chip
                                  label={s.status}
                                  size="small"
                                  color={s.status === "ACTIVE" ? "success" : "default"}
                                  sx={{ height: 18, fontSize: 10 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {s.registrationNo}
                                {s.class ? ` · ${s.class.name}${s.section ? " – " + s.section.name : ""}` : ""}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>

                    {/* Footer — "+ N others" or dismiss hint */}
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: "grey.50",
                        borderTop: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Continue typing if this is a different student.
                      </Typography>
                      {totalSimilar > similarStudents.length && (
                        <Chip
                          label={`+ ${totalSimilar - similarStudents.length} more`}
                          size="small"
                          color="warning"
                          variant="outlined"
                          onClick={handleOpenAllDuplicates}
                          sx={{ cursor: "pointer", fontWeight: 700, fontSize: 11 }}
                        />
                      )}
                    </Box>
                  </Paper>
                </ClickAwayListener>
              </Fade>
            )}
          </Popper>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Date of Birth"
          type="date"
          fullWidth
          required
          InputLabelProps={{ shrink: true }}
          value={formData.dateOfBirth}
          onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
          error={!!errors.dateOfBirth}
          helperText={errors.dateOfBirth}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth required error={!!errors.gender}>
          <InputLabel>Gender</InputLabel>
          <Select
            value={formData.gender}
            label="Gender"
            onChange={(e) => handleInputChange("gender", e.target.value)}
          >
            <MenuItem value="MALE">Male</MenuItem>
            <MenuItem value="FEMALE">Female</MenuItem>
            <MenuItem value="OTHER">Other</MenuItem>
          </Select>
          {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="CNIC / B-Form Number"
          fullWidth
          value={formData.cnic}
          onChange={(e) => handleInputChange("cnic", maskCNIC(e.target.value))}
          placeholder="XXXXX-XXXXXXX-X"
          helperText="Format: XXXXX-XXXXXXX-X"
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <InputLabel>Religion</InputLabel>
          <Select
            value={formData.religion}
            label="Religion"
            onChange={(e) => handleInputChange("religion", e.target.value)}
          >
            <MenuItem value="Islam">Islam</MenuItem>
            <MenuItem value="Christianity">Christianity</MenuItem>
            <MenuItem value="Hinduism">Hinduism</MenuItem>
            <MenuItem value="Sikhism">Sikhism</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Nationality"
          fullWidth
          value={formData.nationality}
          onChange={(e) => handleInputChange("nationality", e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <InputLabel>Blood Group</InputLabel>
          <Select
            value={formData.bloodGroup}
            label="Blood Group"
            onChange={(e) => handleInputChange("bloodGroup", e.target.value)}
          >
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
              <MenuItem key={bg} value={bg}>{bg}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Contact Information
        </Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          label="Address"
          fullWidth
          required
          multiline
          rows={2}
          value={formData.address}
          onChange={(e) => handleInputChange("address", e.target.value)}
          error={!!errors.address}
          helperText={errors.address}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="City"
          fullWidth
          required
          value={formData.city}
          onChange={(e) => handleInputChange("city", e.target.value)}
          error={!!errors.city}
          helperText={errors.city}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Phone"
          fullWidth
          value={formData.phone}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          placeholder="03XX-XXXXXXX"
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderAcademicStep = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="h6" gutterBottom>
          Academic Details
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth required error={!!errors.classId}>
          <InputLabel>Class</InputLabel>
          <Select
            value={formData.classId}
            label="Class"
            onChange={(e) => {
              handleInputChange("classId", e.target.value);
              handleInputChange("sectionId", "");
            }}
          >
            {classes.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
          {errors.classId && <FormHelperText>{errors.classId}</FormHelperText>}
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth required error={!!errors.sectionId} disabled={!formData.classId}>
          <InputLabel>Section</InputLabel>
          <Select
            value={formData.sectionId}
            label="Section"
            onChange={(e) => handleInputChange("sectionId", e.target.value)}
          >
            {sections.map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </Select>
          {errors.sectionId && <FormHelperText>{errors.sectionId}</FormHelperText>}
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Admission Date"
          type="date"
          fullWidth
          required
          InputLabelProps={{ shrink: true }}
          value={formData.admissionDate}
          onChange={(e) => handleInputChange("admissionDate", e.target.value)}
          error={!!errors.admissionDate}
          helperText={errors.admissionDate}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Previous Education (Optional)
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Previous School"
          fullWidth
          value={formData.previousSchool}
          onChange={(e) => handleInputChange("previousSchool", e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Previous Class"
          fullWidth
          value={formData.previousClass}
          onChange={(e) => handleInputChange("previousClass", e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderGuardianStep = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="h6" gutterBottom>
          Guardian Information
        </Typography>
      </Grid>

      {/* ── Sibling / Parent match banner ──────────────────────────── */}
      {searchingParent && (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
            <CircularProgress size={16} />
            <Typography variant="body2">Checking for existing family…</Typography>
          </Box>
        </Grid>
      )}

      {!searchingParent && parentMatch?.matchedBy && hasSiblings && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity="info"
            icon={<FamilyIcon />}
            sx={{ "& .MuiAlert-message": { width: "100%" } }}
          >
            <AlertTitle fontWeight={700}>
              Existing parent found — this student will be linked as a sibling
            </AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Parent:{" "}
              <strong>
                {parentMatch.parent?.name || parentMatch.syntheticParent?.name || "—"}
              </strong>{" "}
              (matched by {parentMatch.matchedBy.replace("_", " ")})
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              Siblings already enrolled ({allSiblings.length}):
            </Typography>
            <List dense disablePadding>
              {allSiblings.map((s) => (
                <ListItem
                  key={s.id}
                  disablePadding
                  sx={{ mb: 0.25 }}
                  secondaryAction={
                    <IconButton
                      size="small"
                      onClick={() => window.open(`/students/${s.id}`, "_blank")}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={s.photo} sx={{ width: 28, height: 28, fontSize: 12 }}>
                      {s.firstName[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={500}>
                        {s.firstName} {s.lastName}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {s.registrationNo} • {s.class?.name}
                        {s.section ? ` – ${s.section.name}` : ""}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Alert>
        </Grid>
      )}

      {!searchingParent && parentMatch?.matchedBy && !hasSiblings && parentMatch.parent && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="success" icon={<CheckCircleIcon />}>
            <AlertTitle fontWeight={700}>Parent record found</AlertTitle>
            <Typography variant="body2">
              <strong>{parentMatch.parent.name}</strong> will be linked as this student&apos;s parent.
              No siblings currently enrolled.
            </Typography>
          </Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="First Name"
          fullWidth
          required
          value={formData.guardian.firstName}
          onChange={(e) => handleGuardianChange("firstName", e.target.value)}
          error={!!errors["guardian.firstName"]}
          helperText={errors["guardian.firstName"]}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Last Name"
          fullWidth
          required
          value={formData.guardian.lastName}
          onChange={(e) => handleGuardianChange("lastName", e.target.value)}
          error={!!errors["guardian.lastName"]}
          helperText={errors["guardian.lastName"]}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth required error={!!errors["guardian.relationship"]}>
          <InputLabel>Relationship</InputLabel>
          <Select
            value={formData.guardian.relationship}
            label="Relationship"
            onChange={(e) => handleGuardianChange("relationship", e.target.value)}
          >
            {["FATHER", "MOTHER", "GUARDIAN", "BROTHER", "SISTER", "UNCLE", "AUNT", "OTHER"].map(
              (r) => (
                <MenuItem key={r} value={r}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </MenuItem>
              )
            )}
          </Select>
          {errors["guardian.relationship"] && (
            <FormHelperText>{errors["guardian.relationship"]}</FormHelperText>
          )}
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="CNIC"
          fullWidth
          required
          value={formData.guardian.cnic}
          onChange={(e) => handleGuardianChange("cnic", maskCNIC(e.target.value))}
          placeholder="XXXXX-XXXXXXX-X"
          error={
            !!errors["guardian.cnic"] ||
            (formData.guardian.cnic.length > 0 && !isValidCNIC(formData.guardian.cnic))
          }
          helperText={errors["guardian.cnic"] || "Format: XXXXX-XXXXXXX-X"}
          InputProps={{
            endAdornment: searchingParent ? (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : null,
          }}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Phone"
          fullWidth
          required
          value={formData.guardian.phone}
          onChange={(e) => {
            const v = maskPhone(e.target.value);
            handleGuardianChange("phone", v);
            if (formData.guardian.sameAsPhone) handleGuardianChange("whatsapp", v);
          }}
          placeholder="03XX-XXXXXXX"
          error={!!errors["guardian.phone"]}
          helperText={errors["guardian.phone"] || "Format: 03XX-XXXXXXX"}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Box>
          <TextField
            label="WhatsApp Number (Optional)"
            fullWidth
            value={formData.guardian.whatsapp}
            onChange={(e) => handleGuardianChange("whatsapp", maskPhone(e.target.value))}
            placeholder="03XX-XXXXXXX"
            disabled={formData.guardian.sameAsPhone}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.guardian.sameAsPhone}
                onChange={(e) => {
                  handleGuardianChange("sameAsPhone", e.target.checked);
                  if (e.target.checked)
                    handleGuardianChange("whatsapp", formData.guardian.phone);
                }}
                size="small"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                Same as phone number
              </Typography>
            }
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          value={formData.guardian.email}
          onChange={(e) => handleGuardianChange("email", e.target.value.toLowerCase())}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Occupation"
          fullWidth
          value={formData.guardian.occupation}
          onChange={(e) => handleGuardianChange("occupation", e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          label="Address"
          fullWidth
          multiline
          rows={2}
          value={formData.guardian.address}
          onChange={(e) => handleGuardianChange("address", e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="City"
          fullWidth
          value={formData.guardian.city}
          onChange={(e) => handleGuardianChange("city", e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderFeeStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Fee Structure
      </Typography>

      {/* Monthly Tuition Fee */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "primary.50" }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary">
          Monthly Tuition Fee
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Individual monthly fee for this student (leave 0 if not applicable now).
        </Typography>
        <TextField
          label="Monthly Tuition Fee (Rs.)"
          type="number"
          value={formData.monthlyFee || ""}
          onChange={(e) => handleInputChange("monthlyFee", Number(e.target.value))}
          inputProps={{ min: 0 }}
          InputProps={{
            startAdornment: <Typography sx={{ mr: 1 }}>Rs.</Typography>,
          }}
          sx={{ maxWidth: 300 }}
        />
      </Paper>

      {/* Opening Balance */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 3, bgcolor: "warning.50", borderColor: "warning.200" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <OpenBalanceIcon color="warning" />
          <Typography variant="subtitle1" fontWeight="bold" color="warning.dark">
            Opening Balance (Previous Dues)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          If the student has outstanding dues from a previous school or prior period,
          enter the amount here. This creates a financial ledger entry that will be
          cleared <strong>first</strong> before any monthly fees when payments are made (FIFO).
        </Typography>
        <TextField
          label="Opening Balance (Rs.)"
          type="number"
          value={formData.previousBalance || ""}
          onChange={(e) =>
            handleInputChange("previousBalance", Math.max(0, Number(e.target.value)))
          }
          inputProps={{ min: 0 }}
          InputProps={{
            startAdornment: <Typography sx={{ mr: 1 }}>Rs.</Typography>,
          }}
          helperText={
            formData.previousBalance > 0
              ? `A ledger entry of Rs. ${formatCurrency(formData.previousBalance)} will be created and cleared first when payments are received.`
              : "Leave 0 if no prior outstanding dues"
          }
          sx={{ maxWidth: 300 }}
        />
      </Paper>

      {/* Additional Fees */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Additional Fees (Optional — select what applies)
      </Typography>

      {formData.fees.length === 0 ? (
        <Alert severity="info">
          Select a class in Step 2 to see applicable fees.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell padding="checkbox">Select</TableCell>
                <TableCell>Fee Type</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Discount</TableCell>
                <TableCell>Discount Reason</TableCell>
                <TableCell align="right">Net Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formData.fees.map((fee, idx) => (
                <TableRow
                  key={fee.feeStructureId}
                  sx={{ opacity: fee.selected ? 1 : 0.6 }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={fee.selected}
                      onChange={(e) => handleFeeChange(idx, "selected", e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>{fee.name}</TableCell>
                  <TableCell align="right">{formatCurrency(fee.amount)}</TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={fee.discount}
                      onChange={(e) =>
                        handleFeeChange(idx, "discount", Math.min(Number(e.target.value), fee.amount))
                      }
                      disabled={!fee.selected}
                      inputProps={{ min: 0, max: fee.amount }}
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={fee.discountReason}
                      onChange={(e) => handleFeeChange(idx, "discountReason", e.target.value)}
                      disabled={!fee.selected || fee.discount === 0}
                      placeholder="Reason"
                      sx={{ width: 180 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {fee.selected ? formatCurrency(fee.amount - fee.discount) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: "primary.50" }}>
                <TableCell colSpan={5} align="right">
                  <Typography variant="subtitle1" fontWeight="bold">
                    Total (first month):
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    {formatCurrency(totalFees)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderReviewStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review & Submit
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Please review all information before submitting.
        {formData.registrationNo
          ? ` Registration Number: ${formData.registrationNo}`
          : " A registration number will be auto-generated."}
      </Alert>

      {/* Student Info */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Student Information
        </Typography>
        <Grid container spacing={2}>
          {[
            ["Name", `${formData.firstName} ${formData.lastName}`],
            ["Date of Birth", formData.dateOfBirth],
            ["Gender", formData.gender],
            ["CNIC", formData.cnic || "—"],
            ["Address", `${formData.address}, ${formData.city}`],
          ].map(([label, value]) => (
            <Grid key={label} size={{ xs: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="body2">{value}</Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Academic */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Academic Details
        </Typography>
        <Grid container spacing={2}>
          {[
            ["Class", selectedClass?.name || "—"],
            ["Section", sections.find((s) => s.id === formData.sectionId)?.name || "—"],
            ["Admission Date", formData.admissionDate],
          ].map(([label, value]) => (
            <Grid key={label} size={{ xs: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="body2">{value}</Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Guardian */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Guardian Information
        </Typography>
        <Grid container spacing={2}>
          {[
            ["Name", `${formData.guardian.firstName} ${formData.guardian.lastName}`],
            ["Relationship", formData.guardian.relationship],
            ["Phone", formData.guardian.phone],
            ["CNIC", formData.guardian.cnic],
          ].map(([label, value]) => (
            <Grid key={label} size={{ xs: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="body2">{value || "—"}</Typography>
            </Grid>
          ))}
        </Grid>
        {hasSiblings && (
          <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="info.main">
              <FamilyIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
              Will be linked as sibling of:{" "}
              {allSiblings.map((s) => `${s.firstName} ${s.lastName}`).join(", ")}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Fee Summary */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Fee Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="body2" color="text.secondary">Monthly Fee</Typography>
            <Typography variant="h6" color="primary">{formatCurrency(formData.monthlyFee)}</Typography>
          </Grid>
          {additionalFees > 0 && (
            <Grid size={{ xs: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Additional ({formData.fees.filter((f) => f.selected).length} items)
              </Typography>
              <Typography variant="h6">{formatCurrency(additionalFees)}</Typography>
            </Grid>
          )}
          {formData.previousBalance > 0 && (
            <Grid size={{ xs: 6, md: 3 }}>
              <Typography variant="body2" color="warning.dark">
                Opening Balance
              </Typography>
              <Typography variant="h6" color="warning.dark">
                {formatCurrency(formData.previousBalance)}
              </Typography>
            </Grid>
          )}
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">Total First Month</Typography>
        <Typography variant="h4" color="primary" fontWeight="bold">
          {formatCurrency(totalFees)}
        </Typography>
        {formData.previousBalance > 0 && (
          <Typography variant="caption" color="warning.dark" sx={{ display: "block", mt: 0.5 }}>
            + Rs. {formatCurrency(formData.previousBalance)} opening balance ledger entry
          </Typography>
        )}
      </Paper>
    </Box>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: return renderStudentInfoStep();
      case 1: return renderAcademicStep();
      case 2: return renderGuardianStep();
      case 3: return renderFeeStep();
      case 4: return renderReviewStep();
      default: return null;
    }
  };

  if (status === "loading" || loading) {
    return (
      <MainLayout>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Button startIcon={<BackIcon />} onClick={() => router.push("/students")} sx={{ mb: 2 }}>
            Back to Students
          </Button>
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            New Student Admission
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete all steps to admit a new student
          </Typography>
        </Box>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        <Paper sx={{ p: 3 }}>
          {renderStepContent(activeStep)}

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 4,
              pt: 2,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Button disabled={activeStep === 0} onClick={handleBack} startIcon={<BackIcon />}>
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {submitting ? "Submitting…" : "Submit Admission"}
                </Button>
              ) : (
                <Button variant="contained" onClick={handleNext} endIcon={<NextIcon />}>
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* ── All-duplicates modal (lazy-loaded) ──────────────────────────── */}
      <Dialog
        open={allDuplicatesOpen}
        onClose={() => setAllDuplicatesOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningIcon color="warning" fontSize="small" />
          Students matching &ldquo;{debouncedName}&rdquo;
          <Chip
            label={`${totalSimilar} found`}
            size="small"
            color="warning"
            sx={{ ml: "auto" }}
          />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loadingAllDuplicates ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List disablePadding>
              {allDuplicates.map((s, idx) => (
                <ListItem
                  key={s.id}
                  divider={idx < allDuplicates.length - 1}
                  sx={{ px: 3, py: 1.5 }}
                  secondaryAction={
                    <Tooltip title="Open profile in new tab">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => window.open(`/students/${s.id}`, "_blank")}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={s.photo} sx={{ width: 40, height: 40 }}>
                      {s.firstName[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {s.firstName} {s.lastName}
                        </Typography>
                        <Chip
                          label={s.status}
                          size="small"
                          color={s.status === "ACTIVE" ? "success" : "default"}
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {s.registrationNo}
                        {s.class
                          ? ` · ${s.class.name}${s.section ? " – " + s.section.name : ""}`
                          : ""}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
