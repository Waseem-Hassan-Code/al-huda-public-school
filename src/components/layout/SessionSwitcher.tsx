"use client";

import React, { useState } from "react";
import { Box, Button, Chip, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import {
  CalendarMonth as CalendarIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useAcademicSession, sessionStatus } from "@/components/providers/AcademicSessionProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/lib/permissions";

const statusLabel: Record<string, { label: string; color: "success" | "info" | "default" | "warning" }> = {
  ACTIVE: { label: "Active", color: "success" },
  ENDED_ACTIVE: { label: "Active, ended", color: "warning" },
  UPCOMING: { label: "Upcoming", color: "info" },
  ENDED: { label: "Past", color: "default" },
  OPEN: { label: "Open", color: "default" },
  CLOSED: { label: "Closed", color: "default" },
};

export default function SessionSwitcher() {
  const router = useRouter();
  const { can } = usePermissions();
  const { sessions, selectedSession, currentSession, isViewingCurrent, selectSession } = useAcademicSession();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (sessions.length === 0 && !can(Permission.MANAGE_ACADEMIC_YEAR)) return null;

  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={<CalendarIcon />}
        endIcon={<ExpandMoreIcon />}
        sx={{
          color: "#fff",
          textTransform: "none",
          backgroundColor: isViewingCurrent ? "rgba(255,255,255,0.1)" : "rgba(255,193,7,0.35)",
          borderRadius: 2,
          px: 1.5,
          whiteSpace: "nowrap",
        }}
      >
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, mr: 0.5, opacity: 0.8 }}>
          Session
        </Box>
        {selectedSession?.name ?? "Not set"}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: "block" }}>
          View data for session
        </Typography>
        {sessions.map((s) => {
          const st = statusLabel[sessionStatus(s)];
          return (
            <MenuItem
              key={s.id}
              selected={s.id === selectedSession?.id}
              onClick={() => {
                selectSession(s.id === currentSession?.id ? null : s.id);
                setAnchor(null);
              }}
            >
              <ListItemIcon>{s.id === selectedSession?.id && <CheckIcon fontSize="small" />}</ListItemIcon>
              <ListItemText primary={s.name} />
              <Chip label={st.label} color={st.color} size="small" sx={{ ml: 2 }} />
            </MenuItem>
          );
        })}
        {can(Permission.MANAGE_ACADEMIC_YEAR) && [
          <Divider key="d" />,
          <MenuItem
            key="manage"
            onClick={() => {
              setAnchor(null);
              router.push("/sessions");
            }}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Manage sessions" />
          </MenuItem>,
        ]}
      </Menu>
    </>
  );
}
