import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyD0yFNJjGW80jZY2BcEB7c_n9qo4tlKLkU",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "alhuda-public-school.firebaseapp.com",
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    "https://alhuda-public-school-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "alhuda-public-school",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "alhuda-public-school.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "173711616398",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:173711616398:web:c99d1f0e071ef54d8b9cdf",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-E91SQW9YPX",
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let db: Firestore;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

// Collection names
export const COLLECTIONS = {
  TEACHERS: "teachers",
  STUDENTS: "students",
  CLASSES: "classes",
  SUBJECTS: "subjects",
  TIMETABLE: "timetable",
  ATTENDANCE: "attendance",
  RESULTS: "results",
  PENDING_REGISTRATIONS: "pending_registrations",
  SYNC_LOG: "sync_log",
  APP_SETTINGS: "app_settings",
};

// Types for Firebase documents
export interface FirebaseTeacher {
  id: string;
  email: string;
  name: string;
  phone?: string;
  employeeId: string;
  designation?: string;
  profileImage?: string;
  assignedClasses: {
    classId: string;
    className: string;
    sectionId?: string;
    sectionName?: string;
  }[];
  assignedSubjects: {
    subjectId: string;
    subjectName: string;
    classId: string;
    className: string;
  }[];
  isApproved: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSyncedAt: Timestamp;
}

export interface FirebaseStudent {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  rollNo?: number;
  profileImage?: string;
  isActive: boolean;
  lastSyncedAt: Timestamp;
}

export interface FirebaseClass {
  id: string;
  name: string;
  sections: {
    id: string;
    name: string;
  }[];
  lastSyncedAt: Timestamp;
}

export interface FirebaseSubject {
  id: string;
  name: string;
  code?: string;
  classId: string;
  className: string;
  lastSyncedAt: Timestamp;
}

export interface FirebaseTimetable {
  id: string;
  teacherId: string;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  subjectId: string;
  subjectName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  lastSyncedAt: Timestamp;
}

export interface FirebaseAttendance {
  id: string;
  teacherId: string;
  classId: string;
  sectionId?: string;
  subjectId?: string;
  date: string;
  records: {
    studentId: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
    remarks?: string;
  }[];
  createdAt: Timestamp;
  syncedToServer: boolean;
}

export interface FirebaseResult {
  id: string;
  teacherId: string;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  marks: {
    studentId: string;
    studentName: string;
    obtainedMarks: number;
    totalMarks: number;
    isAbsent: boolean;
  }[];
  createdAt: Timestamp;
  syncedToServer: boolean;
}

export interface PendingRegistration {
  id: string;
  email: string;
  displayName: string;
  firebaseUid: string;
  deviceInfo?: string;
  requestedAt: Timestamp;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
}

export interface SyncLog {
  id: string;
  syncType:
    | "FULL"
    | "PARTIAL"
    | "TEACHERS"
    | "STUDENTS"
    | "CLASSES"
    | "ATTENDANCE"
    | "RESULTS";
  direction: "TO_FIREBASE" | "FROM_FIREBASE";
  status: "SUCCESS" | "FAILED" | "IN_PROGRESS";
  recordsProcessed: number;
  recordsFailed: number;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  error?: string;
  initiatedBy: string;
}

// Firebase helper functions
export async function syncTeachersToFirebase(
  teachers: any[]
): Promise<{ success: number; failed: number }> {
  const db = getFirestoreDb();
  let success = 0;
  let failed = 0;

  // First, get all existing teachers in one query to preserve isApproved status
  const existingTeachersMap = new Map<string, any>();
  try {
    const existingDocs = await getDocs(collection(db, COLLECTIONS.TEACHERS));
    existingDocs.forEach((doc) => {
      existingTeachersMap.set(doc.id, doc.data());
    });
  } catch (error) {
    console.error("Failed to fetch existing teachers:", error);
  }

  // Process in batches of 500 (Firestore limit)
  const batchSize = 500;
  const now = Timestamp.now();

  for (let i = 0; i < teachers.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = teachers.slice(i, i + batchSize);

    for (const teacher of chunk) {
      try {
        const teacherRef = doc(db, COLLECTIONS.TEACHERS, teacher.id);
        const existingData = existingTeachersMap.get(teacher.id);
        const isApproved = existingData?.isApproved ?? false;

        const firebaseTeacher: FirebaseTeacher = {
          id: teacher.id,
          email: teacher.email || "",
          name: `${teacher.firstName} ${teacher.lastName}`.trim(),
          phone: teacher.phone || "",
          employeeId: teacher.employeeId || "",
          designation: teacher.designation || "",
          profileImage: teacher.photo || "",
          assignedClasses: (teacher.classSections || []).map((cs: any) => ({
            classId: cs.class?.id || cs.classId,
            className: cs.class?.name || "",
            sectionId: cs.id,
            sectionName: cs.name || "",
          })),
          assignedSubjects: (teacher.subjects || []).map((ts: any) => ({
            subjectId: ts.subject?.id || ts.subjectId,
            subjectName: ts.subject?.name || "",
            classId: ts.class?.id || ts.classId,
            className: ts.class?.name || "",
          })),
          isApproved,
          isActive: teacher.status === "ACTIVE",
          createdAt: existingData?.createdAt || now,
          updatedAt: now,
          lastSyncedAt: now,
        };

        batch.set(teacherRef, firebaseTeacher, { merge: true });
        success++;
      } catch (error) {
        console.error(`Failed to sync teacher ${teacher.id}:`, error);
        failed++;
      }
    }

    await batch.commit();
  }

  return { success, failed };
}

export async function syncStudentsToFirebase(
  students: any[]
): Promise<{ success: number; failed: number }> {
  const db = getFirestoreDb();
  let success = 0;
  let failed = 0;

  // Process in batches of 500 (Firestore limit)
  const batchSize = 500;
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    const chunk = students.slice(i, i + batchSize);

    for (const student of chunk) {
      try {
        const studentRef = doc(db, COLLECTIONS.STUDENTS, student.id);
        const firebaseStudent: FirebaseStudent = {
          id: student.id,
          registrationNo: student.registrationNo || "",
          firstName: student.firstName || "",
          lastName: student.lastName || "",
          classId: student.classId || student.class?.id || "",
          className: student.class?.name || "",
          sectionId: student.sectionId || student.section?.id || "",
          sectionName: student.section?.name || "",
          rollNo: student.rollNo,
          profileImage: student.profileImage || "",
          isActive: student.status === "ACTIVE",
          lastSyncedAt: now,
        };

        batch.set(studentRef, firebaseStudent, { merge: true });
        success++;
      } catch (error) {
        console.error(`Failed to sync student ${student.id}:`, error);
        failed++;
      }
    }

    await batch.commit();
  }

  return { success, failed };
}

export async function syncClassesToFirebase(
  classes: any[]
): Promise<{ success: number; failed: number }> {
  const db = getFirestoreDb();
  let success = 0;
  let failed = 0;

  const batch = writeBatch(db);
  const now = Timestamp.now();

  for (const cls of classes) {
    try {
      const classRef = doc(db, COLLECTIONS.CLASSES, cls.id);
      const firebaseClass: FirebaseClass = {
        id: cls.id,
        name: cls.name || "",
        sections: (cls.sections || []).map((s: any) => ({
          id: s.id,
          name: s.name,
        })),
        lastSyncedAt: now,
      };

      batch.set(classRef, firebaseClass, { merge: true });
      success++;
    } catch (error) {
      console.error(`Failed to sync class ${cls.id}:`, error);
      failed++;
    }
  }

  await batch.commit();
  return { success, failed };
}

export async function syncSubjectsToFirebase(
  subjects: any[]
): Promise<{ success: number; failed: number }> {
  const db = getFirestoreDb();
  let success = 0;
  let failed = 0;

  const batchSize = 500;
  for (let i = 0; i < subjects.length; i += batchSize) {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    const chunk = subjects.slice(i, i + batchSize);

    for (const subject of chunk) {
      try {
        const subjectRef = doc(db, COLLECTIONS.SUBJECTS, subject.id);
        const firebaseSubject: FirebaseSubject = {
          id: subject.id,
          name: subject.name || "",
          code: subject.code || "",
          classId: subject.classId || "",
          className: subject.class?.name || "",
          lastSyncedAt: now,
        };

        batch.set(subjectRef, firebaseSubject, { merge: true });
        success++;
      } catch (error) {
        console.error(`Failed to sync subject ${subject.id}:`, error);
        failed++;
      }
    }

    await batch.commit();
  }

  return { success, failed };
}

export async function getPendingRegistrations(): Promise<
  PendingRegistration[]
> {
  const db = getFirestoreDb();
  const q = query(
    collection(db, COLLECTIONS.PENDING_REGISTRATIONS),
    where("status", "==", "PENDING")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as PendingRegistration)
  );
}

export async function approveTeacherRegistration(
  registrationId: string,
  teacherId: string,
  approvedBy: string
): Promise<void> {
  const db = getFirestoreDb();
  const now = Timestamp.now();

  // Update pending registration status
  const regRef = doc(db, COLLECTIONS.PENDING_REGISTRATIONS, registrationId);
  await updateDoc(regRef, {
    status: "APPROVED",
    reviewedBy: approvedBy,
    reviewedAt: now,
  });

  // Update teacher's approval status
  const teacherRef = doc(db, COLLECTIONS.TEACHERS, teacherId);
  await updateDoc(teacherRef, {
    isApproved: true,
    updatedAt: now,
  });
}

export async function rejectTeacherRegistration(
  registrationId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  const db = getFirestoreDb();
  const now = Timestamp.now();

  const regRef = doc(db, COLLECTIONS.PENDING_REGISTRATIONS, registrationId);
  await updateDoc(regRef, {
    status: "REJECTED",
    reviewedBy: rejectedBy,
    reviewedAt: now,
    rejectionReason: reason,
  });
}

export async function syncAttendanceFromFirebase(): Promise<
  FirebaseAttendance[]
> {
  const db = getFirestoreDb();
  const q = query(
    collection(db, COLLECTIONS.ATTENDANCE),
    where("syncedToServer", "==", false)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as FirebaseAttendance)
  );
}

export async function markAttendanceSynced(
  attendanceIds: string[]
): Promise<void> {
  const db = getFirestoreDb();
  const batch = writeBatch(db);

  for (const id of attendanceIds) {
    const ref = doc(db, COLLECTIONS.ATTENDANCE, id);
    batch.update(ref, { syncedToServer: true });
  }

  await batch.commit();
}

export async function deleteOldAttendanceRecords(
  daysOld: number = 7
): Promise<number> {
  const db = getFirestoreDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const q = query(
    collection(db, COLLECTIONS.ATTENDANCE),
    where("syncedToServer", "==", true),
    where("createdAt", "<", Timestamp.fromDate(cutoffDate))
  );

  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  let count = 0;

  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
    count++;
  });

  if (count > 0) {
    await batch.commit();
  }

  return count;
}

export async function syncResultsFromFirebase(): Promise<FirebaseResult[]> {
  const db = getFirestoreDb();
  const q = query(
    collection(db, COLLECTIONS.RESULTS),
    where("syncedToServer", "==", false)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as FirebaseResult)
  );
}

export async function markResultsSynced(resultIds: string[]): Promise<void> {
  const db = getFirestoreDb();
  const batch = writeBatch(db);

  for (const id of resultIds) {
    const ref = doc(db, COLLECTIONS.RESULTS, id);
    batch.update(ref, { syncedToServer: true });
  }

  await batch.commit();
}

export async function deleteOldResultRecords(
  daysOld: number = 7
): Promise<number> {
  const db = getFirestoreDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const q = query(
    collection(db, COLLECTIONS.RESULTS),
    where("syncedToServer", "==", true),
    where("createdAt", "<", Timestamp.fromDate(cutoffDate))
  );

  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  let count = 0;

  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
    count++;
  });

  if (count > 0) {
    await batch.commit();
  }

  return count;
}

export async function createSyncLog(log: Omit<SyncLog, "id">): Promise<string> {
  const db = getFirestoreDb();
  const logRef = doc(collection(db, COLLECTIONS.SYNC_LOG));
  await setDoc(logRef, log);
  return logRef.id;
}

export async function updateSyncLog(
  logId: string,
  updates: Partial<SyncLog>
): Promise<void> {
  const db = getFirestoreDb();
  const logRef = doc(db, COLLECTIONS.SYNC_LOG, logId);
  await updateDoc(logRef, updates);
}

export async function getRecentSyncLogs(
  limit: number = 10
): Promise<SyncLog[]> {
  const db = getFirestoreDb();
  const snapshot = await getDocs(collection(db, COLLECTIONS.SYNC_LOG));
  const logs = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as SyncLog)
  );
  return logs
    .sort((a, b) => b.startedAt.toMillis() - a.startedAt.toMillis())
    .slice(0, limit);
}
