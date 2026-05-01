"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Check, Close, Refresh, Visibility } from "@mui/icons-material";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PendingStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  createdAt: string;
  status: string;
}

export default function ApprovalsPage() {
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students/pending");
      if (!res.ok) throw new Error("Failed to fetch pending students");
      const { data } = await res.json();
      setPendingStudents(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/students/pending/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to process request");
      toast.success(`Student ${action === "APPROVE" ? "approved" : "rejected"} successfully!`);
      fetchPending();
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <MainLayout>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" fontWeight="bold">
          Mobile App Registrations
        </Typography>
        <Button startIcon={<Refresh />} onClick={fetchPending} variant="outlined">
          Refresh
        </Button>
      </Box>

      <Paper sx={{ p: 0, overflow: "hidden", borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Student Name</TableCell>
                <TableCell>Generated Email</TableCell>
                <TableCell>Guardian Info</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : pendingStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">No pending registrations.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pendingStudents.map((student) => (
                  <TableRow key={student.id} hover>
                    <TableCell>
                      {new Date(student.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">
                        {student.firstName} {student.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      {student.guardianName} <br />
                      <Typography variant="caption" color="text.secondary">
                        {student.guardianPhone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label="Pending" color="warning" size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            color="info"
                            size="small"
                            onClick={() => router.push(`/students/${student.id}`)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Approve">
                          <IconButton
                            color="success"
                            size="small"
                            onClick={() => handleAction(student.id, "APPROVE")}
                            disabled={actionLoading === student.id}
                          >
                            {actionLoading === student.id ? <CircularProgress size={16} /> : <Check fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleAction(student.id, "REJECT")}
                            disabled={actionLoading === student.id}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </MainLayout>
  );
}
