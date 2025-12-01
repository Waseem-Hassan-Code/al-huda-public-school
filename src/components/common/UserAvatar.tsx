"use client";

import { Avatar, Badge, Tooltip, SxProps, Theme } from "@mui/material";
import { Person } from "@mui/icons-material";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  showBadge?: boolean;
  badgeColor?: "success" | "error" | "warning" | "info" | "default";
  tooltip?: string;
  sx?: SxProps<Theme>;
  onClick?: () => void;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

// Generate consistent color based on name
const stringToColor = (string: string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#1976d2", // blue
    "#388e3c", // green
    "#d32f2f", // red
    "#7b1fa2", // purple
    "#f57c00", // orange
    "#0288d1", // light blue
    "#c2185b", // pink
    "#00796b", // teal
    "#5d4037", // brown
    "#455a64", // blue grey
  ];
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name?: string | null) => {
  if (!name) return "";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() || "";
};

export default function UserAvatar({
  src,
  name,
  size = "md",
  showBadge = false,
  badgeColor = "success",
  tooltip,
  sx,
  onClick,
}: UserAvatarProps) {
  const pixelSize = typeof size === "number" ? size : sizeMap[size];
  const fontSize = pixelSize / 2.5;
  const initials = getInitials(name);
  const bgColor = name ? stringToColor(name) : "primary.main";

  const avatarComponent = (
    <Avatar
      src={src || undefined}
      alt={name || "User"}
      onClick={onClick}
      sx={{
        width: pixelSize,
        height: pixelSize,
        fontSize,
        bgcolor: src ? "transparent" : bgColor,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s ease",
        "&:hover": onClick
          ? {
              transform: "scale(1.05)",
            }
          : {},
        ...sx,
      }}
    >
      {!src && (initials || <Person sx={{ fontSize: fontSize * 1.2 }} />)}
    </Avatar>
  );

  const badgedAvatar = showBadge ? (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      variant="dot"
      sx={{
        "& .MuiBadge-badge": {
          backgroundColor:
            badgeColor === "success"
              ? "#44b700"
              : badgeColor === "error"
              ? "#f44336"
              : badgeColor === "warning"
              ? "#ff9800"
              : badgeColor === "info"
              ? "#2196f3"
              : "#9e9e9e",
          color:
            badgeColor === "success"
              ? "#44b700"
              : badgeColor === "error"
              ? "#f44336"
              : badgeColor === "warning"
              ? "#ff9800"
              : badgeColor === "info"
              ? "#2196f3"
              : "#9e9e9e",
          boxShadow: "0 0 0 2px white",
          "&::after": {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            animation:
              badgeColor === "success"
                ? "ripple 1.2s infinite ease-in-out"
                : "none",
            border: "1px solid currentColor",
            content: '""',
          },
        },
        "@keyframes ripple": {
          "0%": {
            transform: "scale(.8)",
            opacity: 1,
          },
          "100%": {
            transform: "scale(2.4)",
            opacity: 0,
          },
        },
      }}
    >
      {avatarComponent}
    </Badge>
  ) : (
    avatarComponent
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow>
        {badgedAvatar}
      </Tooltip>
    );
  }

  return badgedAvatar;
}
