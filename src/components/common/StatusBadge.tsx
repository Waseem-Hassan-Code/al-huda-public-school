"use client";

import { Chip } from "@mui/material";

type StatusType =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "WAIVED"
  | "CANCELLED"
  | "ACTIVE"
  | "INACTIVE"
  | "GRADUATED"
  | "TRANSFERRED"
  | "EXPELLED"
  | "DROPPED_OUT"
  | "ON_LEAVE"
  | "RESIGNED"
  | "TERMINATED"
  | "PENDING"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "DISMISSED"
  | "PROCESSING"
  | "COMPLETED"
  | "PUBLISHED"
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "LEAVE"
  | "HALF_DAY"
  | "SICK_LEAVE"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

const statusColors: Record<
  StatusType,
  "error" | "warning" | "success" | "default" | "info" | "primary" | "secondary"
> = {
  // Fee status
  UNPAID: "error",
  PARTIAL: "warning",
  PAID: "success",
  OVERDUE: "error",
  WAIVED: "default",
  CANCELLED: "default",

  // Student status
  ACTIVE: "success",
  INACTIVE: "default",
  GRADUATED: "info",
  TRANSFERRED: "info",
  EXPELLED: "error",
  DROPPED_OUT: "warning",

  // Teacher status
  ON_LEAVE: "warning",
  RESIGNED: "default",
  TERMINATED: "error",

  // Complaint status
  PENDING: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  DISMISSED: "default",

  // Result status
  PROCESSING: "info",
  COMPLETED: "success",
  PUBLISHED: "primary",

  // Attendance status
  PRESENT: "success",
  ABSENT: "error",
  LATE: "warning",
  LEAVE: "info",
  HALF_DAY: "warning",
  SICK_LEAVE: "info",

  // Severity
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "error",
  CRITICAL: "error",
};

const statusLabels: Partial<Record<StatusType, string>> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  WAIVED: "Waived",
  CANCELLED: "Cancelled",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  GRADUATED: "Graduated",
  TRANSFERRED: "Transferred",
  EXPELLED: "Expelled",
  DROPPED_OUT: "Dropped Out",
  ON_LEAVE: "On Leave",
  RESIGNED: "Resigned",
  TERMINATED: "Terminated",
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  PUBLISHED: "Published",
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  LEAVE: "Leave",
  HALF_DAY: "Half Day",
  SICK_LEAVE: "Sick Leave",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

interface StatusBadgeProps {
  status: string;
  size?: "small" | "medium";
}

export default function StatusBadge({
  status,
  size = "small",
}: StatusBadgeProps) {
  const color = statusColors[status as StatusType] || "default";
  const label = statusLabels[status as StatusType] || status;

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      sx={{
        fontWeight: 500,
      }}
    />
  );
}
