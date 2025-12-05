import { prisma } from "./prisma";
import { NotificationType } from "@prisma/client";

interface CreateNotificationOptions {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  sentById?: string;
  userIds?: string[]; // Specific users to notify
  roles?: string[]; // Roles to notify (e.g., ["SUPER_ADMIN", "ADMIN"])
}

/**
 * Create notifications for users
 * If userIds is provided, notify those specific users
 * If roles is provided, notify all users with those roles
 * If neither is provided, notify all admins
 */
export async function createNotification(
  options: CreateNotificationOptions
): Promise<number> {
  const { type, title, message, data, sentById, userIds, roles } = options;

  let targetUserIds: string[] = [];

  if (userIds && userIds.length > 0) {
    targetUserIds = userIds;
  } else if (roles && roles.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        role: { in: roles as any },
        isActive: true,
      },
      select: { id: true },
    });
    targetUserIds = users.map((u) => u.id);
  } else {
    // Default: notify all admins
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["SUPER_ADMIN", "ADMIN"] },
        isActive: true,
      },
      select: { id: true },
    });
    targetUserIds = admins.map((a) => a.id);
  }

  if (targetUserIds.length === 0) {
    return 0;
  }

  const result = await prisma.notification.createMany({
    data: targetUserIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      data: data || null,
      sentById: sentById || null,
    })),
  });

  return result.count;
}

/**
 * Create notification for student registration
 */
export async function notifyStudentRegistered(
  studentName: string,
  registrationNo: string,
  className: string,
  sectionName: string | undefined,
  sentById: string
): Promise<void> {
  const sectionText = sectionName ? ` - ${sectionName}` : "";

  await createNotification({
    type: "STUDENT_REGISTERED" as NotificationType,
    title: "New Student Registered",
    message: `${studentName} (${registrationNo}) has been registered in ${className}${sectionText}`,
    data: {
      registrationNo,
      studentName,
      className,
      sectionName,
    },
    sentById,
  });
}

/**
 * Create notification for attendance submission
 */
export async function notifyAttendanceMarked(
  className: string,
  sectionName: string,
  date: string,
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
  },
  sentById: string
): Promise<void> {
  const formattedDate = new Date(date).toLocaleDateString("en-PK", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  await createNotification({
    type: "ATTENDANCE_MARKED" as NotificationType,
    title: "Attendance Submitted",
    message: `Attendance for ${className} - ${sectionName} on ${formattedDate}: ${summary.present} present, ${summary.absent} absent, ${summary.late} late (Total: ${summary.total})`,
    data: {
      className,
      sectionName,
      date,
      summary,
    },
    sentById,
  });
}
