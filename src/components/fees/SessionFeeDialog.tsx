"use client";

// "Generate session fees": lists the active session's students on the per-session
// fee plan, shows who already has this session's fee voucher, and creates the rest.

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { toast } from "sonner";
import { rs } from "@/lib/fee-utils";

interface Row {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  sessionFee: number;
  class?: { name: string } | null;
  section?: { name: string } | null;
  voucher: { id: string; voucherNo: string; totalAmount: number; balanceDue: number; status: string } | null;
}

export default function SessionFeeDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [data, setData] = useState<{ academicYear: { name: string; endDate: string }; students: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/fee-vouchers/session");
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to load");
        setData(d);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [open]);

  const toCreate = data?.students.filter((s) => !s.voucher && s.sessionFee > 0) ?? [];
  const noFee = data?.students.filter((s) => !s.voucher && !(s.sessionFee > 0)) ?? [];

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/fee-vouchers/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: toCreate.map((s) => s.id) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      toast.success(d.message);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="md" fullWidth>
      <DialogTitle>Generate session fees{data ? ` for ${data.academicYear.name}` : ""}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {!data && !error && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {data && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              One voucher per student for the whole session, payable from the start and due up to{" "}
              {new Date(data.academicYear.endDate).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}. Parents
              can pay in advance, in parts, or at the end; any balance carries to the next session as arrears. Students are
              put on the per-session plan from their profile (Fee plan) or at admission.
            </Typography>
            {data.students.length === 0 ? (
              <Alert severity="info">No active students in this session are on the per-session fee plan.</Alert>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Session fee</TableCell>
                    <TableCell>Voucher</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {s.firstName} {s.lastName}
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {s.registrationNo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {s.class?.name ?? "-"}
                        {s.section ? ` - ${s.section.name}` : ""}
                      </TableCell>
                      <TableCell align="right">{s.sessionFee > 0 ? rs(s.sessionFee) : "-"}</TableCell>
                      <TableCell>
                        {s.voucher ? (
                          <Chip
                            size="small"
                            color={s.voucher.balanceDue > 0 ? "warning" : "success"}
                            label={`${s.voucher.voucherNo} · ${s.voucher.balanceDue > 0 ? `${rs(s.voucher.balanceDue)} due` : "paid"}`}
                          />
                        ) : s.sessionFee > 0 ? (
                          <Chip size="small" color="primary" variant="outlined" label="Will be created" />
                        ) : (
                          <Chip size="small" variant="outlined" label="Set a session fee first" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {noFee.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {noFee.length} student(s) have no session fee amount. Set it on their profile (Fee plan), then generate again.
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={create}
          disabled={busy || toCreate.length === 0}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {toCreate.length > 0 ? `Create ${toCreate.length} voucher${toCreate.length === 1 ? "" : "s"}` : "Nothing to create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
