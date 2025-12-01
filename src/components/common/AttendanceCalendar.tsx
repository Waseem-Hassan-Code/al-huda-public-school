"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Tooltip,
  Grid,
} from "@mui/material";
import { ChevronLeft, ChevronRight, Circle } from "@mui/icons-material";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  remarks?: string;
}

interface AttendanceCalendarProps {
  attendance: AttendanceRecord[];
  year?: number;
  month?: number;
}

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  PRESENT: { bg: "#4caf50", text: "#fff", label: "Present" },
  ABSENT: { bg: "#f44336", text: "#fff", label: "Absent" },
  LATE: { bg: "#ff9800", text: "#fff", label: "Late" },
  LEAVE: { bg: "#2196f3", text: "#fff", label: "Leave" },
  HALF_DAY: { bg: "#9c27b0", text: "#fff", label: "Half Day" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function AttendanceCalendar({
  attendance,
  year: initialYear,
  month: initialMonth,
}: AttendanceCalendarProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(
    initialYear || today.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    initialMonth !== undefined ? initialMonth : today.getMonth()
  );

  // Create a map of date -> attendance record
  const attendanceMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    attendance.forEach((record) => {
      const dateKey = new Date(record.date).toISOString().split("T")[0];
      map[dateKey] = record;
    });
    return map;
  }, [attendance]);

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Navigate months
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: Array<{
      date: number | null;
      dateString: string | null;
      record: AttendanceRecord | null;
    }> = [];

    // Add empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, dateString: null, record: null });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const record = attendanceMap[dateString] || null;
      days.push({ date: day, dateString, record });
    }

    return days;
  }, [currentYear, currentMonth, attendanceMap]);

  // Calculate summary for current month
  const summary = useMemo(() => {
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-31`;

    const monthAttendance = attendance.filter((record) => {
      const dateStr = new Date(record.date).toISOString().split("T")[0];
      return dateStr >= monthStart && dateStr <= monthEnd;
    });

    return {
      total: monthAttendance.length,
      present: monthAttendance.filter((a) => a.status === "PRESENT").length,
      absent: monthAttendance.filter((a) => a.status === "ABSENT").length,
      late: monthAttendance.filter((a) => a.status === "LATE").length,
      leave: monthAttendance.filter((a) => a.status === "LEAVE").length,
      halfDay: monthAttendance.filter((a) => a.status === "HALF_DAY").length,
    };
  }, [attendance, currentYear, currentMonth]);

  const isToday = (dateString: string | null) => {
    if (!dateString) return false;
    return dateString === today.toISOString().split("T")[0];
  };

  const isFuture = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) > today;
  };

  return (
    <Box>
      {/* Calendar Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <IconButton onClick={goToPreviousMonth} size="small">
          <ChevronLeft />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">
          {MONTHS[currentMonth]} {currentYear}
        </Typography>
        <IconButton onClick={goToNextMonth} size="small">
          <ChevronRight />
        </IconButton>
      </Box>

      {/* Legend */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {Object.entries(STATUS_COLORS).map(([status, { bg, label }]) => (
          <Box
            key={status}
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <Circle sx={{ fontSize: 12, color: bg }} />
            <Typography variant="caption">{label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Weekday Headers */}
      <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
        {WEEKDAYS.map((day) => (
          <Grid key={day} size={{ xs: 12 / 7 }}>
            <Box
              sx={{
                textAlign: "center",
                py: 0.5,
                fontWeight: "bold",
                color: day === "Sun" ? "error.main" : "text.secondary",
                fontSize: "0.8rem",
              }}
            >
              {day}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Calendar Grid */}
      <Grid container spacing={0.5} rowSpacing={0.75}>
        {calendarDays.map((day, index) => (
          <Grid key={index} size={{ xs: 12 / 7 }}>
            {day.date ? (
              <Tooltip
                title={
                  day.record
                    ? `${
                        STATUS_COLORS[day.record.status]?.label ||
                        day.record.status
                      }${day.record.remarks ? `: ${day.record.remarks}` : ""}`
                    : isFuture(day.dateString)
                    ? "Future date"
                    : "No record"
                }
                arrow
              >
                <Paper
                  elevation={isToday(day.dateString) ? 3 : 0}
                  sx={{
                    aspectRatio: "1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 1.5,
                    cursor: "pointer",
                    position: "relative",
                    bgcolor: day.record
                      ? STATUS_COLORS[day.record.status]?.bg || "grey.300"
                      : isFuture(day.dateString)
                      ? "grey.100"
                      : "grey.200",
                    color: day.record
                      ? STATUS_COLORS[day.record.status]?.text || "text.primary"
                      : "text.secondary",
                    border: isToday(day.dateString) ? "2px solid" : "none",
                    borderColor: "primary.main",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "scale(1.05)",
                      boxShadow: 3,
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={isToday(day.dateString) ? "bold" : "medium"}
                    sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                  >
                    {day.date}
                  </Typography>
                </Paper>
              </Tooltip>
            ) : (
              <Box sx={{ aspectRatio: "1" }} />
            )}
          </Grid>
        ))}
      </Grid>

      {/* Monthly Summary */}
      <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          Monthly Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 4, sm: 2 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {summary.present}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Present
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold" color="error.main">
                {summary.absent}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Absent
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold" color="warning.main">
                {summary.late}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Late
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold" color="info.main">
                {summary.leave}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Leave
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold" color="secondary.main">
                {summary.halfDay}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Half Day
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold">
                {summary.total > 0
                  ? Math.round((summary.present / summary.total) * 100)
                  : 0}
                %
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Attendance
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
