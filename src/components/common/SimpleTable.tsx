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
  width?: number;
  align?: "left" | "right" | "center";
  renderCell?: (row: T) => React.ReactNode;
  render?: (row: T) => React.ReactNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SimpleTableProps<T = any> {
  columns: SimpleColumn<T>[];
  rows: T[];
  loading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  rowKey?: keyof T;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  showPagination?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SimpleTable<T = any>({
  columns,
  rows,
  loading = false,
  page = 1,
  pageSize = 10,
  total,
  onPageChange,
  onPageSizeChange,
  rowKey = "id" as keyof T,
  onRowClick,
  emptyMessage = "No data found",
  showPagination = true,
}: SimpleTableProps<T>) {
  const actualTotal = total ?? rows.length;
  const hasPagination = showPagination && onPageChange && onPageSizeChange;
  const handlePageChange = (event: unknown, newPage: number) => {
    onPageChange?.(newPage + 1);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onPageSizeChange?.(parseInt(event.target.value, 10));
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
                  style={{ minWidth: column.minWidth, width: column.width }}
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
                  <Typography color="text.secondary">{emptyMessage}</Typography>
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
                    const renderer = column.render || column.renderCell;
                    return (
                      <TableCell key={column.id} align={column.align || "left"}>
                        {renderer ? renderer(row) : String(value ?? "")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {hasPagination && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          component="div"
          count={actualTotal}
          rowsPerPage={pageSize}
          page={page - 1}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      )}
    </Paper>
  );
}
