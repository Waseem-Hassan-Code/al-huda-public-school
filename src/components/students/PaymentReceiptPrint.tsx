"use client";

import { Box, Typography, Divider } from "@mui/material";

interface Payment {
  receiptNo: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
}

interface FeeVoucher {
  id: string;
  voucherNo: string;
  month: number;
  year: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
}

interface Student {
  registrationNo: string;
  firstName: string;
  lastName: string;
  class?: { name: string };
  section?: { name: string };
}

interface PaymentReceiptPrintProps {
  student: Student;
  voucher: FeeVoucher;
  payment: Payment;
  balanceRemaining: number;
}

export default function PaymentReceiptPrint({
  student,
  voucher,
  payment,
  balanceRemaining,
}: PaymentReceiptPrintProps) {
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box
      id="payment-receipt-print"
      sx={{
        width: "80mm", // Standard thermal printer width
        maxWidth: "80mm",
        margin: "0 auto",
        padding: "10px",
        fontFamily: "monospace",
        fontSize: "14px",
        lineHeight: "1.6",
        fontWeight: 600,
        "@media print": {
          width: "80mm",
          maxWidth: "80mm",
          margin: 0,
          padding: "1mm",
          fontSize: "20px",
          fontWeight: 700,
        },
      }}
    >
      {/* PAID Stamp at Top */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mb: 3,
        }}
      >
        {/* Outer border box */}
        <Box
          sx={{
            padding: "3px",
            borderRadius: "8px",
            border: "3px solid #2e7d32",
            backgroundColor: "transparent",
            "@media print": {
              border: "2.5px solid #000",
              borderRadius: "7px",
            },
          }}
        >
          {/* Inner border box */}
          <Box
            sx={{
              padding: "6px 16px",
              borderRadius: "5px",
              border: "2px solid #2e7d32",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "transparent",
              "@media print": {
                border: "1.5px solid #000",
                borderRadius: "4px",
                padding: "5px 14px",
              },
            }}
          >
            {/* PAID Text */}
            <Typography
              sx={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#2e7d32",
                textTransform: "uppercase",
                letterSpacing: "3px",
                lineHeight: 1.2,
                "@media print": {
                  fontSize: "18px",
                  color: "#000",
                  letterSpacing: "2px",
                },
              }}
            >
              PAID
            </Typography>

            {/* Date below PAID */}
            <Typography
              sx={{
                fontSize: "10px",
                color: "#666",
                mt: 0.5,
                fontWeight: 500,
                "@media print": {
                  fontSize: "12px",
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

      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 2 }}>
        {/* School Name */}
        <Typography
          sx={{
            fontSize: "16px",
            fontWeight: "bold",
            mb: 1,
            textTransform: "uppercase",
            "@media print": {
              fontSize: "20px",
            },
          }}
        >
          Al-Huda Public School and College Meithakheil
        </Typography>

        <Typography
          variant="body2"
          sx={{
            fontSize: "14px",
            mb: 1,
            fontWeight: "bold",
            "@media print": {
              fontSize: "16px",
            },
          }}
        >
          Payment Receipt
        </Typography>
        <Divider sx={{ my: 1 }} />
      </Box>

      {/* Student Info */}
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            fontWeight: "bold",
            mb: 1,
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            "@media print": {
              fontSize: "16px",
            },
          }}
        >
          Student Information
        </Typography>
        <Typography
          sx={{
            fontSize: "15px",
            fontWeight: "bold",
            mb: 0.8,
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0.3px",
            "@media print": {
              fontSize: "18px",
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
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0.5px",
            color: "#333",
            "@media print": {
              fontSize: "16px",
              color: "#000",
            },
          }}
        >
          Registration No: {student.registrationNo}
        </Typography>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Receipt Details */}
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            fontWeight: "bold",
            mb: 1,
            fontSize: "14px",
            textTransform: "uppercase",
            "@media print": {
              fontSize: "16px",
            },
          }}
        >
          Receipt Details
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography
            sx={{ fontSize: "13px", "@media print": { fontSize: "15px" } }}
          >
            Receipt No:
          </Typography>
          <Typography
            sx={{
              fontSize: "13px",
              fontWeight: "bold",
              "@media print": { fontSize: "15px" },
            }}
          >
            {payment.receiptNo}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography
            sx={{ fontSize: "13px", "@media print": { fontSize: "15px" } }}
          >
            Date:
          </Typography>
          <Typography
            sx={{ fontSize: "13px", "@media print": { fontSize: "15px" } }}
          >
            {formatDate(payment.paymentDate)}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography
            sx={{ fontSize: "13px", "@media print": { fontSize: "15px" } }}
          >
            Voucher No:
          </Typography>
          <Typography
            sx={{
              fontSize: "13px",
              fontWeight: "bold",
              "@media print": { fontSize: "15px" },
            }}
          >
            {voucher.voucherNo}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography
            sx={{ fontSize: "13px", "@media print": { fontSize: "15px" } }}
          >
            Payment Method:
          </Typography>
          <Typography
            sx={{ fontSize: "13px", "@media print": { fontSize: "15px" } }}
          >
            {payment.paymentMethod.replace("_", " ")}
          </Typography>
        </Box>

        {payment.reference && (
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography
              sx={{ fontSize: "13px", "@media print": { fontSize: "15px" } }}
            >
              Reference:
            </Typography>
            <Typography
              sx={{ fontSize: "13px", "@media print": { fontSize: "15px" } }}
            >
              {payment.reference}
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Payment Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            fontWeight: "bold",
            mb: 1,
            fontSize: "14px",
            textTransform: "uppercase",
            "@media print": {
              fontSize: "16px",
            },
          }}
        >
          Payment Summary
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 0.8,
            pt: 0.5,
            borderTop: "1px solid #ddd",
          }}
        >
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: "bold",
              "@media print": { fontSize: "16px" },
            }}
          >
            Amount Paid:
          </Typography>
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: "bold",
              color: "#2e7d32",
              "@media print": { fontSize: "16px" },
            }}
          >
            {formatCurrency(payment.amount)}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 0.8,
            pt: 0.5,
            borderTop: "1px solid #ddd",
          }}
        >
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: "bold",
              "@media print": { fontSize: "16px" },
            }}
          >
            Balance Remaining:
          </Typography>
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: "bold",
              color: balanceRemaining > 0 ? "#d32f2f" : "#2e7d32",
              "@media print": {
                fontSize: "16px",
                color: balanceRemaining > 0 ? "#000" : "#000",
              },
            }}
          >
            {formatCurrency(balanceRemaining)}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 1, borderWidth: "2px" }} />

      {/* Footer */}
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography
          sx={{
            fontSize: "12px",
            color: "#666",
            "@media print": { fontSize: "14px" },
          }}
        >
          Thank you for your payment
        </Typography>
        <Typography
          sx={{
            fontSize: "12px",
            color: "#666",
            mt: 0.5,
            "@media print": { fontSize: "14px" },
          }}
        >
          Please keep this receipt for your records
        </Typography>
      </Box>
    </Box>
  );
}
