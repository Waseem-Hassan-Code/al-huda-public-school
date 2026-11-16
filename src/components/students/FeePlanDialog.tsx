"use client";

// Change a student's fee plan: monthly tuition, or one agreed fee for the whole
// session. Optionally creates this session's fee voucher right away.

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { toast } from "sonner";

export interface FeePlanStudent {
  id: string;
  feePlan?: string;
  monthlyFee: number;
  sessionFee?: number;
  /** This session's fee voucher already exists */
  hasSessionVoucher: boolean;
  sessionName?: string;
}

export default function FeePlanDialog({
  open,
  student,
  onClose,
  onSaved,
}: {
  open: boolean;
  student: FeePlanStudent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [plan, setPlan] = useState<"MONTHLY" | "SESSION">("MONTHLY");
  const [monthlyFee, setMonthlyFee] = useState("0");
  const [sessionFee, setSessionFee] = useState("0");
  const [createVoucher, setCreateVoucher] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlan(student.feePlan === "SESSION" ? "SESSION" : "MONTHLY");
    setMonthlyFee(String(student.monthlyFee ?? 0));
    setSessionFee(String(student.sessionFee ?? 0));
    setCreateVoucher(!student.hasSessionVoucher);
  }, [open, student]);

  const sessionAmount = parseFloat(sessionFee) || 0;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feePlan: plan, monthlyFee, sessionFee }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.details || d.error || "Failed to save fee plan");

      if (plan === "SESSION" && createVoucher && !student.hasSessionVoucher && sessionAmount > 0) {
        const r = await fetch("/api/fee-vouchers/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: student.id }),
        });
        const v = await r.json();
        if (!r.ok) throw new Error(v.error || "Fee plan saved, but the session fee voucher could not be created");
        toast.success("Fee plan saved and session fee voucher created");
      } else {
        toast.success("Fee plan saved");
      }
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Fee plan</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <ToggleButtonGroup exclusive fullWidth size="small" color="primary" value={plan} onChange={(_, v) => v && setPlan(v)}>
            <ToggleButton value="MONTHLY">Monthly</ToggleButton>
            <ToggleButton value="SESSION">Per session</ToggleButton>
          </ToggleButtonGroup>

          {plan === "MONTHLY" ? (
            <>
              <Typography variant="body2" color="text.secondary">
                A monthly tuition voucher is generated every month.
              </Typography>
              <TextField
                label="Monthly tuition fee (Rs.)"
                type="number"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                inputProps={{ min: 0 }}
                size="small"
              />
              {student.hasSessionVoucher && (
                <Alert severity="info">
                  This session&apos;s session fee voucher stays as it is. Cancel it from Fee Vouchers if it shouldn&apos;t be
                  charged.
                </Alert>
              )}
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                One agreed fee for the whole session. No monthly tuition vouchers. It&apos;s payable from the start of the
                session and due by its end; parents can pay in advance, in parts, or at the end, and any balance carries to
                the next session as arrears. Other recurring fees (e.g. transport) still bill monthly.
              </Typography>
              <TextField
                label="Session fee (Rs.)"
                type="number"
                value={sessionFee}
                onChange={(e) => setSessionFee(e.target.value)}
                inputProps={{ min: 0 }}
                size="small"
                autoFocus
              />
              {student.hasSessionVoucher ? (
                <Alert severity="info">
                  The session fee voucher for {student.sessionName ?? "this session"} already exists. A new amount applies
                  from the next session (edit the voucher to change this session&apos;s amount).
                </Alert>
              ) : (
                <FormControlLabel
                  control={<Checkbox checked={createVoucher} onChange={(e) => setCreateVoucher(e.target.checked)} />}
                  label={`Create the session fee voucher for ${student.sessionName ?? "this session"} now`}
                  disabled={!(sessionAmount > 0)}
                />
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
