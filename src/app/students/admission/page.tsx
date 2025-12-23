"use client";

import { useState, useEffect } from "react";
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
  Avatar,
  IconButton,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  CircularProgress,
  FormControlLabel,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Save as SaveIcon,
  PhotoCamera as PhotoIcon,
  Delete as DeleteIcon,
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

interface FormData {
  // Student Info
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
  // Academic Info
  classId: string;
  sectionId: string;
  admissionDate: string;
  previousSchool: string;
  previousClass: string;
  // Guardian Info
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
  // Fee Info
  monthlyFee: number;
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

export default function AdmissionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    monthlyFee: 0,
    fees: [],
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch classes and fee structures
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [classesRes, feesRes] = await Promise.all([
          fetch("/api/classes"),
          fetch("/api/fee-structures"),
        ]);

        if (classesRes.ok) {
          const data = await classesRes.json();
          setClasses(data.classes || data.data || []);
        }

        if (feesRes.ok) {
          const data = await feesRes.json();
          setFeeStructures(data.feeStructures || data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  // Update fees when class is selected
  useEffect(() => {
    if (formData.classId) {
      const applicableFees = feeStructures
        .filter((f) => !f.classId || f.classId === formData.classId)
        .map((f) => ({
          feeStructureId: f.id,
          name: f.name,
          feeType: f.feeType,
          amount: f.amount,
          discount: 0,
          discountReason: "",
          selected: false,
        }));
      setFormData((prev) => ({ ...prev, fees: applicableFees }));
    }
  }, [formData.classId, feeStructures]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleGuardianChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      guardian: { ...prev.guardian, [field]: value },
    }));
    if (errors[`guardian.${field}`]) {
      setErrors((prev) => ({ ...prev, [`guardian.${field}`]: "" }));
    }
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
      case 0: // Student Information
        if (!formData.firstName) newErrors.firstName = "First name is required";
        if (!formData.lastName) newErrors.lastName = "Last name is required";
        if (!formData.dateOfBirth)
          newErrors.dateOfBirth = "Date of birth is required";
        if (!formData.gender) newErrors.gender = "Gender is required";
        if (!formData.address) newErrors.address = "Address is required";
        if (!formData.city) newErrors.city = "City is required";
        break;

      case 1: // Academic Details
        if (!formData.classId) newErrors.classId = "Class is required";
        if (!formData.sectionId) newErrors.sectionId = "Section is required";
        if (!formData.admissionDate)
          newErrors.admissionDate = "Admission date is required";
        break;

      case 2: // Guardian Information
        if (!formData.guardian.firstName)
          newErrors["guardian.firstName"] = "Guardian first name is required";
        if (!formData.guardian.lastName)
          newErrors["guardian.lastName"] = "Guardian last name is required";
        if (!formData.guardian.relationship)
          newErrors["guardian.relationship"] = "Relationship is required";
        if (!formData.guardian.phone)
          newErrors["guardian.phone"] = "Guardian phone is required";
        if (!formData.guardian.cnic)
          newErrors["guardian.cnic"] = "Guardian CNIC is required";
        break;

      case 3: // Fee Structure
        if (formData.monthlyFee <= 0) {
          newErrors.monthlyFee = "Monthly tuition fee is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    try {
      setSubmitting(true);
      const selectedFees = formData.fees
        .filter((f) => f.selected)
        .map((f) => ({
          feeStructureId: f.feeStructureId,
          name: f.name, // Include fee name for voucher description
          feeType: f.feeType, // Include fee type for proper categorization
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Student admitted successfully! ID: ${
            data.studentId || data.registrationNo
          }`
        );
        router.push(`/students/${data.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || error.message || "Failed to admit student");
      }
    } catch (error) {
      toast.error("An error occurred during admission");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === formData.classId);
  const sections = selectedClass?.sections || [];

  const additionalFees = formData.fees
    .filter((f) => f.selected)
    .reduce((sum, f) => sum + f.amount - f.discount, 0);

  const totalFees = formData.monthlyFee + additionalFees;

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>
                Personal Information
              </Typography>
            </Grid>
            <Grid
              size={{ xs: 12 }}
              sx={{ display: "flex", justifyContent: "center", mb: 2 }}
            >
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
                onChange={(e) =>
                  handleInputChange(
                    "registrationNo",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder={`ALH-${new Date().getFullYear()}-00001`}
                helperText="Leave empty to auto-generate"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="First Name"
                fullWidth
                required
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                error={!!errors.firstName}
                helperText={errors.firstName}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Date of Birth"
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={formData.dateOfBirth}
                onChange={(e) =>
                  handleInputChange("dateOfBirth", e.target.value)
                }
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
                {errors.gender && (
                  <FormHelperText>{errors.gender}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="CNIC / B-Form Number"
                fullWidth
                value={formData.cnic}
                onChange={(e) =>
                  handleInputChange("cnic", maskCNIC(e.target.value))
                }
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
                  onChange={(e) =>
                    handleInputChange("religion", e.target.value)
                  }
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
                onChange={(e) =>
                  handleInputChange("nationality", e.target.value)
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Blood Group</InputLabel>
                <Select
                  value={formData.bloodGroup}
                  label="Blood Group"
                  onChange={(e) =>
                    handleInputChange("bloodGroup", e.target.value)
                  }
                >
                  <MenuItem value="A+">A+</MenuItem>
                  <MenuItem value="A-">A-</MenuItem>
                  <MenuItem value="B+">B+</MenuItem>
                  <MenuItem value="B-">B-</MenuItem>
                  <MenuItem value="AB+">AB+</MenuItem>
                  <MenuItem value="AB-">AB-</MenuItem>
                  <MenuItem value="O+">O+</MenuItem>
                  <MenuItem value="O-">O-</MenuItem>
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

      case 1:
        return (
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
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.classId && (
                  <FormHelperText>{errors.classId}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl
                fullWidth
                required
                error={!!errors.sectionId}
                disabled={!formData.classId}
              >
                <InputLabel>Section</InputLabel>
                <Select
                  value={formData.sectionId}
                  label="Section"
                  onChange={(e) =>
                    handleInputChange("sectionId", e.target.value)
                  }
                >
                  {sections.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.sectionId && (
                  <FormHelperText>{errors.sectionId}</FormHelperText>
                )}
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
                onChange={(e) =>
                  handleInputChange("admissionDate", e.target.value)
                }
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
                onChange={(e) =>
                  handleInputChange("previousSchool", e.target.value)
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Previous Class"
                fullWidth
                value={formData.previousClass}
                onChange={(e) =>
                  handleInputChange("previousClass", e.target.value)
                }
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>
                Guardian Information
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="First Name"
                fullWidth
                required
                value={formData.guardian.firstName}
                onChange={(e) =>
                  handleGuardianChange("firstName", e.target.value)
                }
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
                onChange={(e) =>
                  handleGuardianChange("lastName", e.target.value)
                }
                error={!!errors["guardian.lastName"]}
                helperText={errors["guardian.lastName"]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl
                fullWidth
                required
                error={!!errors["guardian.relationship"]}
              >
                <InputLabel>Relationship</InputLabel>
                <Select
                  value={formData.guardian.relationship}
                  label="Relationship"
                  onChange={(e) =>
                    handleGuardianChange("relationship", e.target.value)
                  }
                >
                  <MenuItem value="FATHER">Father</MenuItem>
                  <MenuItem value="MOTHER">Mother</MenuItem>
                  <MenuItem value="GUARDIAN">Guardian</MenuItem>
                  <MenuItem value="BROTHER">Brother</MenuItem>
                  <MenuItem value="SISTER">Sister</MenuItem>
                  <MenuItem value="UNCLE">Uncle</MenuItem>
                  <MenuItem value="AUNT">Aunt</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
                {errors["guardian.relationship"] && (
                  <FormHelperText>
                    {errors["guardian.relationship"]}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="CNIC"
                fullWidth
                required
                value={formData.guardian.cnic}
                onChange={(e) =>
                  handleGuardianChange("cnic", maskCNIC(e.target.value))
                }
                placeholder="XXXXX-XXXXXXX-X"
                error={
                  !!errors["guardian.cnic"] ||
                  (formData.guardian.cnic.length > 0 &&
                    !isValidCNIC(formData.guardian.cnic))
                }
                helperText={
                  errors["guardian.cnic"] || "Format: XXXXX-XXXXXXX-X"
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Phone"
                fullWidth
                required
                value={formData.guardian.phone}
                onChange={(e) => {
                  const newPhone = maskPhone(e.target.value);
                  handleGuardianChange("phone", newPhone);
                  if (formData.guardian.sameAsPhone) {
                    handleGuardianChange("whatsapp", newPhone);
                  }
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
                  onChange={(e) =>
                    handleGuardianChange("whatsapp", maskPhone(e.target.value))
                  }
                  placeholder="03XX-XXXXXXX"
                  disabled={formData.guardian.sameAsPhone}
                  helperText="Leave empty if same as phone number"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.guardian.sameAsPhone}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleGuardianChange("sameAsPhone", checked);
                        if (checked) {
                          handleGuardianChange(
                            "whatsapp",
                            formData.guardian.phone
                          );
                        }
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
                onChange={(e) =>
                  handleGuardianChange("email", e.target.value.toLowerCase())
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Occupation"
                fullWidth
                value={formData.guardian.occupation}
                onChange={(e) =>
                  handleGuardianChange("occupation", e.target.value)
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Address"
                fullWidth
                multiline
                rows={2}
                value={formData.guardian.address}
                onChange={(e) =>
                  handleGuardianChange("address", e.target.value)
                }
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

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Fee Structure
            </Typography>

            {/* Monthly Tuition Fee - Individual for each student */}
            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 3, bgcolor: "primary.50" }}
            >
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                gutterBottom
                color="primary"
              >
                Monthly Tuition Fee
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set the monthly tuition fee for this student. This can be
                different for each student in the same class.
              </Typography>
              <TextField
                label="Monthly Tuition Fee (Rs.)"
                type="number"
                fullWidth
                required
                value={formData.monthlyFee}
                onChange={(e) =>
                  handleInputChange("monthlyFee", Number(e.target.value))
                }
                error={!!errors.monthlyFee}
                helperText={
                  errors.monthlyFee ||
                  "Enter the monthly tuition fee for this student"
                }
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>Rs.</Typography>,
                }}
                sx={{ maxWidth: 300 }}
              />
            </Paper>

            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Additional Fees (Optional)
            </Typography>
            {errors.fees && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.fees}
              </Alert>
            )}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">Select</TableCell>
                    <TableCell>Fee Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Discount</TableCell>
                    <TableCell>Discount Reason</TableCell>
                    <TableCell align="right">Net Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.fees.map((fee, index) => (
                    <TableRow key={fee.feeStructureId}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={fee.selected}
                          onChange={(e) =>
                            handleFeeChange(index, "selected", e.target.checked)
                          }
                        />
                      </TableCell>
                      <TableCell>{fee.name}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(fee.amount)}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={fee.discount}
                          onChange={(e) =>
                            handleFeeChange(
                              index,
                              "discount",
                              Number(e.target.value)
                            )
                          }
                          disabled={!fee.selected}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={fee.discountReason}
                          onChange={(e) =>
                            handleFeeChange(
                              index,
                              "discountReason",
                              e.target.value
                            )
                          }
                          disabled={!fee.selected || fee.discount === 0}
                          placeholder="Reason for discount"
                          sx={{ width: 200 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {fee.selected
                          ? formatCurrency(fee.amount - fee.discount)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} align="right">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Total Monthly Fees:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        color="primary"
                      >
                        {formatCurrency(totalFees)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Submit
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please review all the information before submitting.
              {formData.registrationNo
                ? ` Registration Number: ${formData.registrationNo}`
                : " A registration number will be automatically generated."}
            </Alert>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Student Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Registration No.
                  </Typography>
                  <Typography>
                    {formData.registrationNo || "Auto-generated"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Name
                  </Typography>
                  <Typography>
                    {formData.firstName} {formData.lastName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Date of Birth
                  </Typography>
                  <Typography>{formData.dateOfBirth}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Gender
                  </Typography>
                  <Typography>{formData.gender}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    CNIC
                  </Typography>
                  <Typography>{formData.cnic || "-"}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Address
                  </Typography>
                  <Typography>
                    {formData.address}, {formData.city}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Academic Details
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Class
                  </Typography>
                  <Typography>{selectedClass?.name || "-"}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Section
                  </Typography>
                  <Typography>
                    {sections.find((s) => s.id === formData.sectionId)?.name ||
                      "-"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Admission Date
                  </Typography>
                  <Typography>{formData.admissionDate}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Guardian Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Name
                  </Typography>
                  <Typography>
                    {formData.guardian.firstName} {formData.guardian.lastName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Relationship
                  </Typography>
                  <Typography>{formData.guardian.relationship}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography>{formData.guardian.phone}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    WhatsApp
                  </Typography>
                  <Typography>
                    {formData.guardian.whatsapp || formData.guardian.phone}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    CNIC
                  </Typography>
                  <Typography>{formData.guardian.cnic}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Fee Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Tuition Fee
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(formData.monthlyFee)}
                  </Typography>
                </Grid>
                {additionalFees > 0 && (
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Additional Fees (
                      {formData.fees.filter((f) => f.selected).length} items)
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(additionalFees)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Total Monthly Fee
              </Typography>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {formatCurrency(totalFees)}
              </Typography>
            </Paper>
          </Box>
        );

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
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => router.push("/students")}
            sx={{ mb: 2 }}
          >
            Back to Students
          </Button>
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            New Student Admission
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete all steps to admit a new student
          </Typography>
        </Box>

        {/* Stepper */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Form Content */}
        <Paper sx={{ p: 3 }}>
          {renderStepContent(activeStep)}

          {/* Navigation Buttons */}
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
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<BackIcon />}
            >
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={submitting}
                  startIcon={
                    submitting ? <CircularProgress size={20} /> : <SaveIcon />
                  }
                >
                  {submitting ? "Submitting..." : "Submit Admission"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<NextIcon />}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </MainLayout>
  );
}
