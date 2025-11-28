"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  School as SchoolIcon,
} from "@mui/icons-material";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email/username or password");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #1565c0 0%, #0d47a1 50%, #1a237e 100%)",
        padding: 2,
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: "100%",
          maxWidth: 440,
          p: 4,
          borderRadius: 4,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)",
            opacity: 0.1,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -30,
            left: -30,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)",
            opacity: 0.1,
          }}
        />

        {/* Logo & Title */}
        <Box sx={{ textAlign: "center", mb: 4, position: "relative" }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
              boxShadow: "0 8px 32px rgba(21, 101, 192, 0.3)",
            }}
          >
            <SchoolIcon sx={{ fontSize: 40, color: "#fff" }} />
          </Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              background: "linear-gradient(90deg, #1565c0 0%, #1976d2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Al-Huda Public School
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("auth.loginSubtitle")}
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={`${t("auth.email")} / ${t("auth.username")}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoComplete="email"
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />

          <TextField
            fullWidth
            label={t("auth.password")}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
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
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              borderRadius: 2,
              background: "linear-gradient(90deg, #1565c0 0%, #1976d2 100%)",
              boxShadow: "0 4px 14px rgba(21, 101, 192, 0.35)",
              "&:hover": {
                background: "linear-gradient(90deg, #0d47a1 0%, #1565c0 100%)",
                boxShadow: "0 6px 20px rgba(21, 101, 192, 0.45)",
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: "#fff" }} />
            ) : (
              t("auth.login")
            )}
          </Button>
        </form>

        {/* Demo credentials */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: "#f5f7fa",
            borderRadius: 2,
            border: "1px dashed #e0e0e0",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mb: 1 }}
          >
            Demo Credentials:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            Email: admin@alhudapublicschool.edu.pk
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            Password: admin123
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
