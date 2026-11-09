"use client";

// "Receive Payment" from anywhere: search a student by name, registration no.,
// roll no. or guardian phone, see what they owe, then open the payment dialog.

import { useEffect, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  ButtonProps,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { Payment as PaymentIcon } from "@mui/icons-material";
import ReceivePaymentDialog, { PaymentResult } from "@/components/dialogs/ReceivePaymentDialog";
import { rs, round2 } from "@/lib/fee-utils";

interface StudentOption {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  photo?: string | null;
  guardianName?: string;
  guardianPhone?: string;
  class?: { name: string } | null;
  section?: { name: string } | null;
  feeVouchers?: { balanceDue: number }[];
}

const owed = (s: StudentOption) => round2((s.feeVouchers ?? []).reduce((sum, v) => sum + (v.balanceDue || 0), 0));

export default function QuickReceiveButton({
  onSuccess,
  label = "Receive Payment",
  ...buttonProps
}: { onSuccess?: (result: PaymentResult) => void; label?: string } & Omit<ButtonProps, "onClick">) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) {
      setOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ search: query.trim(), limit: "15", status: "ACTIVE" });
        const res = await fetch(`/api/students?${params}`);
        const d = await res.json();
        setOptions(res.ok ? d.data || [] : []);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchOpen]);

  return (
    <>
      <Button
        variant="contained"
        color="success"
        startIcon={<PaymentIcon />}
        onClick={() => {
          setQuery("");
          setSearchOpen(true);
        }}
        {...buttonProps}
      >
        {label}
      </Button>

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Receive payment from</DialogTitle>
        <DialogContent>
          <Autocomplete
            open={query.trim().length >= 2}
            options={options}
            loading={loading}
            filterOptions={(x) => x}
            getOptionLabel={(o) => `${o.firstName} ${o.lastName} (${o.registrationNo})`}
            onInputChange={(_, v) => setQuery(v)}
            onChange={(_, v) => {
              if (v) {
                setSearchOpen(false);
                setStudentId(v.id);
              }
            }}
            noOptionsText={query.trim().length < 2 ? "Type at least 2 letters" : "No active students found"}
            renderOption={(props, o) => {
              const due = owed(o);
              return (
                <Box component="li" {...props} key={o.id} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  <Avatar src={o.photo || undefined} sx={{ width: 32, height: 32 }}>
                    {o.firstName?.[0]}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {o.firstName} {o.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {o.registrationNo} · {o.class?.name ?? "No class"}
                      {o.section ? ` - ${o.section.name}` : ""}
                      {o.guardianName ? ` · ${o.guardianName}` : ""}
                    </Typography>
                  </Box>
                  <Chip size="small" color={due > 0 ? "error" : "success"} variant="outlined" label={due > 0 ? rs(due) : "No dues"} />
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                placeholder="Name, registration no., roll no. or guardian phone"
                sx={{ mt: 1 }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading && <CircularProgress size={18} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </DialogContent>
      </Dialog>

      <ReceivePaymentDialog
        open={!!studentId}
        studentId={studentId}
        onClose={() => setStudentId(null)}
        onSuccess={onSuccess}
      />
    </>
  );
}
