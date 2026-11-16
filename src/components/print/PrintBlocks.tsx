"use client";

// Building blocks for 80 mm thermal printouts (receipts, balance statements,
// vouchers): school header and bordered, bold tables that stay readable on paper.

import { Box } from "@mui/material";
import type { ReactNode } from "react";

export const SCHOOL_NAME = "Al-Huda Public School and College Meithakheil";

export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ textAlign: "center", mb: 1 }}>
      <Box sx={{ fontWeight: 900, fontSize: "15px", textTransform: "uppercase", lineHeight: 1.25 }}>{SCHOOL_NAME}</Box>
      <Box
        sx={{
          display: "inline-block",
          mt: 0.75,
          px: 1.5,
          py: 0.25,
          border: "2px solid #000",
          fontWeight: 900,
          fontSize: "14px",
          letterSpacing: 1,
        }}
      >
        {title}
      </Box>
      {subtitle && <Box sx={{ mt: 0.5, fontSize: "12px", fontWeight: 700 }}>{subtitle}</Box>}
    </Box>
  );
}

export interface PrintRow {
  label: ReactNode;
  value?: ReactNode;
  /** Highlighted total row */
  total?: boolean;
  /** Smaller detail row */
  muted?: boolean;
}

const cell = {
  border: "1px solid #000",
  padding: "3px 5px",
  verticalAlign: "top",
} as const;

/** Two-column bordered table. With `header`, the first row is a column heading. */
export function PrintTable({ rows, header }: { rows: PrintRow[]; header?: [string, string] }) {
  return (
    <Box
      component="table"
      sx={{
        width: "100%",
        borderCollapse: "collapse",
        mb: 1,
        fontSize: "13px",
        fontWeight: 700,
        "@media print": { fontSize: "14px" },
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {header && (
        <thead>
          <tr>
            <Box component="th" sx={{ ...cell, textAlign: "left", bgcolor: "#e0e0e0", fontWeight: 900 }}>
              {header[0]}
            </Box>
            <Box component="th" sx={{ ...cell, textAlign: "right", bgcolor: "#e0e0e0", fontWeight: 900, whiteSpace: "nowrap" }}>
              {header[1]}
            </Box>
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <Box
              component="td"
              colSpan={r.value === undefined ? 2 : 1}
              sx={{
                ...cell,
                fontWeight: r.total ? 900 : 700,
                fontSize: r.muted ? "11px" : r.total ? "15px" : undefined,
                bgcolor: r.total ? "#e0e0e0" : undefined,
              }}
            >
              {r.label}
            </Box>
            {r.value !== undefined && (
              <Box
                component="td"
                sx={{
                  ...cell,
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  fontWeight: r.total ? 900 : 700,
                  fontSize: r.muted ? "11px" : r.total ? "15px" : undefined,
                  bgcolor: r.total ? "#e0e0e0" : undefined,
                }}
              >
                {r.value}
              </Box>
            )}
          </tr>
        ))}
      </tbody>
    </Box>
  );
}

/** Outer 80 mm box. `id` hooks into the print CSS (e.g. payment-receipt-print). */
export function PrintSheet({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <Box
      id={id}
      sx={{
        width: "80mm",
        p: "8px",
        bgcolor: "#fff",
        color: "#000",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontWeight: 700,
        lineHeight: 1.35,
      }}
    >
      {children}
    </Box>
  );
}
