import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logUpdate, logDelete } from "@/lib/transaction-log";
import {
  upsertStudentInFirebase,
  updateStudentIdentityEmail,
  deleteStudentFromFirebase,
  setStudentMobileAccess,
} from "@/lib/firebase";
import { linkFamilyByCnic, FamilyLinkResult } from "@/lib/family-link";

// GET - Get single student by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_STUDENTS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        section: true,
        academicYear: true,
        parent: {
          include: {
            students: {
              where: { id: { not: id } }, // siblings only, exclude self
              select: {
                id: true,
                registrationNo: true,
                firstName: true,
                lastName: true,
                photo: true,
                status: true,
                class: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
              },
            },
          },
        },
        feeVouchers: {
          orderBy: { dueDate: "desc" },
          take: 12,
          include: {
            payments: true,
            feeItems: true,
          },
        },
        attendance: {
          orderBy: { date: "desc" },
          take: 30,
        },
        studentMarks: {
          include: {
            exam: true,
            subject: true,
          },
          orderBy: { exam: { examDate: "desc" } },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("Student GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student" },
      { status: 500 }
    );
  }
}

// PUT - Update student
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.UPDATE_STUDENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      fatherName,
      motherName,
      dateOfBirth,
      gender,
      cnic,
      religion,
      nationality,
      bloodGroup,
      address,
      city,
      phone,
      email,
      photo,
      classId,
      sectionId,
      status,
      monthlyFee,
      // Guardian fields
      guardianName,
      guardianRelation,
      guardianCnic,
      guardianPhone,
      guardianWhatsapp,
      guardianPhone2,
      guardianEmail,
      guardianOccupation,
      guardianAddress,
      guardianMonthlyIncome,
      // Also update the shared family (Parent) record and siblings' guardian details
      applyToFamily,
    } = body;

    // Build update data object, only including defined fields
    const updateData: Record<string, any> = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (fatherName !== undefined) updateData.fatherName = fatherName;
    if (motherName !== undefined) updateData.motherName = motherName;
    if (dateOfBirth !== undefined)
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined) updateData.gender = gender;
    if (cnic !== undefined) updateData.cnic = cnic;
    if (religion !== undefined) updateData.religion = religion;
    if (nationality !== undefined) updateData.nationality = nationality;
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup || null;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (photo !== undefined) updateData.photo = photo;
    if (classId !== undefined) updateData.classId = classId || null;
    if (sectionId !== undefined) updateData.sectionId = sectionId || null;
    if (status !== undefined) updateData.status = status;
    if (monthlyFee !== undefined)
      updateData.monthlyFee = parseFloat(monthlyFee) || 0;

    // Guardian fields
    if (guardianName !== undefined) updateData.guardianName = guardianName;
    if (guardianRelation !== undefined)
      updateData.guardianRelation = guardianRelation;
    if (guardianCnic !== undefined) updateData.guardianCnic = guardianCnic;
    if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone;
    if (guardianWhatsapp !== undefined)
      updateData.guardianWhatsapp = guardianWhatsapp;
    if (guardianPhone2 !== undefined)
      updateData.guardianPhone2 = guardianPhone2;
    if (guardianEmail !== undefined) updateData.guardianEmail = guardianEmail;
    if (guardianOccupation !== undefined)
      updateData.guardianOccupation = guardianOccupation;
    if (guardianAddress !== undefined)
      updateData.guardianAddress = guardianAddress;
    if (guardianMonthlyIncome !== undefined)
      updateData.guardianMonthlyIncome = guardianMonthlyIncome;

    const result = await prisma.$transaction(async (tx: any) => {
      // Update student with only provided fields
      const student = await tx.student.update({
        where: { id },
        data: updateData,
        include: {
          class: true,
          section: true,
          academicYear: true,
        },
      });

      // Siblings share one Parent record. When asked, keep it and the siblings'
      // own guardian details in line with this student's guardian details.
      let siblingIds: string[] = [];
      if (applyToFamily && student.parentId) {
        const parentData: Record<string, any> = {};
        if (guardianName !== undefined && String(guardianName).trim())
          parentData.name = String(guardianName).trim();
        if (guardianCnic !== undefined) parentData.cnic = guardianCnic || null;
        if (guardianPhone !== undefined) parentData.phone = guardianPhone || "";
        if (guardianWhatsapp !== undefined) parentData.whatsapp = guardianWhatsapp || null;
        if (guardianEmail !== undefined) parentData.email = guardianEmail || null;
        if (guardianOccupation !== undefined) parentData.occupation = guardianOccupation || null;
        if (guardianAddress !== undefined) parentData.address = guardianAddress || null;
        if (Object.keys(parentData).length > 0) {
          await tx.parent.update({ where: { id: student.parentId }, data: parentData });
        }

        const siblingData: Record<string, any> = {};
        for (const key of [
          "guardianName",
          "guardianRelation",
          "guardianCnic",
          "guardianPhone",
          "guardianWhatsapp",
          "guardianPhone2",
          "guardianEmail",
          "guardianOccupation",
          "guardianAddress",
          "fatherName",
          "motherName",
        ]) {
          if (updateData[key] !== undefined) siblingData[key] = updateData[key];
        }
        const siblings = await tx.student.findMany({
          where: { parentId: student.parentId, id: { not: id } },
          select: { id: true },
        });
        siblingIds = siblings.map((s: { id: string }) => s.id);
        if (siblingIds.length > 0 && Object.keys(siblingData).length > 0) {
          await tx.student.updateMany({ where: { id: { in: siblingIds } }, data: siblingData });
        }
      }

      // Sibling link: put the student in the family matching their guardian
      // CNIC (same as admission does), whenever the CNIC is saved.
      let family: FamilyLinkResult | null = null;
      if (guardianCnic !== undefined && guardianCnic) {
        family = await linkFamilyByCnic(tx, id);
      }

      return { student, siblingIds, family };
    });
    const { student: updatedStudent, siblingIds, family } = result;

    // Log the transaction
    await logUpdate(
      "STUDENT",
      id,
      {},
      { firstName, lastName },
      session.user.id
    );

    // Sync updated student (and any updated siblings) to Firebase (fire-and-forget)
    upsertStudentInFirebase(updatedStudent).catch((err) =>
      console.error("Firebase student sync failed (non-critical):", err)
    );
    if (siblingIds.length > 0) {
      prisma.student
        .findMany({
          where: { id: { in: siblingIds } },
          include: { class: true, section: true, academicYear: true },
        })
        .then((sibs) => Promise.all(sibs.map((s) => upsertStudentInFirebase(s))))
        .catch((err) => console.error("Firebase sibling sync failed (non-critical):", err));
    }

    // If email changed, keep the identity doc in sync (fire-and-forget)
    if (email !== undefined) {
      updateStudentIdentityEmail(id, email).catch((err) =>
        console.error("Firebase identity email sync failed (non-critical):", err)
      );
    }

    return NextResponse.json({
      ...updatedStudent,
      parentId: family?.parentId ?? updatedStudent.parentId,
      siblingsUpdated: siblingIds.length,
      family,
    });
  } catch (error) {
    console.error("Student PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    );
  }
}

// PATCH - Archive or restore a student
// Body: { action: "archive" | "restore", reason?: string }
// Archive keeps every record but deactivates the student: status INACTIVE,
// hidden from the default students list, no new monthly fee vouchers, and no
// mobile app login. Restore makes them active again.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(session.user.role, Permission.UPDATE_STUDENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action, reason } = await request.json();
    if (action !== "archive" && action !== "restore") {
      return NextResponse.json({ error: 'action must be "archive" or "restore"' }, { status: 400 });
    }

    const existing = await prisma.student.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const archive = action === "archive";
    const student = await prisma.student.update({
      where: { id },
      data: archive
        ? {
            status: "INACTIVE",
            isActive: false,
            statusReason: (reason && String(reason).trim()) || "Archived",
            statusDate: new Date(),
            updatedById: session.user.id,
          }
        : {
            status: "ACTIVE",
            isActive: true,
            statusReason: null,
            statusDate: new Date(),
            updatedById: session.user.id,
          },
      include: { class: true, section: true, academicYear: true },
    });

    await logUpdate(
      "STUDENT",
      id,
      { status: existing.status },
      { status: student.status, action, reason: reason || null },
      session.user.id
    );

    // Mobile app: reflect status and allow / block login (fire-and-forget)
    upsertStudentInFirebase(student).catch((err) =>
      console.error("Firebase student sync failed (non-critical):", err)
    );
    setStudentMobileAccess(id, !archive).catch((err) =>
      console.error("Firebase mobile access update failed (non-critical):", err)
    );

    return NextResponse.json({
      message: archive ? "Student archived" : "Student restored",
      student,
    });
  } catch (error) {
    console.error("Student PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

// What a permanent delete removes, per table
async function deletionCounts(id: string) {
  const [feeVouchers, payments, attendance, marks, complaints, messages, subjects, promotions] =
    await Promise.all([
      prisma.feeVoucher.count({ where: { studentId: id } }),
      prisma.payment.count({ where: { studentId: id } }),
      prisma.attendance.count({ where: { studentId: id } }),
      prisma.studentMark.count({ where: { studentId: id } }),
      prisma.complaint.count({ where: { studentId: id } }),
      prisma.message.count({ where: { studentId: id } }),
      prisma.studentSubject.count({ where: { studentId: id } }),
      prisma.promotionHistory.count({ where: { studentId: id } }),
    ]);
  return { feeVouchers, payments, attendance, marks, complaints, messages, subjects, promotions };
}

// DELETE - Permanently delete a student and everything linked to them.
//   ?preview=1            → only returns what would be deleted
//   ?confirm=<regNo>      → required to actually delete (guards against accidental calls)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.DELETE_STUDENT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true, registrationNo: true, firstName: true, lastName: true, parentId: true },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const searchParams = request.nextUrl.searchParams;
    const counts = await deletionCounts(id);
    const familyOthers = student.parentId
      ? await prisma.student.count({ where: { parentId: student.parentId, id: { not: id } } })
      : 0;

    if (searchParams.get("preview") === "1") {
      return NextResponse.json({
        student,
        counts,
        removesFamilyRecord: !!student.parentId && familyOthers === 0,
      });
    }

    if (searchParams.get("confirm") !== student.registrationNo) {
      return NextResponse.json(
        { error: "Type the student's registration number to confirm the permanent delete" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      async (tx) => {
        // Fees: payments first (they point at vouchers), then vouchers (items cascade)
        await tx.payment.deleteMany({ where: { studentId: id } });
        await tx.feeVoucher.updateMany({ where: { studentId: id }, data: { previousVoucherId: null } });
        await tx.feeVoucher.deleteMany({ where: { studentId: id } });
        await tx.attendance.deleteMany({ where: { studentId: id } });
        await tx.studentMark.deleteMany({ where: { studentId: id } });
        await tx.complaint.deleteMany({ where: { studentId: id } });
        await tx.message.deleteMany({ where: { studentId: id } });
        // Subject enrolments and promotion history are removed with the student (cascade)
        await tx.student.delete({ where: { id } });
        // Family record with no students left
        if (student.parentId && familyOthers === 0) {
          await tx.parent.delete({ where: { id: student.parentId } });
        }
      },
      { timeout: 30000 }
    );

    await logDelete(
      "STUDENT",
      id,
      {
        registrationNo: student.registrationNo,
        name: `${student.firstName} ${student.lastName}`.trim(),
        permanent: true,
        removed: counts,
      },
      session.user.id
    );

    // Remove from the mobile app too (fire-and-forget)
    deleteStudentFromFirebase(id).catch((err) =>
      console.error("Firebase student delete failed (non-critical):", err)
    );

    return NextResponse.json({ message: "Student permanently deleted", removed: counts });
  } catch (error) {
    console.error("Student DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 }
    );
  }
}
