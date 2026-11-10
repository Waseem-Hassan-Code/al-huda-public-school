"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  Checkbox,
  FormControlLabel,
  Alert,
} from "@mui/material";
import { ArrowBack as BackIcon, Save as SaveIcon } from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import ImageUpload from "@/components/common/ImageUpload";
import { maskCNIC, maskPhone, capitalizeFirst } from "@/lib/utils";
import { toast } from "sonner";

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface FormData {
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
  status: string;
  // Parent / guardian
  fatherName: string;
  motherName: string;
  guardianName: string;
  guardianRelation: string;
  guardianCnic: string;
  guardianPhone: string;
  guardianWhatsapp: string;
  guardianPhone2: string;
  guardianEmail: string;
  guardianOccupation: string;
  guardianAddress: string;
}

const GUARDIAN_RELATIONS = ["FATHER", "MOTHER", "GUARDIAN", "BROTHER", "SISTER", "UNCLE", "AUNT", "OTHER"];

interface FamilyInfo {
  parentId: string;
  siblingCount: number;
}

export default function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState<FormData>({
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
    status: "ACTIVE",
    fatherName: "",
    motherName: "",
    guardianName: "",
    guardianRelation: "",
    guardianCnic: "",
    guardianPhone: "",
    guardianWhatsapp: "",
    guardianPhone2: "",
    guardianEmail: "",
    guardianOccupation: "",
    guardianAddress: "",
  });
  // Siblings share one family (Parent) record; offer to update it with them
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [applyToFamily, setApplyToFamily] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentRes, classesRes] = await Promise.all([
          fetch(`/api/students/${id}`),
          fetch("/api/classes"),
        ]);

        if (studentRes.ok) {
          const student = await studentRes.json();
          setFormData({
            firstName: student.firstName || "",
            lastName: student.lastName || "",
            dateOfBirth: student.dateOfBirth?.split("T")[0] || "",
            gender: student.gender || "",
            cnic: student.cnic || "",
            religion: student.religion || "",
            nationality: student.nationality || "Pakistani",
            bloodGroup: student.bloodGroup || "",
            address: student.address || "",
            city: student.city || "",
            phone: student.phone || "",
            email: student.email || "",
            photo: student.photo || "",
            classId: student.class?.id || "",
            sectionId: student.section?.id || "",
            status: student.status || "ACTIVE",
            fatherName: student.fatherName || "",
            motherName: student.motherName || "",
            guardianName: student.guardianName || "",
            guardianRelation: student.guardianRelation || "",
            guardianCnic: student.guardianCnic || "",
            guardianPhone: student.guardianPhone || "",
            guardianWhatsapp: student.guardianWhatsapp || "",
            guardianPhone2: student.guardianPhone2 || "",
            guardianEmail: student.guardianEmail || "",
            guardianOccupation: student.guardianOccupation || "",
            guardianAddress: student.guardianAddress || "",
          });
          setFamily(
            student.parent
              ? { parentId: student.parent.id, siblingCount: student.parent.students?.length ?? 0 }
              : null
          );
        } else {
          toast.error("Failed to load student");
          router.push("/students");
        }

        if (classesRes.ok) {
          const data = await classesRes.json();
          setClasses(data.classes || data.data || []);
        }
      } catch (error) {
        toast.error("An error occurred");
        router.push("/students");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && id) {
      fetchData();
    }
  }, [status, id, router]);

  // Opened from the profile's guardian card (#guardian): scroll to that section
  useEffect(() => {
    if (!loading && window.location.hash === "#guardian") {
      document.getElementById("guardian")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClassChange = (classId: string) => {
    setFormData((prev) => ({ ...prev, classId, sectionId: "" }));
  };

  const handleSave = async () => {
    // Same rule as admission: only the first name is required
    if (!formData.firstName.trim()) {
      toast.error("First name is required");
      return;
    }

    setSaving(true);
    try {
      // Capitalize names before sending
      const dataToSend = {
        ...formData,
        firstName: capitalizeFirst(formData.firstName),
        lastName: formData.lastName ? capitalizeFirst(formData.lastName) : "",
        guardianName: formData.guardianName.trim(),
        guardianEmail: formData.guardianEmail.trim().toLowerCase(),
        applyToFamily: !!family && applyToFamily,
      };

      const res = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (res.ok) {
        const saved = await res.json().catch(() => ({}));
        const fam = saved?.family;
        toast.success("Student updated successfully", {
          description:
            fam && (fam.changed || fam.newlyLinked > 0) && fam.siblingCount > 0
              ? `Linked as sibling of ${fam.siblingCount} student${fam.siblingCount === 1 ? "" : "s"} with the same guardian CNIC`
              : undefined,
        });
        router.push(`/students/${id}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update student", {
          description: data.details,
        });
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === formData.classId);
  const sections = selectedClass?.sections || [];

  if (!mounted || status === "loading" || loading) {
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box>
            <Button
              startIcon={<BackIcon />}
              onClick={() => router.push(`/students/${id}`)}
              sx={{ mb: 1 }}
            >
              Back to Student
            </Button>
            <Typography variant="h4" fontWeight="bold">
              Edit Student
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : "Save Changes"}
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Personal Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <ImageUpload
                  value={formData.photo}
                  onChange={(path) => handleInputChange("photo", path || "")}
                  type="student"
                  size={120}
                  name={`${formData.firstName} ${formData.lastName}`.trim()}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="First Name"
                    fullWidth
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Last Name"
                    fullWidth
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Date of Birth"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      handleInputChange("dateOfBirth", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={formData.gender}
                      label="Gender"
                      onChange={(e) =>
                        handleInputChange("gender", e.target.value)
                      }
                    >
                      <MenuItem value="">Not set</MenuItem>
                      <MenuItem value="MALE">Male</MenuItem>
                      <MenuItem value="FEMALE">Female</MenuItem>
                      <MenuItem value="OTHER">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="CNIC / B-Form"
                    fullWidth
                    value={formData.cnic}
                    onChange={(e) =>
                      handleInputChange("cnic", maskCNIC(e.target.value))
                    }
                    placeholder="XXXXX-XXXXXXX-X"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Religion</InputLabel>
                    <Select
                      value={formData.religion}
                      label="Religion"
                      onChange={(e) =>
                        handleInputChange("religion", e.target.value)
                      }
                    >
                      <MenuItem value="ISLAM">Islam</MenuItem>
                      <MenuItem value="CHRISTIANITY">Christianity</MenuItem>
                      <MenuItem value="HINDUISM">Hinduism</MenuItem>
                      <MenuItem value="SIKHISM">Sikhism</MenuItem>
                      <MenuItem value="OTHER">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Nationality"
                    fullWidth
                    value={formData.nationality}
                    onChange={(e) =>
                      handleInputChange("nationality", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Blood Group</InputLabel>
                    <Select
                      value={formData.bloodGroup}
                      label="Blood Group"
                      onChange={(e) =>
                        handleInputChange("bloodGroup", e.target.value)
                      }
                    >
                      <MenuItem value="A_POSITIVE">A+</MenuItem>
                      <MenuItem value="A_NEGATIVE">A-</MenuItem>
                      <MenuItem value="B_POSITIVE">B+</MenuItem>
                      <MenuItem value="B_NEGATIVE">B-</MenuItem>
                      <MenuItem value="AB_POSITIVE">AB+</MenuItem>
                      <MenuItem value="AB_NEGATIVE">AB-</MenuItem>
                      <MenuItem value="O_POSITIVE">O+</MenuItem>
                      <MenuItem value="O_NEGATIVE">O-</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Contact & Academic Info */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Address"
                    fullWidth
                    multiline
                    rows={2}
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="City"
                    fullWidth
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Phone"
                    fullWidth
                    value={formData.phone}
                    onChange={(e) =>
                      handleInputChange("phone", maskPhone(e.target.value))
                    }
                    placeholder="03XX-XXXXXXX"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Academic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Class</InputLabel>
                    <Select
                      value={formData.classId}
                      label="Class"
                      onChange={(e) => handleClassChange(e.target.value)}
                    >
                      {classes.map((cls) => (
                        <MenuItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth disabled={!formData.classId}>
                    <InputLabel>Section</InputLabel>
                    <Select
                      value={formData.sectionId}
                      label="Section"
                      onChange={(e) =>
                        handleInputChange("sectionId", e.target.value)
                      }
                    >
                      {sections.map((sec) => (
                        <MenuItem key={sec.id} value={sec.id}>
                          {sec.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) =>
                        handleInputChange("status", e.target.value)
                      }
                    >
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="INACTIVE">Inactive</MenuItem>
                      <MenuItem value="GRADUATED">Graduated</MenuItem>
                      <MenuItem value="TRANSFERRED">Transferred</MenuItem>
                      <MenuItem value="EXPELLED">Expelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          {/* Parent / Guardian Information */}
          <Grid size={{ xs: 12 }} id="guardian">
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Parent / Guardian Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Father Name"
                    value={formData.fatherName}
                    onChange={(e) => handleInputChange("fatherName", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Mother Name"
                    value={formData.motherName}
                    onChange={(e) => handleInputChange("motherName", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }} />
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Guardian Name"
                    value={formData.guardianName}
                    onChange={(e) => handleInputChange("guardianName", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Relationship</InputLabel>
                    <Select
                      value={formData.guardianRelation}
                      label="Relationship"
                      onChange={(e) => handleInputChange("guardianRelation", e.target.value)}
                    >
                      <MenuItem value="">Not set</MenuItem>
                      {/* Keep older values (e.g. from the mobile app) selectable */}
                      {[
                        ...GUARDIAN_RELATIONS,
                        ...(formData.guardianRelation && !GUARDIAN_RELATIONS.includes(formData.guardianRelation)
                          ? [formData.guardianRelation]
                          : []),
                      ].map((r) => (
                        <MenuItem key={r} value={r}>
                          {r.charAt(0) + r.slice(1).toLowerCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Guardian CNIC"
                    placeholder="XXXXX-XXXXXXX-X"
                    value={formData.guardianCnic}
                    onChange={(e) => handleInputChange("guardianCnic", maskCNIC(e.target.value))}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Guardian Phone"
                    placeholder="03XX-XXXXXXX"
                    value={formData.guardianPhone}
                    onChange={(e) => handleInputChange("guardianPhone", maskPhone(e.target.value))}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="WhatsApp Number"
                    placeholder="03XX-XXXXXXX"
                    value={formData.guardianWhatsapp}
                    onChange={(e) => handleInputChange("guardianWhatsapp", maskPhone(e.target.value))}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Emergency Contact"
                    placeholder="03XX-XXXXXXX"
                    value={formData.guardianPhone2}
                    onChange={(e) => handleInputChange("guardianPhone2", maskPhone(e.target.value))}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Guardian Email"
                    type="email"
                    value={formData.guardianEmail}
                    onChange={(e) => handleInputChange("guardianEmail", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Occupation"
                    value={formData.guardianOccupation}
                    onChange={(e) => handleInputChange("guardianOccupation", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Guardian Address"
                    value={formData.guardianAddress}
                    onChange={(e) => handleInputChange("guardianAddress", e.target.value)}
                  />
                </Grid>
                {family && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="info" icon={false}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={applyToFamily}
                            onChange={(e) => setApplyToFamily(e.target.checked)}
                          />
                        }
                        label={
                          family.siblingCount > 0
                            ? `Also update the family record and the guardian details of ${family.siblingCount} sibling${family.siblingCount === 1 ? "" : "s"}`
                            : "Also update the linked family (parent) record"
                        }
                      />
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
}
