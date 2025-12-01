import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST - Clean all data except users, roles, and settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can perform cleanup
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Admin password is required" },
        { status: 400 }
      );
    }

    // Verify admin password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "User not found or password not set" },
        { status: 400 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    // Perform cleanup - delete in correct order to respect foreign keys
    // Start with dependent tables first

    const deletedCounts: Record<string, number> = {};

    // Delete transaction logs
    const transactionLogs = await prisma.transactionLog.deleteMany({});
    deletedCounts.transactionLogs = transactionLogs.count;

    // Delete student marks
    const studentMarks = await prisma.studentMark.deleteMany({});
    deletedCounts.studentMarks = studentMarks.count;

    // Delete attendance
    const attendance = await prisma.attendance.deleteMany({});
    deletedCounts.attendance = attendance.count;

    // Delete payments
    const payments = await prisma.payment.deleteMany({});
    deletedCounts.payments = payments.count;

    // Delete fee voucher items
    const feeVoucherItems = await prisma.feeVoucherItem.deleteMany({});
    deletedCounts.feeVoucherItems = feeVoucherItems.count;

    // Delete fee vouchers
    const feeVouchers = await prisma.feeVoucher.deleteMany({});
    deletedCounts.feeVouchers = feeVouchers.count;

    // Delete complaints
    const complaints = await prisma.complaint.deleteMany({});
    deletedCounts.complaints = complaints.count;

    // Delete teacher salaries
    const teacherSalaries = await prisma.teacherSalary.deleteMany({});
    deletedCounts.teacherSalaries = teacherSalaries.count;

    // Delete timetables
    const timetables = await prisma.timetable.deleteMany({});
    deletedCounts.timetables = timetables.count;

    // Delete exams
    const exams = await prisma.exam.deleteMany({});
    deletedCounts.exams = exams.count;

    // Delete students
    const students = await prisma.student.deleteMany({});
    deletedCounts.students = students.count;

    // Delete teacher subjects
    const teacherSubjects = await prisma.teacherSubject.deleteMany({});
    deletedCounts.teacherSubjects = teacherSubjects.count;

    // Delete teachers (but keep the User records)
    const teachers = await prisma.teacher.deleteMany({});
    deletedCounts.teachers = teachers.count;

    // Delete fee structures
    const feeStructures = await prisma.feeStructure.deleteMany({});
    deletedCounts.feeStructures = feeStructures.count;

    // Delete class subjects
    const classSubjects = await prisma.classSubject.deleteMany({});
    deletedCounts.classSubjects = classSubjects.count;

    // Delete sections
    const sections = await prisma.section.deleteMany({});
    deletedCounts.sections = sections.count;

    // Delete classes
    const classes = await prisma.class.deleteMany({});
    deletedCounts.classes = classes.count;

    // Delete subjects
    const subjects = await prisma.subject.deleteMany({});
    deletedCounts.subjects = subjects.count;

    // Delete academic years (except keep one as current)
    const academicYears = await prisma.academicYear.deleteMany({});
    deletedCounts.academicYears = academicYears.count;

    // Create a default academic year
    const currentYear = new Date().getFullYear();
    await prisma.academicYear.create({
      data: {
        name: `${currentYear}-${currentYear + 1}`,
        startDate: new Date(`${currentYear}-04-01`),
        endDate: new Date(`${currentYear + 1}-03-31`),
        isCurrent: true,
        isActive: true,
      },
    });

    // Reset sequences if they exist
    try {
      await prisma.sequence.updateMany({
        data: { value: 0 },
      });
    } catch (e) {
      // Sequences table might not exist
    }

    const totalDeleted = Object.values(deletedCounts).reduce(
      (a, b) => a + b,
      0
    );

    return NextResponse.json({
      message: "Database cleaned successfully",
      deletedCounts,
      totalDeleted,
    });
  } catch (error) {
    console.error("Database Cleanup Error:", error);
    return NextResponse.json(
      { error: "Failed to clean database. Some data may have been deleted." },
      { status: 500 }
    );
  }
}
