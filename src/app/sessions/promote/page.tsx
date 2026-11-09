"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as DoneIcon,
  PlayArrow as ActivateIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import MainLayout from "@/components/layout/MainLayout";
import { useAcademicSession } from "@/components/providers/AcademicSessionProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/lib/permissions";

type Action = "PROMOTE" | "RETAIN" | "GRADUATE" | "LEAVE";

interface PStudent {
  id: string;
  registrationNo: string;
  rollNo: string | null;
  firstName: string;
  lastName: string;
  photo: string | null;
  classId: string | null;
  sectionId: string | null;
  section: { name: string } | null;
}
interface PClass {
  id: string;
  name: string;
  displayOrder: number;
  sections: { id: string; name: string }[];
  students: PStudent[];
}
interface RowChoice {
  action: Action;
  toSectionId: string;
}

const ACTION_LABELS: Record<Action, string> = {
  PROMOTE: "Promote",
  RETAIN: "Retain (same class)",
  GRADUATE: "Graduated",
  LEAVE: "Left school",
};
const NO_CLASS = "__none__";
const toInput = (d: Date) => d.toISOString().split("T")[0];

export default function PromoteStudentsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { sessions, currentSession, refreshSessions, selectSession } = useAcademicSession();

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [classes, setClasses] = useState<PClass[]>([]);
  const [unassigned, setUnassigned] = useState<PStudent[]>([]);
  const [processed, setProcessed] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [choices, setChoices] = useState<Record<string, RowChoice>>({});
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newSession, setNewSession] = useState({ name: "", startDate: "", endDate: "", copyFees: true });

  useEffect(() => {
    if (!fromId && currentSession) setFromId(currentSession.id);
  }, [currentSession, fromId]);

  const fromSession = sessions.find((s) => s.id === fromId);
  const targetOptions = useMemo(
    () =>
      sessions.filter(
        (s) => s.id !== fromId && s.isActive && (!fromSession || new Date(s.startDate) >= new Date(fromSession.startDate))
      ),
    [sessions, fromId, fromSession]
  );

  useEffect(() => {
    if (!targetOptions.some((s) => s.id === toId)) setToId(targetOptions[targetOptions.length - 1]?.id ?? "");
  }, [targetOptions, toId]);

  const load = useCallback(async () => {
    if (!fromId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/promotions?fromAcademicYearId=${fromId}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setClasses(d.classes || []);
      setUnassigned(d.unassigned || []);
      setProcessed(d.processed || {});
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [fromId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups: PClass[] = useMemo(
    () =>
      unassigned.length
        ? [...classes, { id: NO_CLASS, name: "No class assigned", displayOrder: 9999, sections: [], students: unassigned }]
        : classes,
    [classes, unassigned]
  );
  const remaining = groups.reduce((n, c) => n + c.students.length, 0);
  const processedTotal = Object.values(processed).reduce((a, b) => a + b, 0);

  const selectedClass = groups.find((c) => c.id === selectedClassId);
  const nextClassOf = (c: PClass) => {
    const idx = classes.findIndex((x) => x.id === c.id);
    return idx >= 0 ? classes[idx + 1] : undefined;
  };

  const sectionFor = (cls: PClass | undefined, name?: string | null) =>
    cls?.sections.find((s) => s.name === name)?.id ?? cls?.sections[0]?.id ?? "";

  // Default choices whenever the class or target class changes
  const initChoices = useCallback(
    (cls: PClass, target: PClass | undefined) => {
      const next: Record<string, RowChoice> = {};
      for (const st of cls.students) {
        const action: Action = cls.id === NO_CLASS ? "RETAIN" : target ? "PROMOTE" : "GRADUATE";
        next[st.id] = {
          action,
          toSectionId: action === "PROMOTE" ? sectionFor(target, st.section?.name) : st.sectionId ?? "",
        };
      }
      setChoices(next);
    },
    []
  );

  const openClass = (cls: PClass) => {
    setSelectedClassId(cls.id);
    const target = cls.id === NO_CLASS ? undefined : nextClassOf(cls);
    setTargetClassId(target?.id ?? "");
    initChoices(cls, target);
  };

  const targetClass = classes.find((c) => c.id === targetClassId);

  const setRow = (id: string, patch: Partial<RowChoice>) =>
    setChoices((prev) => {
      const row = { ...prev[id], ...patch };
      const st = selectedClass?.students.find((s) => s.id === id);
      if (patch.action) {
        row.toSectionId =
          patch.action === "PROMOTE"
            ? sectionFor(targetClass, st?.section?.name)
            : patch.action === "RETAIN"
              ? st?.sectionId ?? ""
              : "";
      }
      return { ...prev, [id]: row };
    });

  const setAll = (action: Action) => selectedClass?.students.forEach((s) => setRow(s.id, { action }));

  const changeTarget = (id: string) => {
    setTargetClassId(id);
    const tc = classes.find((c) => c.id === id);
    setChoices((prev) => {
      const next = { ...prev };
      for (const st of selectedClass?.students ?? []) {
        if (next[st.id]?.action === "PROMOTE") next[st.id] = { ...next[st.id], toSectionId: sectionFor(tc, st.section?.name) };
      }
      return next;
    });
  };

  const submitClass = async () => {
    if (!selectedClass || !toId) return;
    const items = selectedClass.students.map((st) => {
      const c = choices[st.id];
      return {
        studentId: st.id,
        action: c.action,
        toClassId: c.action === "PROMOTE" ? targetClassId : c.action === "RETAIN" ? st.classId ?? undefined : undefined,
        toSectionId: c.toSectionId || undefined,
      };
    });
    if (items.some((i) => i.action === "PROMOTE" && !i.toClassId)) {
      toast.error("Choose the class to promote into");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAcademicYearId: fromId, toAcademicYearId: toId, items }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      const s = d.summary;
      toast.success(
        `${selectedClass.name}: ${s.PROMOTE} promoted, ${s.RETAIN} retained, ${s.GRADUATE} graduated, ${s.LEAVE} left`
      );
      setSelectedClassId("");
      await load();
      await refreshSessions();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    const base = fromSession ? new Date(fromSession.endDate) : new Date();
    const start = new Date(base);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    setNewSession({
      name: `${start.getFullYear()}-${String(end.getFullYear()).slice(-2)}`,
      startDate: toInput(start),
      endDate: toInput(end),
      copyFees: true,
    });
    setCreateOpen(true);
  };

  const createSession = async () => {
    try {
      const res = await fetch("/api/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSession.name,
          startDate: newSession.startDate,
          endDate: newSession.endDate,
          copyFeeStructuresFromId: newSession.copyFees ? fromId : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      toast.success(`Session ${d.data.name} created`);
      setCreateOpen(false);
      await refreshSessions();
      setToId(d.data.id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const activateTarget = async () => {
    const to = sessions.find((s) => s.id === toId);
    if (!to) return;
    if (
      remaining > 0 &&
      !window.confirm(`${remaining} students haven't been processed yet and will stay in ${fromSession?.name}. Continue?`)
    )
      return;
    const res = await fetch("/api/academic-years", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: to.id, isCurrent: true }),
    });
    if (res.ok) {
      toast.success(`${to.name} is now the active session`);
      await refreshSessions();
      selectSession(null);
      router.push("/sessions");
    } else {
      toast.error((await res.json()).error || "Failed to activate session");
    }
  };

  if (!can(Permission.PROMOTE_STUDENT)) {
    return (
      <MainLayout>
        <Alert severity="error">You don&apos;t have permission to promote students.</Alert>
      </MainLayout>
    );
  }

  const toSession = sessions.find((s) => s.id === toId);

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => router.push("/sessions")} sx={{ mb: 2 }}>
          Back to sessions
        </Button>
        <Typography variant="h4" fontWeight="bold" color="primary.main">
          Promote students to the next session
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Go class by class. Unpaid fees stay with each student and carry over to the new session.
        </Typography>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>From session</InputLabel>
              <Select value={fromId} label="From session" onChange={(e) => { setFromId(e.target.value); setSelectedClassId(""); }}>
                {sessions.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} {s.isCurrent ? "(active)" : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ArrowIcon color="action" />
            <FormControl size="small" sx={{ minWidth: 180 }} disabled={targetOptions.length === 0}>
              <InputLabel>To session</InputLabel>
              <Select value={toId} label="To session" onChange={(e) => setToId(e.target.value)}>
                {targetOptions.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {can(Permission.MANAGE_ACADEMIC_YEAR) && (
              <Button variant="outlined" size="small" onClick={openCreate}>
                Create next session
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Chip label={`${remaining} remaining`} color={remaining ? "warning" : "success"} />
            {processedTotal > 0 && (
              <Chip
                variant="outlined"
                label={`Done: ${processed.PROMOTED ?? 0} promoted, ${processed.RETAINED ?? 0} retained, ${
                  processed.GRADUATED ?? 0
                } graduated, ${processed.LEFT ?? 0} left`}
              />
            )}
          </Box>
          {targetOptions.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Create the next session first, then promote students into it.
            </Alert>
          )}
        </Paper>

        {toSession && !toSession.isCurrent && can(Permission.MANAGE_ACADEMIC_YEAR) && (remaining === 0 || processedTotal > 0) && (
          <Alert
            severity={remaining === 0 ? "success" : "info"}
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" startIcon={<ActivateIcon />} onClick={activateTarget}>
                Make {toSession.name} active
              </Button>
            }
          >
            {remaining === 0
              ? `All students are processed. Make ${toSession.name} the active session to start it.`
              : `When you're done with every class, make ${toSession.name} the active session.`}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper>
                <List disablePadding>
                  {groups.map((c) => (
                    <ListItemButton
                      key={c.id}
                      selected={c.id === selectedClassId}
                      onClick={() => openClass(c)}
                      disabled={c.students.length === 0 || !toId}
                      divider
                    >
                      <ListItemText primary={c.name} />
                      {c.students.length === 0 ? (
                        <DoneIcon color="success" fontSize="small" />
                      ) : (
                        <Chip size="small" label={c.students.length} />
                      )}
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 9 }}>
              {!selectedClass ? (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    {remaining === 0 ? "Every student in this session has been processed." : "Pick a class on the left to start."}
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
                    <Typography variant="h6">{selectedClass.name}</Typography>
                    {selectedClass.id !== NO_CLASS && (
                      <>
                        <ArrowIcon color="action" />
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <InputLabel>Promote into</InputLabel>
                          <Select value={targetClassId} label="Promote into" onChange={(e) => changeTarget(e.target.value)}>
                            <MenuItem value="">None (last class)</MenuItem>
                            {classes
                              .filter((c) => c.id !== selectedClass.id)
                              .map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                  {c.name}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      </>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="body2" color="text.secondary">Set all:</Typography>
                    {(Object.keys(ACTION_LABELS) as Action[])
                      .filter((a) => a !== "PROMOTE" || !!targetClassId)
                      .map((a) => (
                        <Button key={a} size="small" onClick={() => setAll(a)}>
                          {ACTION_LABELS[a].split(" ")[0]}
                        </Button>
                      ))}
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Student</TableCell>
                          <TableCell>Section</TableCell>
                          <TableCell>Action</TableCell>
                          <TableCell>New section</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedClass.students.map((st) => {
                          const c = choices[st.id];
                          if (!c) return null;
                          const sectionOptions =
                            c.action === "PROMOTE" ? targetClass?.sections ?? [] : c.action === "RETAIN" ? selectedClass.sections : [];
                          return (
                            <TableRow key={st.id}>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Avatar src={st.photo || undefined} sx={{ width: 32, height: 32 }}>
                                    {st.firstName[0]}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                      {st.firstName} {st.lastName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {st.registrationNo}
                                      {st.rollNo ? ` · Roll ${st.rollNo}` : ""}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>{st.section?.name ?? "-"}</TableCell>
                              <TableCell>
                                <Select
                                  size="small"
                                  value={c.action}
                                  onChange={(e) => setRow(st.id, { action: e.target.value as Action })}
                                  sx={{ minWidth: 170 }}
                                >
                                  {(Object.keys(ACTION_LABELS) as Action[])
                                    .filter((a) => a !== "PROMOTE" || !!targetClassId)
                                    .map((a) => (
                                      <MenuItem key={a} value={a}>
                                        {ACTION_LABELS[a]}
                                      </MenuItem>
                                    ))}
                                </Select>
                              </TableCell>
                              <TableCell>
                                {sectionOptions.length > 0 ? (
                                  <Select
                                    size="small"
                                    value={c.toSectionId}
                                    onChange={(e) => setRow(st.id, { toSectionId: e.target.value })}
                                    sx={{ minWidth: 120 }}
                                  >
                                    {sectionOptions.map((s) => (
                                      <MenuItem key={s.id} value={s.id}>
                                        {s.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={submitClass}
                      disabled={submitting || !toId}
                      startIcon={submitting ? <CircularProgress size={18} /> : <DoneIcon />}
                    >
                      Save {selectedClass.students.length} students to {toSession?.name}
                    </Button>
                  </Box>
                </Paper>
              )}
            </Grid>
          </Grid>
        )}
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create next session</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Name" value={newSession.name} onChange={(e) => setNewSession({ ...newSession, name: e.target.value })} />
            <TextField
              label="Start date"
              type="date"
              value={newSession.startDate}
              onChange={(e) => setNewSession({ ...newSession, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End date"
              type="date"
              value={newSession.endDate}
              onChange={(e) => setNewSession({ ...newSession, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newSession.copyFees}
                  onChange={(e) => setNewSession({ ...newSession, copyFees: e.target.checked })}
                />
              }
              label={`Copy fee structures from ${fromSession?.name ?? "current session"}`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createSession} disabled={!newSession.name.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
