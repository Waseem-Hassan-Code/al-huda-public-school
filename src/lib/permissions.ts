// Permission system for Al-Huda Public School Management System

export enum Permission {
  // Dashboard
  VIEW_DASHBOARD = "dashboard.view",
  VIEW_REPORTS = "reports.view",

  // User Management
  VIEW_USERS = "users.view",
  CREATE_USER = "users.create",
  UPDATE_USER = "users.update",
  DELETE_USER = "users.delete",
  MANAGE_PERMISSIONS = "users.permissions",

  // Student Management
  VIEW_STUDENTS = "students.view",
  CREATE_STUDENT = "students.create",
  UPDATE_STUDENT = "students.update",
  DELETE_STUDENT = "students.delete",
  PROMOTE_STUDENT = "students.promote",
  TRANSFER_STUDENT = "students.transfer",
  VIEW_STUDENT_FEES = "students.fees.view",

  // Teacher Management
  VIEW_TEACHERS = "teachers.view",
  CREATE_TEACHER = "teachers.create",
  UPDATE_TEACHER = "teachers.update",
  DELETE_TEACHER = "teachers.delete",
  MANAGE_TEACHER_SALARY = "teachers.salary",

  // Class Management
  VIEW_CLASSES = "classes.view",
  CREATE_CLASS = "classes.create",
  UPDATE_CLASS = "classes.update",
  DELETE_CLASS = "classes.delete",

  // Section Management
  VIEW_SECTIONS = "sections.view",
  CREATE_SECTION = "sections.create",
  UPDATE_SECTION = "sections.update",
  DELETE_SECTION = "sections.delete",

  // Subject Management
  VIEW_SUBJECTS = "subjects.view",
  CREATE_SUBJECT = "subjects.create",
  UPDATE_SUBJECT = "subjects.update",
  DELETE_SUBJECT = "subjects.delete",

  // Fee Management
  VIEW_FEES = "fees.view",
  CREATE_FEE_VOUCHER = "fees.create",
  UPDATE_FEE_VOUCHER = "fees.update",
  DELETE_FEE_VOUCHER = "fees.delete",
  RECEIVE_PAYMENT = "fees.payment",
  GENERATE_FEE_VOUCHERS = "fees.generate",
  MANAGE_FEE_STRUCTURE = "fees.structure",

  // Attendance
  VIEW_ATTENDANCE = "attendance.view",
  MARK_ATTENDANCE = "attendance.mark",
  EDIT_ATTENDANCE = "attendance.edit",

  // Complaints
  VIEW_COMPLAINTS = "complaints.view",
  CREATE_COMPLAINT = "complaints.create",
  RESOLVE_COMPLAINT = "complaints.resolve",

  // Examinations
  VIEW_EXAMS = "exams.view",
  CREATE_EXAM = "exams.create",
  UPDATE_EXAM = "exams.update",
  DELETE_EXAM = "exams.delete",
  ENTER_MARKS = "exams.marks.enter",
  VIEW_MARKS = "exams.marks.view",

  // Results
  VIEW_RESULTS = "results.view",
  GENERATE_RESULTS = "results.generate",
  PUBLISH_RESULTS = "results.publish",

  // Timetable
  VIEW_TIMETABLE = "timetable.view",
  CREATE_TIMETABLE = "timetable.create",
  UPDATE_TIMETABLE = "timetable.update",
  DELETE_TIMETABLE = "timetable.delete",

  // Academic Year
  VIEW_ACADEMIC_YEAR = "academic.view",
  MANAGE_ACADEMIC_YEAR = "academic.manage",

  // Settings
  VIEW_SETTINGS = "settings.view",
  MANAGE_SETTINGS = "settings.manage",

  // Transaction Logs
  VIEW_LOGS = "logs.view",
}

// Role-based permissions
export const rolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission), // All permissions

  ADMIN: [
    // All permissions except some sensitive ones
    ...Object.values(Permission).filter(
      (p) =>
        !p.startsWith("settings.manage") && !p.startsWith("users.permissions")
    ),
  ],

  PRINCIPAL: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_REPORTS,
    Permission.VIEW_USERS,
    Permission.VIEW_STUDENTS,
    Permission.CREATE_STUDENT,
    Permission.UPDATE_STUDENT,
    Permission.PROMOTE_STUDENT,
    Permission.VIEW_STUDENT_FEES,
    Permission.VIEW_TEACHERS,
    Permission.CREATE_TEACHER,
    Permission.UPDATE_TEACHER,
    Permission.VIEW_CLASSES,
    Permission.VIEW_SECTIONS,
    Permission.VIEW_SUBJECTS,
    Permission.VIEW_FEES,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_COMPLAINTS,
    Permission.RESOLVE_COMPLAINT,
    Permission.VIEW_EXAMS,
    Permission.VIEW_MARKS,
    Permission.VIEW_RESULTS,
    Permission.PUBLISH_RESULTS,
    Permission.VIEW_TIMETABLE,
    Permission.VIEW_ACADEMIC_YEAR,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_LOGS,
  ],

  VICE_PRINCIPAL: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_REPORTS,
    Permission.VIEW_STUDENTS,
    Permission.UPDATE_STUDENT,
    Permission.VIEW_STUDENT_FEES,
    Permission.VIEW_TEACHERS,
    Permission.VIEW_CLASSES,
    Permission.VIEW_SECTIONS,
    Permission.VIEW_SUBJECTS,
    Permission.VIEW_FEES,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_COMPLAINTS,
    Permission.RESOLVE_COMPLAINT,
    Permission.VIEW_EXAMS,
    Permission.VIEW_MARKS,
    Permission.VIEW_RESULTS,
    Permission.VIEW_TIMETABLE,
    Permission.VIEW_ACADEMIC_YEAR,
  ],

  TEACHER: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS,
    Permission.VIEW_CLASSES,
    Permission.VIEW_SECTIONS,
    Permission.VIEW_SUBJECTS,
    Permission.VIEW_ATTENDANCE,
    Permission.MARK_ATTENDANCE,
    Permission.VIEW_COMPLAINTS,
    Permission.CREATE_COMPLAINT,
    Permission.VIEW_EXAMS,
    Permission.ENTER_MARKS,
    Permission.VIEW_MARKS,
    Permission.VIEW_RESULTS,
    Permission.VIEW_TIMETABLE,
  ],

  ACCOUNTANT: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_REPORTS,
    Permission.VIEW_STUDENTS,
    Permission.VIEW_STUDENT_FEES,
    Permission.VIEW_TEACHERS,
    Permission.MANAGE_TEACHER_SALARY,
    Permission.VIEW_FEES,
    Permission.CREATE_FEE_VOUCHER,
    Permission.UPDATE_FEE_VOUCHER,
    Permission.RECEIVE_PAYMENT,
    Permission.GENERATE_FEE_VOUCHERS,
    Permission.MANAGE_FEE_STRUCTURE,
    Permission.VIEW_LOGS,
  ],

  CLERK: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS,
    Permission.CREATE_STUDENT,
    Permission.UPDATE_STUDENT,
    Permission.VIEW_STUDENT_FEES,
    Permission.VIEW_TEACHERS,
    Permission.VIEW_CLASSES,
    Permission.VIEW_SECTIONS,
    Permission.VIEW_FEES,
    Permission.CREATE_FEE_VOUCHER,
    Permission.RECEIVE_PAYMENT,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_TIMETABLE,
  ],

  RECEPTIONIST: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS,
    Permission.VIEW_TEACHERS,
    Permission.VIEW_CLASSES,
    Permission.VIEW_SECTIONS,
    Permission.VIEW_FEES,
    Permission.VIEW_TIMETABLE,
  ],

  VIEWER: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STUDENTS,
    Permission.VIEW_TEACHERS,
    Permission.VIEW_CLASSES,
    Permission.VIEW_SECTIONS,
    Permission.VIEW_SUBJECTS,
    Permission.VIEW_TIMETABLE,
  ],
};

// Check if a role has a specific permission
export function hasPermission(
  role: string,
  permission: Permission,
  customPermissions?: string[]
): boolean {
  // Check custom permissions first (user-specific)
  if (customPermissions?.includes(permission)) {
    return true;
  }

  // Check role-based permissions
  return rolePermissions[role]?.includes(permission) ?? false;
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(
  role: string,
  permissions: Permission[],
  customPermissions?: string[]
): boolean {
  return permissions.some((permission) =>
    hasPermission(role, permission, customPermissions)
  );
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(
  role: string,
  permissions: Permission[],
  customPermissions?: string[]
): boolean {
  return permissions.every((permission) =>
    hasPermission(role, permission, customPermissions)
  );
}

// Get all permissions for a role
export function getPermissionsForRole(role: string): Permission[] {
  return rolePermissions[role] ?? [];
}

// Permission groups for UI display
export const permissionGroups = {
  Dashboard: [Permission.VIEW_DASHBOARD, Permission.VIEW_REPORTS],
  Users: [
    Permission.VIEW_USERS,
    Permission.CREATE_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.MANAGE_PERMISSIONS,
  ],
  Students: [
    Permission.VIEW_STUDENTS,
    Permission.CREATE_STUDENT,
    Permission.UPDATE_STUDENT,
    Permission.DELETE_STUDENT,
    Permission.PROMOTE_STUDENT,
    Permission.TRANSFER_STUDENT,
    Permission.VIEW_STUDENT_FEES,
  ],
  Teachers: [
    Permission.VIEW_TEACHERS,
    Permission.CREATE_TEACHER,
    Permission.UPDATE_TEACHER,
    Permission.DELETE_TEACHER,
    Permission.MANAGE_TEACHER_SALARY,
  ],
  Classes: [
    Permission.VIEW_CLASSES,
    Permission.CREATE_CLASS,
    Permission.UPDATE_CLASS,
    Permission.DELETE_CLASS,
  ],
  Sections: [
    Permission.VIEW_SECTIONS,
    Permission.CREATE_SECTION,
    Permission.UPDATE_SECTION,
    Permission.DELETE_SECTION,
  ],
  Subjects: [
    Permission.VIEW_SUBJECTS,
    Permission.CREATE_SUBJECT,
    Permission.UPDATE_SUBJECT,
    Permission.DELETE_SUBJECT,
  ],
  Fees: [
    Permission.VIEW_FEES,
    Permission.CREATE_FEE_VOUCHER,
    Permission.UPDATE_FEE_VOUCHER,
    Permission.DELETE_FEE_VOUCHER,
    Permission.RECEIVE_PAYMENT,
    Permission.GENERATE_FEE_VOUCHERS,
    Permission.MANAGE_FEE_STRUCTURE,
  ],
  Attendance: [
    Permission.VIEW_ATTENDANCE,
    Permission.MARK_ATTENDANCE,
    Permission.EDIT_ATTENDANCE,
  ],
  Complaints: [
    Permission.VIEW_COMPLAINTS,
    Permission.CREATE_COMPLAINT,
    Permission.RESOLVE_COMPLAINT,
  ],
  Exams: [
    Permission.VIEW_EXAMS,
    Permission.CREATE_EXAM,
    Permission.UPDATE_EXAM,
    Permission.DELETE_EXAM,
    Permission.ENTER_MARKS,
    Permission.VIEW_MARKS,
  ],
  Results: [
    Permission.VIEW_RESULTS,
    Permission.GENERATE_RESULTS,
    Permission.PUBLISH_RESULTS,
  ],
  Timetable: [
    Permission.VIEW_TIMETABLE,
    Permission.CREATE_TIMETABLE,
    Permission.UPDATE_TIMETABLE,
    Permission.DELETE_TIMETABLE,
  ],
  Settings: [
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_ACADEMIC_YEAR,
    Permission.MANAGE_ACADEMIC_YEAR,
    Permission.VIEW_LOGS,
  ],
};
