"use client";

import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { TrendingUp, TrendingDown } from "@mui/icons-material";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color,
  trend,
  subtitle,
}: StatCardProps) {
  return (
    <Paper
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
        },
      }}
    >
      {/* Background Icon */}
      <Box
        sx={{
          position: "absolute",
          right: -10,
          top: -10,
          opacity: 0.1,
          transform: "scale(3)",
          color: color,
        }}
      >
        {icon}
      </Box>

      {/* Icon */}
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${color}15`,
          color: color,
          mb: 2,
        }}
      >
        {icon}
      </Box>

      {/* Title */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 0.5, fontWeight: 500 }}
      >
        {title}
      </Typography>

      {/* Value */}
      <Typography variant="h4" fontWeight={700} sx={{ color: color, mb: 1 }}>
        {value}
      </Typography>

      {/* Trend or Subtitle */}
      {trend && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {trend.isPositive ? (
            <TrendingUp sx={{ color: "success.main", fontSize: 18 }} />
          ) : (
            <TrendingDown sx={{ color: "error.main", fontSize: 18 }} />
          )}
          <Typography
            variant="caption"
            sx={{
              color: trend.isPositive ? "success.main" : "error.main",
              fontWeight: 500,
            }}
          >
            {trend.isPositive ? "+" : "-"}
            {trend.value}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            from last month
          </Typography>
        </Box>
      )}

      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}
