"use client";

// Finance: school expenses and income (fees collected) vs spending.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  TrendingUp as IncomeIcon,
  ShoppingCart as ExpenseIcon,
  Groups as SalaryIcon,
  Savings as NetIcon,
} from "@mui/icons-material";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import MainLayout from "@/components/layout/MainLayout";
import ExpenseDialog, { ExpenseRecord } from "@/components/finance/ExpenseDialog";
import { useAcademicSession } from "@/components/providers/AcademicSessionProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/lib/permissions";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, PeriodKey, periodRange, SALARIES_CATEGORY } from "@/lib/finance-shared";
import { rs } from "@/lib/fee-utils";

interface Summary {
  income: number;
  expenses: number;
  salaries: number;
  totalSpending: number;
  net: number;
  byCategory: { category: string; amount: number; count: number }[];
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "session", label: "This session" },
  { key: "this_year", label: "This year" },
  { key: "custom", label: "Custom" },
];

const methodLabel = (v: string) => PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });

function SummaryCard({
  title,
  value,
  note,
  color,
  icon,
}: {
  title: string;
  value: string;
  note?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Card sx={{ height: "100%", borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {title}
          </Typography>
          <Box sx={{ color }}>{icon}</Box>
        </Box>
        <Typography variant="h5" fontWeight={800} sx={{ color }}>
          {value}
        </Typography>
        {note && (
          <Typography variant="caption" color="text.secondary">
            {note}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function FinancePage() {
  const { can } = usePermissions();
  const canManage = can(Permission.MANAGE_FINANCE);
  const { currentSession } = useAcademicSession();

  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<{ month: string; income: number; expenses: number; net: number }[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; expense: ExpenseRecord | null }>({ open: false, expense: null });

  const range = useMemo(
    () =>
      periodRange(period, {
        session: currentSession ? { startDate: currentSession.startDate, endDate: currentSession.endDate } : null,
        from: customFrom,
        to: customTo,
      }),
    [period, currentSession, customFrom, customTo]
  );
  const rangeText = `${fmtDate(range.from.toISOString())} to ${fmtDate(new Date(range.to.getTime() - 86400000).toISOString())}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
      const eq = new URLSearchParams(q);
      if (category) eq.set("category", category);
      if (search.trim()) eq.set("search", search.trim());
      eq.set("limit", "500");
      const [sRes, eRes] = await Promise.all([fetch(`/api/finance/summary?${q}`), fetch(`/api/expenses?${eq}`)]);
      const s = await sRes.json();
      const e = await eRes.json();
      if (!sRes.ok) throw new Error(s.error || "Failed to load summary");
      if (!eRes.ok) throw new Error(e.error || "Failed to load expenses");
      setSummary(s.summary);
      setTrend(s.trend);
      setExpenses(e.data);
      setExpensesTotal(e.totalAmount);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [range, category, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const remove = async (e: ExpenseRecord) => {
    if (!window.confirm(`Delete "${e.description}" (${rs(e.amount)})?`)) return;
    const res = await fetch(`/api/expenses/${e.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Expense deleted");
      load();
    } else {
      toast.error((await res.json()).error || "Failed to delete");
    }
  };

  const exportCsv = () => {
    const header = ["Date", "Category", "Description", "Paid to", "Method", "Reference", "Amount", "Notes", "Recorded by"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = expenses.map((e) =>
      [e.date.split("T")[0], e.category, e.description, e.paidTo, methodLabel(e.paymentMethod), e.reference, e.amount, e.notes, e.createdBy?.name]
        .map(esc)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `expenses_${range.from.toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const maxCategory = Math.max(1, ...(summary?.byCategory.map((c) => c.amount) ?? [1]));

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              Finance
            </Typography>
            <Typography variant="body2" color="text.secondary">
              School expenses and income (fees collected) for {rangeText}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} disabled={expenses.length === 0}>
              Export CSV
            </Button>
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, expense: null })}>
                Record expense
              </Button>
            )}
          </Box>
        </Box>

        {/* Period */}
        <Paper sx={{ p: 1.5, mb: 3, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <ToggleButtonGroup exclusive size="small" color="primary" value={period} onChange={(_, v) => v && setPeriod(v)}>
            {PERIODS.map((p) => (
              <ToggleButton key={p.key} value={p.key} sx={{ px: 2 }}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {period === "custom" && (
            <>
              <TextField label="From" type="date" size="small" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="To" type="date" size="small" value={customTo} onChange={(e) => setCustomTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            </>
          )}
          {period === "session" && !currentSession && (
            <Typography variant="caption" color="text.secondary">
              No active session: showing this month.
            </Typography>
          )}
          {loading && <CircularProgress size={18} sx={{ ml: "auto" }} />}
        </Paper>

        {/* Summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <SummaryCard title="Fees collected" value={rs(summary?.income ?? 0)} note="Income from fee payments" color="#2e7d32" icon={<IncomeIcon />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <SummaryCard title="Expenses" value={rs(summary?.expenses ?? 0)} note="Recorded below" color="#d32f2f" icon={<ExpenseIcon />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <SummaryCard title="Teacher salaries paid" value={rs(summary?.salaries ?? 0)} note="From the Salary module" color="#ef6c00" icon={<SalaryIcon />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <SummaryCard
              title={(summary?.net ?? 0) >= 0 ? "Net balance (surplus)" : "Net balance (deficit)"}
              value={rs(summary?.net ?? 0)}
              note="Fees collected minus expenses and salaries"
              color={(summary?.net ?? 0) >= 0 ? "#1565c0" : "#b71c1c"}
              icon={<NetIcon />}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Trend */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Income vs expenses (last 12 months)
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <ChartTooltip formatter={(v: number) => rs(v)} />
                    <Legend />
                    <Bar dataKey="income" name="Fees collected" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses + salaries" fill="#d32f2f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* By category */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Spending by category
              </Typography>
              {!summary || summary.byCategory.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  No spending in this period.
                </Typography>
              ) : (
                summary.byCategory.map((c) => (
                  <Box key={c.category} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap title={c.category}>
                        {c.category}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: "nowrap" }}>
                        {rs(c.amount)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(c.amount / maxCategory) * 100}
                      color={c.category === SALARIES_CATEGORY ? "warning" : "error"}
                      sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {summary.totalSpending > 0 ? Math.round((c.amount / summary.totalSpending) * 100) : 0}% ·{" "}
                      {c.count} {c.count === 1 ? "entry" : "entries"}
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Expense register */}
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
              Expenses
            </Typography>
            <TextField
              size="small"
              placeholder="Search description, paid to, bill no."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 260 }}
            />
            <TextField select size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">All categories</MenuItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {(summary?.salaries ?? 0) > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Teacher salaries ({rs(summary!.salaries)}) are counted automatically from the Salary module, so don&apos;t record
              them here again.
            </Alert>
          )}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Paid to</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Amount
                  </TableCell>
                  {canManage && <TableCell align="right" />}
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      {loading ? "Loading…" : "No expenses recorded for this period."}
                      {!loading && canManage && (
                        <Box sx={{ mt: 1 }}>
                          <Button size="small" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, expense: null })}>
                            Record the first one
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((e) => (
                    <TableRow key={e.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(e.date)}</TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={e.category} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {e.description}
                        </Typography>
                        {(e.reference || e.notes) && (
                          <Typography variant="caption" color="text.secondary">
                            {[e.reference && `Ref: ${e.reference}`, e.notes].filter(Boolean).join(" · ")}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{e.paidTo || "-"}</TableCell>
                      <TableCell>{methodLabel(e.paymentMethod)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        {rs(e.amount)}
                      </TableCell>
                      {canManage && (
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setDialog({ open: true, expense: e })}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => remove(e)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
              {expenses.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} sx={{ fontWeight: 800, fontSize: 14, color: "text.primary" }}>
                      Total ({expenses.length} {expenses.length === 1 ? "entry" : "entries"})
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: 14, color: "text.primary", whiteSpace: "nowrap" }}>
                      {rs(expensesTotal)}
                    </TableCell>
                    {canManage && <TableCell />}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      <ExpenseDialog
        open={dialog.open}
        expense={dialog.expense}
        onClose={() => setDialog({ open: false, expense: null })}
        onSaved={() => {
          setDialog({ open: false, expense: null });
          load();
        }}
      />
    </MainLayout>
  );
}
