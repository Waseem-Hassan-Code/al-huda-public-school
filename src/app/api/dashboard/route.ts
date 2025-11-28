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

    // Get counts
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      totalClasses,
      totalSections,
      pendingFeeVouchers,
      monthlyRevenue,
      recentPayments,
      monthlyPayments,
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

      // Pending fee vouchers
      prisma.feeVoucher.count({
        where: {
          status: { in: [FeeStatus.UNPAID, FeeStatus.PARTIAL] },
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

      // Recent payments (last 10)
      prisma.payment.findMany({
        take: 10,
        orderBy: { paymentDate: "desc" },
        include: {
          voucher: {
            include: {
              student: {
                select: {
                  id: true,
                  studentId: true,
                  name: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),

      // Monthly payments for chart (last 6 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "paymentDate") as month,
          SUM(amount) as total
        FROM "payments"
        WHERE "paymentDate" >= ${new Date(currentYear, currentMonth - 5, 1)}
        GROUP BY DATE_TRUNC('month', "paymentDate")
        ORDER BY month ASC
      `,

      // Today's attendance summary
      prisma.attendance.groupBy({
        by: ["status"],
        _count: true,
        where: {
          date: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
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

    // Format monthly payments for chart
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
    const chartData = (monthlyPayments as any[]).map((item: any) => ({
      month: monthNames[new Date(item.month).getMonth()],
      revenue: Number(item.total) || 0,
    }));

    // Fill missing months with 0
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = monthNames[monthIndex];
      const existingData = chartData.find((d) => d.month === monthName);
      last6Months.push({
        month: monthName,
        revenue: existingData?.revenue || 0,
      });
    }

    return NextResponse.json({
      stats: {
        totalStudents,
        activeStudents,
        totalTeachers,
        totalClasses,
        totalSections,
        pendingFeeVouchers,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        attendancePercentage,
        pendingComplaints,
      },
      recentPayments: recentPayments.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        receiptNumber: p.receiptNumber,
        student: p.voucher.student,
      })),
      chartData: last6Months,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
