import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Global search across students, teachers, and vouchers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const searchTerm = query.toLowerCase();

    // Search students
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { registrationNo: { contains: query, mode: "insensitive" } },
          { rollNo: { contains: query, mode: "insensitive" } },
          { fatherName: { contains: query, mode: "insensitive" } },
          { guardianPhone: { contains: query, mode: "insensitive" } },
          { cnic: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        registrationNo: true,
        firstName: true,
        lastName: true,
        fatherName: true,
        class: {
          select: { name: true },
        },
        section: {
          select: { name: true },
        },
      },
      take: limit,
      orderBy: { firstName: "asc" },
    });

    // Search teachers
    const teachers = await prisma.teacher.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { employeeId: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { cnic: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        designation: true,
        phone: true,
      },
      take: limit,
      orderBy: { firstName: "asc" },
    });

    // Search fee vouchers
    const vouchers = await prisma.feeVoucher.findMany({
      where: {
        OR: [
          { voucherNo: { contains: query, mode: "insensitive" } },
          { student: { firstName: { contains: query, mode: "insensitive" } } },
          { student: { lastName: { contains: query, mode: "insensitive" } } },
          {
            student: {
              registrationNo: { contains: query, mode: "insensitive" },
            },
          },
        ],
      },
      select: {
        id: true,
        voucherNo: true,
        totalAmount: true,
        status: true,
        month: true,
        year: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            registrationNo: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    // Format results
    const results = [
      ...students.map((s) => ({
        type: "student" as const,
        id: s.id,
        title: `${s.firstName} ${s.lastName}`,
        subtitle: `${s.registrationNo} | ${s.class?.name || "No Class"}${
          s.section ? ` - ${s.section.name}` : ""
        } | F/O ${s.fatherName}`,
      })),
      ...teachers.map((t) => ({
        type: "teacher" as const,
        id: t.id,
        title: `${t.firstName} ${t.lastName}`,
        subtitle: `${t.employeeId} | ${t.designation} | ${t.phone}`,
      })),
      ...vouchers.map((v) => ({
        type: "voucher" as const,
        id: v.id,
        title: `${v.voucherNo}`,
        subtitle: `${v.student.firstName} ${
          v.student.lastName
        } | Rs. ${v.totalAmount.toLocaleString()} | ${getMonthName(v.month)} ${
          v.year
        } | ${v.status}`,
      })),
    ];

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in global search:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

// Helper function to get month name
function getMonthName(month: number): string {
  const months = [
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
  return months[month - 1] || "";
}
