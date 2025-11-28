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
  TableSortLabel,
  Paper,
  TextField,
  InputAdornment,
  CircularProgress,
  Typography,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useState, useEffect, useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  id: keyof T | string;
  label: string;
  minWidth?: number;
  align?: "left" | "right" | "center";
  format?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataGridProps<T = any> {
  columns: Column<T>[];
  fetchData: (params: {
    page: number;
    pageSize: number;
    search: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }) => Promise<{
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  rowKey?: keyof T;
  initialSortBy?: string;
  initialSortOrder?: "asc" | "desc";
  actions?: React.ReactNode;
  refreshTrigger?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DataGrid<T = any>({
  columns,
  fetchData,
  onRowClick,
  searchPlaceholder = "Search...",
  rowKey = "id" as keyof T,
  initialSortBy = "createdAt",
  initialSortOrder = "desc",
  actions,
  refreshTrigger,
}: DataGridProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchData({
        page: page + 1,
        pageSize,
        search,
        sortBy,
        sortOrder,
      });
      setData(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, pageSize, search, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    setSearchTimeout(
      setTimeout(() => {
        setSearch(value);
        setPage(0);
      }, 500)
    );
  };

  const handleSort = (column: string) => {
    const isAsc = sortBy === column && sortOrder === "asc";
    setSortOrder(isAsc ? "desc" : "asc");
    setSortBy(column);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
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
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            placeholder={searchPlaceholder}
            size="small"
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={loadData} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        {actions && <Box sx={{ display: "flex", gap: 1 }}>{actions}</Box>}
      </Box>

      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align || "left"}
                  style={{ minWidth: column.minWidth }}
                  sx={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortOrder : "asc"}
                      onClick={() => handleSort(String(column.id))}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
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
            ) : data.length === 0 ? (
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
              data.map((row) => (
                <TableRow
                  hover
                  key={String(row[rowKey])}
                  onClick={() => onRowClick?.(row)}
                  sx={{ cursor: onRowClick ? "pointer" : "default" }}
                >
                  {columns.map((column) => {
                    const value = getNestedValue(row, String(column.id));
                    return (
                      <TableCell
                        key={String(column.id)}
                        align={column.align || "left"}
                      >
                        {column.format
                          ? column.format(value, row)
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
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
    </Paper>
  );
}
