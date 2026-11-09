"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  PlayArrow as ActivateIcon,
  TrendingUp as PromoteIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import MainLayout from "@/components/layout/MainLayout";
import { useAcademicSession, sessionStatus, AcademicSession } from "@/components/providers/AcademicSessionProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

const statusChip: Record<string, { label: string; color: "success" | "info" | "default" | "warning" }> = {
  ACTIVE: { label: "Active", color: "success" },
  ENDED_ACTIVE: { label: "Active (ended)", color: "warning" },
  UPCOMING: { label: "Upcoming", color: "info" },
  ENDED: { label: "Past", color: "default" },
  OPEN: { label: "Open", color: "default" },
  CLOSED: { label: "Closed", color: "default" },
};

interface FormState {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  copyFees: boolean;
}

const toInput = (d: string | Date) => new Date(d).toISOString().split("T")[0];

// Suggest the session after the latest one, e.g. 2026-27 from Apr 2026 to Mar 2027
function suggestNext(sessions: AcademicSession[]): FormState {
  const latest = sessions[0];
  const start = latest ? new Date(latest.endDate) : new Date(new Date().getFullYear(), 3, 1);
  if (latest) start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return {
    name: `${start.getFullYear()}-${String(end.getFullYear()).slice(-2)}`,
    startDate: toInput(start),
    endDate: toInput(end),
    copyFees: !!latest,
  };
}

export default function SessionsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { sessions, currentSession, loading, refreshSessions } = useAcademicSession();
  const canManage = can(Permission.MANAGE_ACADEMIC_YEAR);
  const canPromote = can(Permission.PROMOTE_STUDENT);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", startDate: "", endDate: "", copyFees: false });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm(suggestNext(sessions));
    setDialogOpen(true);
  };
  const openEdit = (s: AcademicSession) => {
    setForm({ id: s.id, name: s.name, startDate: toInput(s.startDate), endDate: toInput(s.endDate), copyFees: false });
    setDialogOpen(true);
  };

  const request = async (method: "POST" | "PUT" | "DELETE", body?: object, query = "") => {
    const res = await fetch(`/api/academic-years${query}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) {
        await request("PUT", { id: form.id, name: form.name, startDate: form.startDate, endDate: form.endDate });
        toast.success("Session updated");
      } else {
        const d = await request("POST", {
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
          copyFeeStructuresFromId: form.copyFees ? sessions[0]?.id : undefined,
        });
        toast.success(
          d.copiedFeeStructures ? `Session created with ${d.copiedFeeStructures} fee structures copied` : "Session created"
        );
      }
      setDialogOpen(false);
      await refreshSessions();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const action = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
      await refreshSessions();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const makeActive = (s: AcademicSession) => {
    if (
      !window.confirm(
        `Make ${s.name} the active session?\n\nNew admissions go into it and monthly fees are generated from its fee structures. Promote students first if you haven't.`
      )
    )
      return;
    void action(() => request("PUT", { id: s.id, isCurrent: true }), `${s.name} is now the active session`);
  };

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              Academic Sessions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The active session is used for new admissions, fee generation, exams and results.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {canPromote && (
              <Button variant="outlined" startIcon={<PromoteIcon />} onClick={() => router.push("/sessions/promote")}>
                Promote students
              </Button>
            )}
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                New session
              </Button>
            )}
          </Box>
        </Box>

        {currentSession && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Active session</Typography>
                  <Typography variant="h5" fontWeight="bold">{currentSession.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(currentSession.startDate)} to {formatDate(currentSession.endDate)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Students enrolled</Typography>
                  <Typography variant="h5" fontWeight="bold">{currentSession._count?.students ?? "-"}</Typography>
                  <Typography variant="body2" color="text.secondary">Active and inactive students</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Time left</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {Math.max(0, Math.ceil((new Date(currentSession.endDate).getTime() - Date.now()) / 86400000))} days
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Until {formatDate(currentSession.endDate)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {!loading && sessions.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No sessions yet. Create the first session to start admitting students.
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Session</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Students</TableCell>
                <TableCell align="right">Fee structures</TableCell>
                <TableCell align="right">Exams</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => {
                  const st = statusChip[sessionStatus(s)];
                  const counts = s._count;
                  return (
                    <TableRow key={s.id} hover selected={s.isCurrent}>
                      <TableCell>
                        <Typography fontWeight={s.isCurrent ? "bold" : "normal"}>{s.name}</Typography>
                      </TableCell>
                      <TableCell>
                        {formatDate(s.startDate)} to {formatDate(s.endDate)}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={st.label} color={st.color} />
                      </TableCell>
                      <TableCell align="right">{counts?.students ?? "-"}</TableCell>
                      <TableCell align="right">
                        {counts?.feeStructures === 0 && s.isActive ? (
                          <Tooltip title="No fee structures: monthly fees won't be generated for this session">
                            <Chip size="small" color="warning" label="0" />
                          </Tooltip>
                        ) : (
                          counts?.feeStructures ?? "-"
                        )}
                      </TableCell>
                      <TableCell align="right">{counts?.exams ?? "-"}</TableCell>
                      {canManage && (
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          {!s.isCurrent && (
                            <Tooltip title="Make active session">
                              <IconButton size="small" color="success" onClick={() => makeActive(s)}>
                                <ActivateIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(s)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {!s.isCurrent &&
                            (s.isActive ? (
                              <Tooltip title="Close session (read-only)">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    action(() => request("PUT", { id: s.id, isActive: false }), `${s.name} closed`)
                                  }
                                >
                                  <LockIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Reopen session">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    action(() => request("PUT", { id: s.id, isActive: true }), `${s.name} reopened`)
                                  }
                                >
                                  <LockOpenIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ))}
                          {!s.isCurrent && (counts?.students ?? 0) === 0 && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() =>
                                  window.confirm(`Delete session ${s.name}?`) &&
                                  action(() => request("DELETE", undefined, `?id=${s.id}`), "Session deleted")
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{form.id ? "Edit session" : "New session"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              placeholder="2026-27"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            {!form.id && sessions[0] && (
              <FormControlLabel
                control={
                  <Checkbox checked={form.copyFees} onChange={(e) => setForm({ ...form, copyFees: e.target.checked })} />
                }
                label={`Copy fee structures from ${sessions[0].name}`}
              />
            )}
            {!form.id && (
              <Typography variant="caption" color="text.secondary">
                The new session isn&apos;t made active automatically (unless it&apos;s the first one). Promote students,
                then make it active.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={saving || !form.name.trim() || !form.startDate || !form.endDate}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
