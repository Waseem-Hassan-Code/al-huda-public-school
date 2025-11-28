"use client";

import React from "react";
import { Paper, Typography, Box } from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  month: string;
  revenue: number;
}

interface PaymentChartProps {
  data: ChartData[];
  title?: string;
  color?: string;
}

export default function PaymentChart({
  data,
  title = "Revenue Overview",
  color = "#1565c0",
}: PaymentChartProps) {
  const formatMonth = (monthStr: string) => {
    return monthStr;
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

  return (
    <Paper sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
        {title}
      </Typography>
      <Box sx={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id={`gradient-${color}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <YAxis
              tickFormatter={formatAmount}
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
              width={50}
            />
            <Tooltip
              formatter={(value: number) => [
                `Rs. ${value.toLocaleString()}`,
                "Revenue",
              ]}
              labelFormatter={(label) => formatMonth(String(label))}
              contentStyle={{
                backgroundColor: "#fff",
                border: "none",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${color})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
