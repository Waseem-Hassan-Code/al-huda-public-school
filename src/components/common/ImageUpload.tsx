"use client";

import { useState, useRef } from "react";
import {
  Box,
  Avatar,
  IconButton,
  CircularProgress,
  Typography,
  Tooltip,
} from "@mui/material";
import { PhotoCamera, Delete, Person } from "@mui/icons-material";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string | null;
  onChange: (path: string | null) => void;
  type: "student" | "teacher" | "user";
  size?: number;
  name?: string;
  disabled?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  type,
  size = 120,
  name,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed."
      );
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        onChange(data.path);
        toast.success("Image uploaded successfully");
      } else {
        toast.error(data.error || "Failed to upload image");
        setPreview(value || null);
      }
    } catch (error) {
      toast.error("Failed to upload image");
      setPreview(value || null);
    } finally {
      setUploading(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getInitials = () => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0]?.[0]?.toUpperCase() || "";
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Avatar
          src={preview || value || undefined}
          sx={{
            width: size,
            height: size,
            fontSize: size / 3,
            bgcolor: "primary.main",
          }}
        >
          {!preview &&
            !value &&
            (name ? getInitials() : <Person sx={{ fontSize: size / 2 }} />)}
        </Avatar>

        {uploading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0, 0, 0, 0.5)",
              borderRadius: "50%",
            }}
          >
            <CircularProgress size={size / 3} sx={{ color: "white" }} />
          </Box>
        )}

        {!disabled && !uploading && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              display: "flex",
              gap: 0.5,
            }}
          >
            <Tooltip title="Upload Photo">
              <IconButton
                size="small"
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": { bgcolor: "primary.dark" },
                  width: size / 4,
                  height: size / 4,
                  minWidth: 28,
                  minHeight: 28,
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <PhotoCamera sx={{ fontSize: size / 6, minWidth: 14 }} />
              </IconButton>
            </Tooltip>
            {(preview || value) && (
              <Tooltip title="Remove Photo">
                <IconButton
                  size="small"
                  sx={{
                    bgcolor: "error.main",
                    color: "white",
                    "&:hover": { bgcolor: "error.dark" },
                    width: size / 4,
                    height: size / 4,
                    minWidth: 28,
                    minHeight: 28,
                  }}
                  onClick={handleRemove}
                >
                  <Delete sx={{ fontSize: size / 6, minWidth: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      <Typography variant="caption" color="text.secondary">
        Click camera to upload photo
      </Typography>
    </Box>
  );
}
