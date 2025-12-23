"use client";

import { Box, Typography, Divider } from "@mui/material";

interface FeeVoucher {
  id: string;
  voucherNo: string;
  month: number;
  year: number;
  subtotal: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  dueDate: string;
  status: string;
  feeItems?: Array<{
    description: string;
    amount: number;
  }>;
}

interface Student {
  registrationNo: string;
  firstName: string;
  lastName: string;
  class?: { name: string };
  section?: { name: string };
}

interface RemainingBalancePrintProps {
  student: Student;
  vouchers: FeeVoucher[];
  totalBalance: number;
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function RemainingBalancePrint({
  student,
  vouchers,
  totalBalance,
}: RemainingBalancePrintProps) {
  // Filter only unpaid and partial vouchers
  const remainingVouchers = vouchers.filter(
    (v) =>
      v.status === "UNPAID" || v.status === "PARTIAL" || v.status === "OVERDUE"
  );

  if (remainingVouchers.length === 0) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Box
      id="remaining-balance-print"
      sx={{
        width: "80mm", // Standard thermal printer width
        maxWidth: "80mm",
        margin: "0 auto",
        padding: "10px",
        fontFamily: "monospace",
        fontSize: "14px",
        lineHeight: "1.5",
        fontWeight: 600,
        "@media print": {
          width: "80mm",
          maxWidth: "80mm",
          margin: 0,
          padding: "2mm",
          fontSize: "16px",
          fontWeight: 700,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 2 }}>
        {/* School Name */}
        <Typography
          sx={{
            fontSize: "16px",
            fontWeight: 800,
            mb: 1,
            textTransform: "uppercase",
            "@media print": {
              fontSize: "18px",
              fontWeight: 800,
            },
          }}
        >
          Al-Huda Public School and College Meithakheil
        </Typography>

        <Typography
          variant="body2"
          sx={{
            fontSize: "11px",
            mb: 1,
            fontWeight: "bold",
            "@media print": {
              fontSize: "10px",
            },
          }}
        >
          Remaining Balance Statement
        </Typography>
        <Divider sx={{ my: 1 }} />
      </Box>

      {/* Student Info */}
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            fontWeight: "bold",
            mb: 1,
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            "@media print": {
              fontSize: "10px",
            },
          }}
        >
          Student Information
        </Typography>
        <Typography
          sx={{
            fontSize: "13px",
            fontWeight: "bold",
            mb: 0.8,
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0.3px",
            "@media print": {
              fontSize: "12px",
              fontFamily: "Arial, sans-serif",
            },
          }}
        >
          {student.firstName} {student.lastName}
          {student.class && (
            <>
              {" "}
              ({student.class.name}
              {student.section && ` - ${student.section.name}`})
            </>
          )}
        </Typography>
        <Typography
          sx={{
            fontSize: "11px",
            fontWeight: 600,
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0.5px",
            color: "#333",
            "@media print": {
              fontSize: "10px",
              color: "#000",
            },
          }}
        >
          Registration No: {student.registrationNo}
        </Typography>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Date */}
      <Box sx={{ mb: 2, textAlign: "center" }}>
        <Typography sx={{ fontSize: "10px" }}>
          {new Date().toLocaleDateString("en-PK", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Typography>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Vouchers List */}
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            fontWeight: "bold",
            mb: 1,
            textAlign: "center",
            textDecoration: "underline",
          }}
        >
          Outstanding Vouchers
        </Typography>

        {remainingVouchers.map((voucher, index) => (
          <Box
            key={voucher.id}
            sx={{
              mb: 1.5,
              pb: 1,
              borderBottom:
                index < remainingVouchers.length - 1
                  ? "1px dashed #ccc"
                  : "none",
            }}
          >
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography sx={{ fontWeight: "bold", fontSize: "11px" }}>
                {voucher.voucherNo}
              </Typography>
              <Typography sx={{ fontSize: "11px" }}>
                {monthNames[voucher.month - 1]} {voucher.year}
              </Typography>
            </Box>

            {voucher.feeItems && voucher.feeItems.length > 0 && (
              <Box sx={{ ml: 1, mb: 0.5 }}>
                {voucher.feeItems.map((item, idx) => (
                  <Typography key={idx} sx={{ fontSize: "10px" }}>
                    • {item.description}: {formatCurrency(item.amount)}
                  </Typography>
                ))}
              </Box>
            )}

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}
            >
              <Typography sx={{ fontSize: "10px" }}>
                Due: {formatDate(voucher.dueDate)}
              </Typography>
              <Typography sx={{ fontSize: "10px" }}>
                Status: {voucher.status}
              </Typography>
            </Box>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}
            >
              <Typography sx={{ fontSize: "10px" }}>
                Total: {formatCurrency(voucher.totalAmount)}
              </Typography>
              <Typography sx={{ fontSize: "10px" }}>
                Paid: {formatCurrency(voucher.paidAmount)}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 0.5,
                pt: 0.5,
                borderTop: "1px solid #ddd",
              }}
            >
              <Typography sx={{ fontWeight: "bold", fontSize: "11px" }}>
                Balance Due:
              </Typography>
              <Typography sx={{ fontWeight: "bold", fontSize: "11px" }}>
                {formatCurrency(voucher.balanceDue)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1, borderWidth: "2px" }} />

      {/* Unpaid Stamp */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mt: 2,
          mb: 2,
        }}
      >
        {/* Outer border box */}
        <Box
          sx={{
            padding: "2px",
            borderRadius: "6px",
            border: "2px solid #d32f2f",
            backgroundColor: "transparent",
            "@media print": {
              border: "1.5px solid #000",
              borderRadius: "5px",
            },
          }}
        >
          {/* Inner border box */}
          <Box
            sx={{
              padding: "4px 10px",
              borderRadius: "4px",
              border: "1.5px solid #d32f2f",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "transparent",
              "@media print": {
                border: "1px solid #000",
                borderRadius: "3px",
                padding: "3px 8px",
              },
            }}
          >
            {/* UNPAID Text */}
            <Typography
              sx={{
                fontSize: "10px",
                fontWeight: "bold",
                color: "#d32f2f",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                lineHeight: 1.2,
                "@media print": {
                  fontSize: "9px",
                  color: "#000",
                  letterSpacing: "1px",
                },
              }}
            >
              UNPAID
            </Typography>

            {/* Date below UNPAID */}
            <Typography
              sx={{
                fontSize: "6px",
                color: "#666",
                mt: 0.3,
                fontWeight: 500,
                "@media print": {
                  fontSize: "5px",
                  color: "#000",
                },
              }}
            >
              {new Date().toLocaleDateString("en-PK", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Summary */}
      <Box
        sx={{
          textAlign: "center",
          mt: 2,
          p: 1,
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          "@media print": {
            backgroundColor: "#f0f0f0",
          },
        }}
      >
        <Typography
          sx={{
            fontWeight: "bold",
            fontSize: "13px",
            mb: 0.5,
            textTransform: "uppercase",
            "@media print": {
              fontSize: "12px",
            },
          }}
        >
          Total Remaining Balance
        </Typography>
        <Typography
          sx={{
            fontWeight: "bold",
            fontSize: "18px",
            color: "error.main",
            "@media print": {
              fontSize: "16px",
              color: "#000",
            },
          }}
        >
          {formatCurrency(totalBalance)}
        </Typography>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Divider sx={{ my: 1 }} />
        <Typography sx={{ fontSize: "9px", color: "#666" }}>
          Thank you for your attention
        </Typography>
        <Typography sx={{ fontSize: "9px", color: "#666", mt: 0.5 }}>
          Please clear dues at your earliest convenience
        </Typography>
      </Box>
    </Box>
  );
}
