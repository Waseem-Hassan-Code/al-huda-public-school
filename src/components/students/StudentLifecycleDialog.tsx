"use client";

// Archive / restore / permanently delete a student.
// - Archive: deactivates (hidden from the list, no new fees, no mobile login); all records kept.
// - Restore: makes an archived student active again.
// - Delete: removes the student and every record linked to them. Shows what will be
//   removed and asks for the registration number to confirm.

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import {
  Archive as ArchiveIcon,
  DeleteForever as DeleteForeverIcon,
  Unarchive as UnarchiveIcon,
} from "@mui/icons-material";
import { toast } from "sonner";

export type LifecycleMode = "archive" | "restore" | "delete";

interface Props {
  open: boolean;
  mode: LifecycleMode;
  student: { id: string; firstName: string; lastName: string; registrationNo: string } | null;
  onClose: () => void;
  /** Called after the action succeeded */
  onDone: (mode: LifecycleMode) => void;
  /** Lets "Archive instead" switch the dialog from delete to archive */
  onModeChange?: (mode: LifecycleMode) => void;
}

const COUNT_LABELS: Record<string, string> = {
  feeVouchers: "fee vouchers",
  payments: "payments",
  attendance: "attendance records",
  marks: "exam marks",
  complaints: "complaints",
  messages: "messages",
  subjects: "subject enrolments",
  promotions: "promotion history entries",
};

export default function StudentLifecycleDialog({ open, mode, student, onClose, onDone, onModeChange }: Props) {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ counts: Record<string, number>; removesFamilyRecord: boolean } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setConfirmText("");
    setPreview(null);
    setPreviewError(null);
    if (mode === "delete" && student) {
      (async () => {
        try {
          const res = await fetch(`/api/students/${student.id}?preview=1`, { method: "DELETE" });
          const d = await res.json();
          if (!res.ok) throw new Error(d.error || "Could not check linked records");
          setPreview(d);
        } catch (e) {
          setPreviewError((e as Error).message);
        }
      })();
    }
  }, [open, mode, student]);

  if (!student) return null;
  const name = `${student.firstName} ${student.lastName}`.trim();

  const run = async () => {
    setBusy(true);
    try {
      const res =
        mode === "delete"
          ? await fetch(`/api/students/${student.id}?confirm=${encodeURIComponent(confirmText.trim())}`, {
              method: "DELETE",
            })
          : await fetch(`/api/students/${student.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: mode, reason: reason.trim() || undefined }),
            });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Something went wrong");
      toast.success(
        mode === "delete" ? `${name} was permanently deleted` : mode === "archive" ? `${name} was archived` : `${name} was restored`
      );
      onDone(mode);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const linked = preview ? Object.entries(preview.counts).filter(([, n]) => n > 0) : [];
  const canDelete = confirmText.trim() === student.registrationNo && !!preview && !busy;

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {mode === "archive" && <ArchiveIcon color="warning" />}
        {mode === "restore" && <UnarchiveIcon color="success" />}
        {mode === "delete" && <DeleteForeverIcon color="error" />}
        {mode === "archive" ? "Archive student" : mode === "restore" ? "Restore student" : "Delete student permanently"}
      </DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ mb: 2 }}>
          <strong>{name}</strong> ({student.registrationNo})
        </Typography>

        {mode === "archive" && (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Archiving deactivates the student. All records stay and you can restore them any time:
            </Typography>
            <Box component="ul" sx={{ mt: 0, pl: 3, typography: "body2", color: "text.secondary" }}>
              <li>Hidden from the students list (shown under the &quot;Archived&quot; filter)</li>
              <li>No new monthly fee vouchers; existing dues and history are kept</li>
              <li>Mobile app login is blocked</li>
            </Box>
            <TextField
              label="Reason (optional)"
              placeholder="e.g. Left school, moved to another city"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              size="small"
              sx={{ mt: 1 }}
            />
          </>
        )}

        {mode === "restore" && (
          <Typography variant="body2">
            The student becomes active again: shown in the students list, included in monthly fee generation, and
            mobile app login is allowed.
          </Typography>
        )}

        {mode === "delete" && (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>
              This permanently removes the student and everything linked to them. It cannot be undone.
              {onModeChange && " If they have left the school, archive them instead to keep their records."}
            </Alert>
            {previewError && <Alert severity="warning">{previewError}</Alert>}
            {!preview && !previewError && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            {preview && (
              <>
                <Typography variant="body2" fontWeight={600}>
                  {linked.length > 0 ? "This will also delete:" : "No other records are linked to this student."}
                </Typography>
                {linked.length > 0 && (
                  <List dense disablePadding sx={{ mb: 1 }}>
                    {linked.map(([key, n]) => (
                      <ListItem key={key} disableGutters sx={{ py: 0 }}>
                        <ListItemText primary={`${n} ${COUNT_LABELS[key] ?? key}`} />
                      </ListItem>
                    ))}
                    {preview.removesFamilyRecord && (
                      <ListItem disableGutters sx={{ py: 0 }}>
                        <ListItemText primary="the family (parent) record, since no siblings are left in it" />
                      </ListItem>
                    )}
                  </List>
                )}
                {(preview.counts.payments ?? 0) > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Fee collections will disappear from payment reports and totals.
                  </Alert>
                )}
                <TextField
                  label={`Type ${student.registrationNo} to confirm`}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  fullWidth
                  size="small"
                  autoFocus
                  error={confirmText.length > 0 && confirmText.trim() !== student.registrationNo}
                />
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {mode === "delete" && onModeChange && (
          <Button startIcon={<ArchiveIcon />} onClick={() => onModeChange("archive")} disabled={busy} sx={{ mr: "auto" }}>
            Archive instead
          </Button>
        )}
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={mode === "delete" ? "error" : mode === "archive" ? "warning" : "success"}
          onClick={run}
          disabled={busy || (mode === "delete" && !canDelete)}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {mode === "delete" ? "Delete permanently" : mode === "archive" ? "Archive" : "Restore"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
