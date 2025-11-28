// Type definitions for Al-Huda Public School Management System

import {
  Role,
  Gender,
  BloodGroup,
  Religion,
  AdmissionType,
  StudentStatus,
  TeacherStatus,
  FeeStatus,
  FeeType,
  PaymentMethod,
  AttendanceStatus,
  ComplaintStatus,
  ComplaintSeverity,
  ExamType,
  ResultStatus,
  GradeLevel,
  DayOfWeek,
  SalaryStatus,
} from "@prisma/client";

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  avatar?: string | null;
  phone?: string | null;
  cnic?: string | null;
  address?: string | null;
  isActive: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permissions?: UserPermission[];
  teacher?: Teacher | null;
}

export interface UserPermission {
  id: string;
  userId: string;
  permission: string;
  granted: boolean;
  createdAt: Date;
}

// Academic types
export interface AcademicYear {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Class {
  id: string;
  name: string;
  displayOrder: number;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  sections?: Section[];
  subjects?: ClassSubject[];
}

export interface Section {
  id: string;
  name: string;
  classId: string;
  class?: Class;
  capacity: number;
  isActive: boolean;
  classTeacherId?: string | null;
  classTeacher?: Teacher | null;
  createdAt: Date;
  updatedAt: Date;
  students?: Student[];
  _count?: {
    students: number;
  };
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  nameUrdu?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassSubject {
  id: string;
  classId: string;
  class?: Class;
  subjectId: string;
  subject?: Subject;
  isOptional: boolean;
  isActive: boolean;
  createdAt: Date;
}

// Student types
export interface Student {
  id: string;
  registrationNo: string;
  rollNo?: string | null;
  firstName: string;
  lastName: string;
  fatherName: string;
  motherName?: string | null;
  dateOfBirth: Date;
  gender: Gender;
  bloodGroup?: BloodGroup | null;
  religion: Religion;
  nationality: string;
  cnic?: string | null;
  photo?: string | null;
  phone?: string | null;
  email?: string | null;
  address: string;
  city: string;
  province: string;
  postalCode?: string | null;
  guardianName: string;
  guardianRelation: string;
  guardianCnic?: string | null;
  guardianPhone: string;
  guardianPhone2?: string | null;
  guardianEmail?: string | null;
  guardianOccupation?: string | null;
  guardianAddress?: string | null;
  guardianMonthlyIncome?: string | null;
  academicYearId: string;
  academicYear?: AcademicYear;
  classId?: string | null;
  sectionId?: string | null;
  section?: Section;
  admissionType: AdmissionType;
  admissionDate: Date;
  previousSchool?: string | null;
  previousClass?: string | null;
  transferCertificate?: string | null;
  monthlyFee: number;
  status: StudentStatus;
  statusReason?: string | null;
  statusDate?: Date | null;
  remarks?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy?: User;
  updatedById?: string | null;
  updatedBy?: User | null;
  feeVouchers?: FeeVoucher[];
  payments?: Payment[];
  attendance?: Attendance[];
  complaints?: Complaint[];
}

// Teacher types
export interface Teacher {
  id: string;
  employeeId: string;
  userId?: string | null;
  user?: User | null;
  firstName: string;
  lastName: string;
  fatherName?: string | null;
  dateOfBirth?: Date | null;
  gender: Gender;
  cnic: string;
  photo?: string | null;
  phone: string;
  phone2?: string | null;
  email?: string | null;
  address: string;
  city: string;
  province: string;
  qualification: string;
  specialization?: string | null;
  experience: number;
  joiningDate: Date;
  designation: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankBranch?: string | null;
  status: TeacherStatus;
  statusReason?: string | null;
  remarks?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy?: User;
  updatedById?: string | null;
  updatedBy?: User | null;
  subjects?: TeacherSubject[];
  classSections?: Section[];
  salaries?: TeacherSalary[];
}

export interface TeacherSubject {
  id: string;
  teacherId: string;
  teacher?: Teacher;
  subjectId: string;
  subject?: Subject;
  isActive: boolean;
  createdAt: Date;
}

export interface TeacherSalary {
  id: string;
  salaryNo: string;
  teacherId: string;
  teacher?: Teacher;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  paidAmount: number;
  balanceDue: number;
  status: SalaryStatus;
  paymentDate?: Date | null;
  paymentMethod?: PaymentMethod | null;
  reference?: string | null;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy?: User;
}

// Fee types
export interface FeeStructure {
  id: string;
  academicYearId: string;
  academicYear?: AcademicYear;
  classId?: string | null;
  class?: Class | null;
  feeType: FeeType;
  name: string;
  amount: number;
  description?: string | null;
  isRecurring: boolean;
  dueDay?: number | null;
  lateFeeAmount: number;
  lateFeeAfterDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeeVoucher {
  id: string;
  voucherNo: string;
  studentId: string;
  student?: Student;
  month: number;
  year: number;
  feeItems?: FeeVoucherItem[];
  subtotal: number;
  previousBalance: number;
  lateFee: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  issueDate: Date;
  dueDate: Date;
  status: FeeStatus;
  previousVoucherId?: string | null;
  previousVoucher?: FeeVoucher | null;
  isAutoGenerated: boolean;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy?: User;
  payments?: Payment[];
}

export interface FeeVoucherItem {
  id: string;
  voucherId: string;
  voucher?: FeeVoucher;
  feeType: FeeType;
  description: string;
  amount: number;
  createdAt: Date;
}

export interface Payment {
  id: string;
  receiptNo: string;
  studentId: string;
  student?: Student;
  voucherId: string;
  voucher?: FeeVoucher;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  remarks?: string | null;
  createdAt: Date;
  createdById: string;
  createdBy?: User;
}

// Attendance types
export interface Attendance {
  id: string;
  studentId: string;
  student?: Student;
  sectionId: string;
  section?: Section;
  teacherId?: string | null;
  teacher?: Teacher | null;
  date: Date;
  status: AttendanceStatus;
  remarks?: string | null;
  period?: number | null;
  createdAt: Date;
  updatedAt: Date;
  markedById: string;
  markedBy?: User;
}

// Complaint types
export interface Complaint {
  id: string;
  complaintNo: string;
  studentId: string;
  student?: Student;
  title: string;
  description: string;
  severity: ComplaintSeverity;
  category: string;
  madeByTeacherId?: string | null;
  madeByTeacher?: Teacher | null;
  againstTeacherId?: string | null;
  againstTeacher?: Teacher | null;
  status: ComplaintStatus;
  resolution?: string | null;
  resolvedAt?: Date | null;
  resolvedById?: string | null;
  resolvedBy?: User | null;
  parentNotified: boolean;
  parentNotifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy?: User;
}

// Exam types
export interface Exam {
  id: string;
  name: string;
  examType: ExamType;
  academicYearId: string;
  academicYear?: AcademicYear;
  classId: string;
  class?: Class;
  sectionId?: string | null;
  section?: Section | null;
  subjectId?: string | null;
  subject?: Subject | null;
  teacherId?: string | null;
  teacher?: Teacher | null;
  totalMarks: number;
  passingMarks: number;
  examDate?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
  isPublished: boolean;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy?: User;
  studentMarks?: StudentMark[];
}

export interface StudentMark {
  id: string;
  examId: string;
  exam?: Exam;
  studentId: string;
  student?: Student;
  subjectId: string;
  subject?: Subject;
  marksObtained?: number | null;
  totalMarks: number;
  isAbsent: boolean;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
  enteredById: string;
  enteredBy?: User;
}

export interface ExamResult {
  id: string;
  examId: string;
  exam?: Exam;
  academicYearId: string;
  academicYear?: AcademicYear;
  status: ResultStatus;
  totalStudents: number;
  passedStudents: number;
  failedStudents: number;
  jobId?: string | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  createdBy?: User;
}

// Timetable types
export interface Timetable {
  id: string;
  academicYearId: string;
  academicYear?: AcademicYear;
  classId: string;
  class?: Class;
  sectionId: string;
  section?: Section;
  subjectId: string;
  subject?: Subject;
  teacherId: string;
  teacher?: Teacher;
  dayOfWeek: DayOfWeek;
  periodNo: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Period {
  id: string;
  periodNo: number;
  name: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  isActive: boolean;
}

// Dashboard types
export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSections: number;
  activeStudents: number;
  activeTeachers: number;
  monthlyRevenue: number;
  pendingFees: number;
  todayAttendancePercentage: number;
  recentPayments: Payment[];
  recentComplaints: Complaint[];
  feeCollectionByMonth: { month: string; amount: number }[];
  studentsByClass: { className: string; count: number }[];
  attendanceTrend: { date: string; percentage: number }[];
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// NextAuth extended types
declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    avatar?: string | null;
    teacherId?: string | null;
    permissions?: string[];
  }

  interface Session {
    user: User & {
      id: string;
      role: Role;
      avatar?: string | null;
      teacherId?: string | null;
      permissions?: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    avatar?: string | null;
    teacherId?: string | null;
    permissions?: string[];
  }
}
