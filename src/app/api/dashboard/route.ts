import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeeStatus, AttendanceStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current date info
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startOfToday = new Date(currentYear, now.getMonth(), now.getDate());
    const endOfToday = new Date(currentYear, now.getMonth(), now.getDate() + 1);

    // Get counts
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      totalClasses,
      totalSections,
      pendingFeeVouchers,
      pendingAmount,
      monthlyRevenue,
      todayRevenue,
      recentPayments,
      dailyPayments,
      recentVouchers,
      attendanceToday,
      pendingComplaints,
    ] = await Promise.all([
      // Total students
      prisma.student.count(),

      // Active students
      prisma.student.count({
        where: { status: "ACTIVE" },
      }),

      // Total teachers
      prisma.teacher.count({
        where: { isActive: true },
      }),

      // Total classes
      prisma.class.count({
        where: { isActive: true },
      }),

      // Total sections
      prisma.section.count({
        where: { isActive: true },
      }),

      // Pending fee vouchers count
      prisma.feeVoucher.count({
        where: {
          status: {
            in: [FeeStatus.UNPAID, FeeStatus.PARTIAL, FeeStatus.OVERDUE],
          },
        },
      }),

      // Pending amount
      prisma.feeVoucher.aggregate({
        _sum: { balanceDue: true },
        where: {
          status: {
            in: [FeeStatus.UNPAID, FeeStatus.PARTIAL, FeeStatus.OVERDUE],
          },
        },
      }),

      // Monthly revenue (payments this month)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),

      // Today's revenue
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: {
            gte: startOfToday,
            lt: endOfToday,
          },
        },
      }),

      // Recent payments (last 10)
      prisma.payment.findMany({
        take: 10,
        orderBy: { paymentDate: "desc" },
        include: {
          student: {
            select: {
              id: true,
              registrationNo: true,
              firstName: true,
              lastName: true,
            },
          },
          voucher: {
            select: {
              id: true,
              voucherNo: true,
            },
          },
        },
      }),

      // Monthly payments for chart (last 12 months)
      prisma.$queryRaw`
        SELECT 
          TO_CHAR("paymentDate", 'YYYY-MM') as month,
          SUM(amount) as total
        FROM "payments"
        WHERE "paymentDate" >= ${new Date(
          new Date().getFullYear(),
          new Date().getMonth() - 11,
          1
        )}
        GROUP BY TO_CHAR("paymentDate", 'YYYY-MM')
        ORDER BY month ASC
      `,

      // Recent vouchers
      prisma.feeVoucher.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              registrationNo: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      // Today's attendance summary
      prisma.attendance.groupBy({
        by: ["status"],
        _count: true,
        where: {
          date: {
            gte: startOfToday,
            lt: endOfToday,
          },
        },
      }),

      // Pending complaints
      prisma.complaint.count({
        where: { status: "PENDING" },
      }),
    ]);

    // Calculate attendance percentages
    const totalAttendanceToday = attendanceToday.reduce(
      (sum: number, a: any) => sum + a._count,
      0
    );
    const presentToday =
      attendanceToday.find((a: any) => a.status === AttendanceStatus.PRESENT)
        ?._count || 0;
    const attendancePercentage =
      totalAttendanceToday > 0
        ? Math.round((presentToday / totalAttendanceToday) * 100)
        : 0;

    // Generate last 12 months for chart
    const last12Months = [];
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
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const yearMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const displayMonth = `${
        monthNames[date.getMonth()]
      } ${date.getFullYear()}`;
      last12Months.push({ yearMonth, displayMonth });
    }

    // Merge monthly payments with all months
    const chartData = last12Months.map(({ yearMonth, displayMonth }) => {
      const found = (dailyPayments as any[]).find((p) => p.month === yearMonth);
      return {
        date: displayMonth,
        amount: found ? Number(found.total) : 0,
      };
    });

    return NextResponse.json({
      stats: {
        totalStudents,
        activeStudents,
        totalTeachers,
        totalClasses,
        totalSections,
        pendingFeeVouchers,
        pendingAmount: pendingAmount._sum.balanceDue || 0,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        todayRevenue: todayRevenue._sum.amount || 0,
        attendancePercentage,
        pendingComplaints,
        recentVouchers,
      },
      recentPayments: recentPayments.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        receiptNo: p.receiptNo,
        student: p.student,
        voucher: p.voucher,
      })),
      chartData,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
