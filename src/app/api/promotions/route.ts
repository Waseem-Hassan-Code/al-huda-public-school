import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

type PromotionAction = "PROMOTE" | "RETAIN" | "GRADUATE" | "LEAVE";
const ACTIONS: PromotionAction[] = ["PROMOTE", "RETAIN", "GRADUATE", "LEAVE"];

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!hasPermission(session.user.role as string, Permission.PROMOTE_STUDENT)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

// GET ?fromAcademicYearId=...  Students still waiting to be processed in that
// session (status ACTIVE), grouped by class, plus how many were already processed.
export async function GET(request: NextRequest) {
  const { error } = await authorize();
  if (error) return error;

  const fromAcademicYearId = request.nextUrl.searchParams.get("fromAcademicYearId");
  if (!fromAcademicYearId) {
    return NextResponse.json({ error: "fromAcademicYearId is required" }, { status: 400 });
  }

  try {
    const [classes, students, processed] = await Promise.all([
      prisma.class.findMany({
        where: { isActive: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          displayOrder: true,
          sections: { where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } },
        },
      }),
      prisma.student.findMany({
        where: { academicYearId: fromAcademicYearId, status: "ACTIVE" },
        orderBy: [{ rollNo: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          registrationNo: true,
          rollNo: true,
          firstName: true,
          lastName: true,
          photo: true,
          classId: true,
          sectionId: true,
          section: { select: { name: true } },
        },
      }),
      prisma.promotionHistory.groupBy({
        by: ["action"],
        where: { fromAcademicYearId },
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      classes: classes.map((c) => ({
        ...c,
        students: students.filter((s) => s.classId === c.id),
      })),
      unassigned: students.filter((s) => !s.classId || !classes.some((c) => c.id === s.classId)),
      processed: Object.fromEntries(processed.map((p) => [p.action, p._count._all])),
    });
  } catch (err) {
    console.error("Promotions GET Error:", err);
    return NextResponse.json({ error: "Failed to load students" }, { status: 500 });
  }
}

// POST { fromAcademicYearId, toAcademicYearId, items: [{ studentId, action, toClassId?, toSectionId? }] }
// PROMOTE / RETAIN move the student into the new session (new or same class).
// GRADUATE / LEAVE keep them in the old session and change their status.
// Unpaid fee vouchers belong to the student, so balances carry over automatically.
export async function POST(request: NextRequest) {
  const { session, error } = await authorize();
  if (error) return error;

  try {
    const { fromAcademicYearId, toAcademicYearId, items } = await request.json();

    if (!fromAcademicYearId || !toAcademicYearId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Sessions and at least one student are required" }, { status: 400 });
    }
    if (fromAcademicYearId === toAcademicYearId) {
      return NextResponse.json({ error: "The new session must be different from the current one" }, { status: 400 });
    }

    const [fromSession, toSession] = await Promise.all([
      prisma.academicYear.findUnique({ where: { id: fromAcademicYearId } }),
      prisma.academicYear.findUnique({ where: { id: toAcademicYearId } }),
    ]);
    if (!fromSession || !toSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!toSession.isActive) {
      return NextResponse.json({ error: `Session ${toSession.name} is closed` }, { status: 400 });
    }

    for (const item of items) {
      if (!item?.studentId || !ACTIONS.includes(item.action)) {
        return NextResponse.json({ error: "Each student needs a valid action" }, { status: 400 });
      }
      if (item.action === "PROMOTE" && !item.toClassId) {
        return NextResponse.json({ error: "Choose the class to promote into" }, { status: 400 });
      }
    }

    const studentIds: string[] = items.map((i: { studentId: string }) => i.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, academicYearId: fromAcademicYearId, status: "ACTIVE" },
      select: { id: true, classId: true, sectionId: true, firstName: true, lastName: true, registrationNo: true },
    });
    const byId = new Map(students.map((s) => [s.id, s]));
    const skipped = studentIds.filter((id) => !byId.has(id)).length;

    const summary = { PROMOTE: 0, RETAIN: 0, GRADUATE: 0, LEAVE: 0 } as Record<PromotionAction, number>;

    await prisma.$transaction(
      async (tx) => {
        // Next roll number per class in the new session
        const rollCounters = new Map<string, number>();
        const nextRoll = async (classId: string) => {
          if (!rollCounters.has(classId)) {
            rollCounters.set(
              classId,
              await tx.student.count({ where: { classId, academicYearId: toAcademicYearId } })
            );
          }
          const n = rollCounters.get(classId)! + 1;
          rollCounters.set(classId, n);
          return String(n).padStart(3, "0");
        };

        for (const item of items as {
          studentId: string;
          action: PromotionAction;
          toClassId?: string;
          toSectionId?: string;
        }[]) {
          const student = byId.get(item.studentId);
          if (!student) continue;

          let toClassId = student.classId ?? "";
          let toSectionId: string | null = student.sectionId;
          let historySessionId = fromAcademicYearId;

          if (item.action === "PROMOTE" || item.action === "RETAIN") {
            toClassId = item.action === "PROMOTE" ? item.toClassId! : item.toClassId || student.classId || "";
            toSectionId = item.toSectionId || null;
            historySessionId = toAcademicYearId;
            await tx.student.update({
              where: { id: student.id },
              data: {
                academicYearId: toAcademicYearId,
                classId: toClassId || null,
                sectionId: toSectionId,
                rollNo: toClassId ? await nextRoll(toClassId) : null,
                updatedById: session!.user.id,
              },
            });
          } else {
            await tx.student.update({
              where: { id: student.id },
              data: {
                status: item.action === "GRADUATE" ? "GRADUATED" : "TRANSFERRED",
                statusDate: new Date(),
                statusReason:
                  item.action === "GRADUATE"
                    ? `Graduated at the end of session ${fromSession.name}`
                    : `Left at the end of session ${fromSession.name}`,
                updatedById: session!.user.id,
              },
            });
          }

          await tx.promotionHistory.create({
            data: {
              studentId: student.id,
              fromClassId: student.classId,
              fromSectionId: student.sectionId,
              toClassId,
              toSectionId,
              academicYearId: historySessionId,
              fromAcademicYearId,
              action:
                item.action === "PROMOTE"
                  ? "PROMOTED"
                  : item.action === "RETAIN"
                    ? "RETAINED"
                    : item.action === "GRADUATE"
                      ? "GRADUATED"
                      : "LEFT",
              promotedById: session!.user.id,
            },
          });
          summary[item.action]++;
        }
      },
      { timeout: 60000 }
    );

    await logTransaction({
      action: "PROMOTE",
      entityType: "STUDENT",
      entityId: toAcademicYearId,
      userId: session!.user.id,
      details: { from: fromSession.name, to: toSession.name, ...summary, skipped },
    });

    return NextResponse.json({ success: true, summary, skipped });
  } catch (err) {
    console.error("Promotions POST Error:", err);
    return NextResponse.json({ error: "Failed to process students" }, { status: 500 });
  }
}
