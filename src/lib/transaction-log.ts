import { prisma } from "./prisma";

// Define local types for logging (matching Prisma schema enums)
export type EntityType =
  | "STUDENT"
  | "TEACHER"
  | "USER"
  | "CLASS"
  | "SECTION"
  | "SUBJECT"
  | "FEE"
  | "PAYMENT"
  | "ATTENDANCE"
  | "EXAM"
  | "RESULT"
  | "TIMETABLE"
  | "SALARY"
  | "COMPLAINT";

export type ActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "PAYMENT_RECEIVED"
  | "STATUS_CHANGE"
  | "PROMOTE"
  | "FEE_GENERATED"
  | "RESULT_PUBLISHED";

interface LogOptions {
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  details: Record<string, any>;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

// Legacy interface for backwards compatibility
interface LegacyLogOptions {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  details?: Record<string, any>;
}

export async function createTransactionLog(options: LogOptions): Promise<void> {
  try {
    await prisma.transactionLog.create({
      data: {
        entityType: options.entityType,
        entityId: options.entityId,
        action: options.action,
        details: options.details,
        userId: options.userId,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to create transaction log:", error);
  }
}

// Legacy function for backwards compatibility with object-style calls
export async function logTransaction(options: LegacyLogOptions): Promise<void> {
  try {
    await prisma.transactionLog.create({
      data: {
        entityType: options.entityType.toUpperCase() as EntityType,
        entityId: options.entityId,
        action: options.action.toUpperCase() as ActionType,
        details: options.details || {},
        userId: options.userId,
      },
    });
  } catch (error) {
    console.error("Failed to create transaction log:", error);
  }
}

// Helper functions for common log types
export async function logCreate(
  entityType: EntityType,
  entityId: string,
  details: Record<string, any>,
  userId: string
): Promise<void> {
  await createTransactionLog({
    entityType,
    entityId,
    action: "CREATE",
    details,
    userId,
  });
}

export async function logUpdate(
  entityType: EntityType,
  entityId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId: string
): Promise<void> {
  await createTransactionLog({
    entityType,
    entityId,
    action: "UPDATE",
    details: { oldData, newData },
    userId,
  });
}

export async function logDelete(
  entityType: EntityType,
  entityId: string,
  details: Record<string, any>,
  userId: string
): Promise<void> {
  await createTransactionLog({
    entityType,
    entityId,
    action: "DELETE",
    details,
    userId,
  });
}

export async function logPaymentReceived(
  entityId: string,
  details: Record<string, any>,
  userId: string
): Promise<void> {
  await createTransactionLog({
    entityType: "PAYMENT",
    entityId,
    action: "PAYMENT_RECEIVED",
    details,
    userId,
  });
}

export async function logStatusChange(
  entityType: EntityType,
  entityId: string,
  oldStatus: string,
  newStatus: string,
  userId: string
): Promise<void> {
  await createTransactionLog({
    entityType,
    entityId,
    action: "STATUS_CHANGE",
    details: { oldStatus, newStatus },
    userId,
  });
}

export async function logPromotion(
  studentId: string,
  details: Record<string, any>,
  userId: string
): Promise<void> {
  await createTransactionLog({
    entityType: "STUDENT",
    entityId: studentId,
    action: "PROMOTE",
    details,
    userId,
  });
}

export async function logFeeGenerated(
  voucherId: string,
  details: Record<string, any>,
  userId: string
): Promise<void> {
  await createTransactionLog({
    entityType: "FEE",
    entityId: voucherId,
    action: "FEE_GENERATED",
    details,
    userId,
  });
}

export async function logResultPublished(
  resultId: string,
  details: Record<string, any>,
  userId: string
): Promise<void> {
  await createTransactionLog({
    entityType: "RESULT",
    entityId: resultId,
    action: "RESULT_PUBLISHED",
    details,
    userId,
  });
}
