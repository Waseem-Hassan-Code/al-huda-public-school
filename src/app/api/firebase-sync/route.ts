import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  syncTeachersToFirebase,
  syncStudentsToFirebase,
  syncClassesToFirebase,
  syncSubjectsToFirebase,
  syncAttendanceFromFirebase,
  syncResultsFromFirebase,
  markAttendanceSynced,
  markResultsSynced,
  deleteOldAttendanceRecords,
  deleteOldResultRecords,
  createSyncLog,
  updateSyncLog,
  getRecentSyncLogs,
} from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

// GET - Get sync status and recent logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.MANAGE_SETTINGS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "logs") {
      const logs = await getRecentSyncLogs(20);
      return NextResponse.json({ logs });
    }

    // Get counts for sync preview
    const [teacherCount, studentCount, classCount, subjectCount] =
      await Promise.all([
        prisma.teacher.count({ where: { status: "ACTIVE" } }),
        prisma.student.count({ where: { status: "ACTIVE" } }),
        prisma.class.count(),
        prisma.classSubject.count(),
      ]);

    return NextResponse.json({
      counts: {
        teachers: teacherCount,
        students: studentCount,
        classes: classCount,
        subjects: subjectCount,
      },
    });
  } catch (error) {
    console.error("Firebase Sync GET Error:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}

// POST - Trigger sync operations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.MANAGE_SETTINGS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { syncType, options = {} } = body;

    const validSyncTypes = [
      "FULL",
      "TEACHERS",
      "STUDENTS",
      "CLASSES",
      "SUBJECTS",
      "PULL_ATTENDANCE",
      "PULL_RESULTS",
      "CLEANUP",
    ];

    if (!syncType || !validSyncTypes.includes(syncType)) {
      return NextResponse.json({ error: "Invalid sync type" }, { status: 400 });
    }

    // Create sync log
    const logId = await createSyncLog({
      syncType: syncType as any,
      direction: syncType.startsWith("PULL") ? "FROM_FIREBASE" : "TO_FIREBASE",
      status: "IN_PROGRESS",
      recordsProcessed: 0,
      recordsFailed: 0,
      startedAt: Timestamp.now(),
      initiatedBy: session.user.id,
    });

    let result: { success: number; failed: number } = { success: 0, failed: 0 };
    let cleanupCount = 0;

    try {
      switch (syncType) {
        case "FULL":
          // Sync all data to Firebase
          const [teachers, students, classes, classSubjects] =
            await Promise.all([
              prisma.teacher.findMany({
                where: { status: "ACTIVE" },
                include: {
                  subjects: {
                    include: {
                      subject: true,
                      class: true,
                    },
                  },
                  classSections: {
                    include: {
                      class: true,
                    },
                  },
                },
              }),
              prisma.student.findMany({
                where: { status: "ACTIVE" },
                include: {
                  class: true,
                  section: true,
                },
              }),
              prisma.class.findMany({
                include: {
                  sections: true,
                },
              }),
              prisma.classSubject.findMany({
                include: {
                  class: true,
                  subject: true,
                },
              }),
            ]);

          const teacherResult = await syncTeachersToFirebase(teachers);
          const studentResult = await syncStudentsToFirebase(students);
          const classResult = await syncClassesToFirebase(classes);
          const subjectResult = await syncSubjectsToFirebase(classSubjects);

          result = {
            success:
              teacherResult.success +
              studentResult.success +
              classResult.success +
              subjectResult.success,
            failed:
              teacherResult.failed +
              studentResult.failed +
              classResult.failed +
              subjectResult.failed,
          };
          break;

        case "TEACHERS":
          const teachersData = await prisma.teacher.findMany({
            where: { status: "ACTIVE" },
            include: {
              subjects: {
                include: {
                  subject: true,
                  class: true,
                },
              },
              classSections: {
                include: {
                  class: true,
                },
              },
            },
          });
          result = await syncTeachersToFirebase(teachersData);
          break;

        case "STUDENTS":
          const studentsData = await prisma.student.findMany({
            where: { status: "ACTIVE" },
            include: {
              class: true,
              section: true,
            },
          });
          result = await syncStudentsToFirebase(studentsData);
          break;

        case "CLASSES":
          const classesData = await prisma.class.findMany({
            include: {
              sections: true,
            },
          });
          result = await syncClassesToFirebase(classesData);
          break;

        case "SUBJECTS":
          const subjectsData = await prisma.classSubject.findMany({
            include: {
              class: true,
              subject: true,
            },
          });
          result = await syncSubjectsToFirebase(subjectsData);
          break;

        case "PULL_ATTENDANCE":
          // Pull attendance from Firebase and save to PostgreSQL
          const attendanceRecords = await syncAttendanceFromFirebase();
          const attendanceIds: string[] = [];

          for (const record of attendanceRecords) {
            try {
              // Find teacher in local DB
              const teacher = await prisma.teacher.findFirst({
                where: { id: record.teacherId },
              });

              if (!teacher) continue;

              // Get section for the class
              const section = await prisma.section.findFirst({
                where: {
                  classId: record.classId,
                  ...(record.sectionId ? { id: record.sectionId } : {}),
                },
              });

              if (!section) continue;

              // Create attendance records for each student
              for (const studentRecord of record.records) {
                // Check if attendance record exists for this student, date
                const existingAttendance = await prisma.attendance.findFirst({
                  where: {
                    studentId: studentRecord.studentId,
                    date: new Date(record.date),
                  },
                });

                if (existingAttendance) {
                  await prisma.attendance.update({
                    where: { id: existingAttendance.id },
                    data: {
                      status: studentRecord.status,
                      remarks: studentRecord.remarks,
                    },
                  });
                } else {
                  await prisma.attendance.create({
                    data: {
                      studentId: studentRecord.studentId,
                      sectionId: section.id,
                      teacherId: teacher.id,
                      date: new Date(record.date),
                      status: studentRecord.status,
                      remarks: studentRecord.remarks,
                      markedById: teacher.userId || session.user.id,
                    },
                  });
                }
              }

              attendanceIds.push(record.id);
              result.success++;
            } catch (error) {
              console.error(`Failed to sync attendance ${record.id}:`, error);
              result.failed++;
            }
          }

          // Mark as synced in Firebase
          if (attendanceIds.length > 0) {
            await markAttendanceSynced(attendanceIds);
          }
          break;

        case "PULL_RESULTS":
          // Pull results from Firebase and save to PostgreSQL
          const resultRecords = await syncResultsFromFirebase();
          const resultIds: string[] = [];

          for (const record of resultRecords) {
            try {
              // Find exam in local DB
              const exam = await prisma.exam.findFirst({
                where: { id: record.examId },
              });

              if (!exam) continue;

              // Create or update student marks
              for (const mark of record.marks) {
                await prisma.studentMark.upsert({
                  where: {
                    examId_studentId_subjectId: {
                      examId: record.examId,
                      subjectId: record.subjectId,
                      studentId: mark.studentId,
                    },
                  },
                  update: {
                    marksObtained: mark.isAbsent ? null : mark.obtainedMarks,
                    isAbsent: mark.isAbsent,
                  },
                  create: {
                    examId: record.examId,
                    subjectId: record.subjectId,
                    studentId: mark.studentId,
                    marksObtained: mark.isAbsent ? null : mark.obtainedMarks,
                    totalMarks: mark.totalMarks,
                    isAbsent: mark.isAbsent,
                    enteredById: session.user.id,
                  },
                });
              }

              resultIds.push(record.id);
              result.success++;
            } catch (error) {
              console.error(`Failed to sync result ${record.id}:`, error);
              result.failed++;
              result.failed++;
            }
          }

          // Mark as synced in Firebase
          if (resultIds.length > 0) {
            await markResultsSynced(resultIds);
          }
          break;

        case "CLEANUP":
          // Delete old synced records from Firebase
          const daysOld = options.daysOld || 7;
          const deletedAttendance = await deleteOldAttendanceRecords(daysOld);
          const deletedResults = await deleteOldResultRecords(daysOld);
          cleanupCount = deletedAttendance + deletedResults;
          result.success = cleanupCount;
          break;
      }

      // Update sync log
      await updateSyncLog(logId, {
        status: "SUCCESS",
        recordsProcessed: result.success,
        recordsFailed: result.failed,
        completedAt: Timestamp.now(),
      });

      return NextResponse.json({
        message: "Sync completed successfully",
        syncType,
        recordsProcessed: result.success,
        recordsFailed: result.failed,
        cleanupCount: syncType === "CLEANUP" ? cleanupCount : undefined,
      });
    } catch (syncError: any) {
      // Update sync log with error
      await updateSyncLog(logId, {
        status: "FAILED",
        recordsProcessed: result.success,
        recordsFailed: result.failed,
        completedAt: Timestamp.now(),
        error: syncError.message,
      });

      throw syncError;
    }
  } catch (error: any) {
    console.error("Firebase Sync POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
