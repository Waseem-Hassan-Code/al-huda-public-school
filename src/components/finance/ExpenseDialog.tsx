"use client";

// Add / edit one school expense.

import { useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
} from "@mui/material";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/finance-shared";

export interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  paidTo?: string | null;
  reference?: string | null;
  notes?: string | null;
  createdBy?: { name: string } | null;
}

const today = () => new Date().toISOString().split("T")[0];

export default function ExpenseDialog({
  open,
  expense,
  onClose,
  onSaved,
}: {
  open: boolean;
  expense: ExpenseRecord | null; // null = new
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    date: today(),
    category: EXPENSE_CATEGORIES[0] as string,
    description: "",
    amount: "",
    paymentMethod: "CASH",
    paidTo: "",
    reference: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      expense
        ? {
            date: expense.date.split("T")[0],
            category: expense.category,
            description: expense.description,
            amount: String(expense.amount),
            paymentMethod: expense.paymentMethod,
            paidTo: expense.paidTo ?? "",
            reference: expense.reference ?? "",
            notes: expense.notes ?? "",
          }
        : {
            date: today(),
            category: EXPENSE_CATEGORIES[0],
            description: "",
            amount: "",
            paymentMethod: "CASH",
            paidTo: "",
            reference: "",
            notes: "",
          }
    );
  }, [open, expense]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.date && form.category && form.description.trim() && parseFloat(form.amount) > 0;

  // Keep an old/custom category selectable when editing
  const categories = EXPENSE_CATEGORIES.includes(form.category as (typeof EXPENSE_CATEGORIES)[number])
    ? [...EXPENSE_CATEGORIES]
    : [...EXPENSE_CATEGORIES, form.category];

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(expense ? `/api/expenses/${expense.id}` : "/api/expenses", {
        method: expense ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save expense");
      toast.success(expense ? "Expense updated" : "Expense recorded");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>{expense ? "Edit expense" : "Record expense"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField label="Date" type="date" value={form.date} onChange={set("date")} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField
              label="Amount"
              type="number"
              value={form.amount}
              onChange={set("amount")}
              fullWidth
              size="small"
              autoFocus={!expense}
              inputProps={{ min: 0, step: "any" }}
              InputProps={{ startAdornment: <InputAdornment position="start">Rs.</InputAdornment> }}
            />
          </Grid>
          <Grid size={12}>
            <TextField select label="Category" value={form.category} onChange={set("category")} fullWidth size="small">
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField
              label="Description"
              placeholder="e.g. Electricity bill for October"
              value={form.description}
              onChange={set("description")}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Paid to (optional)" value={form.paidTo} onChange={set("paidTo")} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select label="Payment method" value={form.paymentMethod} onChange={set("paymentMethod")} fullWidth size="small">
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField
              label="Bill / cheque / transaction no. (optional)"
              value={form.reference}
              onChange={set("reference")}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid size={12}>
            <TextField label="Notes (optional)" value={form.notes} onChange={set("notes")} fullWidth size="small" multiline minRows={2} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={!valid || saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {expense ? "Save changes" : "Record expense"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
