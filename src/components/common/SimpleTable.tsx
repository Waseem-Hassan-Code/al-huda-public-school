"use client";

import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Typography,
} from "@mui/material";
import React from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SimpleColumn<T = any> {
  id: string;
  label: string;
  minWidth?: number;
  align?: "left" | "right" | "center";
  renderCell?: (row: T) => React.ReactNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SimpleTableProps<T = any> {
  columns: SimpleColumn<T>[];
  rows: T[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  rowKey?: keyof T;
  onRowClick?: (row: T) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SimpleTable<T = any>({
  columns,
  rows,
  loading = false,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  rowKey = "id" as keyof T,
  onRowClick,
}: SimpleTableProps<T>) {
  const handlePageChange = (event: unknown, newPage: number) => {
    onPageChange(newPage + 1);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onPageSizeChange(parseInt(event.target.value, 10));
  };

  const getNestedValue = (obj: T, path: string): unknown => {
    return path.split(".").reduce((acc: unknown, part: string) => {
      if (acc && typeof acc === "object" && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  };

  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || "left"}
                  style={{ minWidth: column.minWidth }}
                  sx={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography color="text.secondary">No data found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  hover
                  key={String(row[rowKey])}
                  onClick={() => onRowClick?.(row)}
                  sx={{ cursor: onRowClick ? "pointer" : "default" }}
                >
                  {columns.map((column) => {
                    const value = getNestedValue(row, column.id);
                    return (
                      <TableCell key={column.id} align={column.align || "left"}>
                        {column.renderCell
                          ? column.renderCell(row)
                          : String(value ?? "")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        component="div"
        count={total}
        rowsPerPage={pageSize}
        page={page - 1}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
    </Paper>
  );
}
