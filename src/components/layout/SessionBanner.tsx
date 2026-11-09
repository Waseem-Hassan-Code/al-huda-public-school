"use client";

import React from "react";
import { Alert, Button } from "@mui/material";
import { useRouter, usePathname } from "next/navigation";
import { useAcademicSession } from "@/components/providers/AcademicSessionProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

// Warns when there is no active session, the active session has ended, or the
// user is looking at a different session than the active one.
export default function SessionBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();
  const { loading, currentSession, selectedSession, isViewingCurrent, selectSession } = useAcademicSession();
  const canManage = can(Permission.MANAGE_ACADEMIC_YEAR);

  if (loading || pathname?.startsWith("/sessions")) return null;

  if (!currentSession) {
    return (
      <Alert
        severity="error"
        sx={{ mb: 2 }}
        action={
          canManage && (
            <Button color="inherit" size="small" onClick={() => router.push("/sessions")}>
              Set up session
            </Button>
          )
        }
      >
        No academic session is active. Admissions and monthly fee generation need an active session.
      </Alert>
    );
  }

  if (!isViewingCurrent && selectedSession) {
    return (
      <Alert
        severity="info"
        sx={{ mb: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => selectSession(null)}>
            Back to {currentSession.name}
          </Button>
        }
      >
        You are viewing session {selectedSession.name}. The active session is {currentSession.name}.
      </Alert>
    );
  }

  if (new Date(currentSession.endDate) < new Date()) {
    return (
      <Alert
        severity="warning"
        sx={{ mb: 2 }}
        action={
          can(Permission.PROMOTE_STUDENT) && (
            <Button color="inherit" size="small" onClick={() => router.push("/sessions/promote")}>
              Start new session
            </Button>
          )
        }
      >
        Session {currentSession.name} ended on {formatDate(currentSession.endDate)}. Promote students and start
        the next session.
      </Alert>
    );
  }

  return null;
}
