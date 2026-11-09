// Sibling linking by guardian CNIC.
//
// Siblings share one Parent (family) record. Admission links a new student to
// an existing family when the guardian CNIC matches; this does the same when a
// student's guardian CNIC is added or changed later (e.g. on the edit page).

/** "35202-1234567-1", "3520212345671" → "3520212345671" */
export function cnicDigits(cnic: string | null | undefined): string {
  return (cnic || "").replace(/\D/g, "");
}

/** Both spellings a CNIC may be stored in (with and without dashes). */
function cnicVariants(cnic: string): string[] {
  const d = cnicDigits(cnic);
  const masked = d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : cnic.trim();
  return [...new Set([cnic.trim(), d, masked].filter(Boolean))];
}

export interface FamilyLinkResult {
  parentId: string | null;
  /** True when the student joined a different family than before */
  changed: boolean;
  /** Other students now in the same family */
  siblingCount: number;
  /** Students without a family that were linked into it now */
  newlyLinked: number;
}

/**
 * Puts a student in the family that matches their guardian CNIC.
 *
 * Which family:
 *  1. A family (Parent) that already has this CNIC. The student's own family
 *     wins if it has it.
 *  2. The student's own family, if it has no CNIC yet or nobody else is in it
 *     (the CNIC is set on it).
 *  3. The family of another student with the same guardian CNIC.
 *  4. Otherwise a new family is created from the student's guardian details.
 * Other students with the same guardian CNIC and no family yet are linked too.
 * Students already in a different family are never moved by this.
 *
 * `tx` is a Prisma transaction client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function linkFamilyByCnic(tx: any, studentId: string): Promise<FamilyLinkResult> {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      parentId: true,
      guardianCnic: true,
      guardianName: true,
      fatherName: true,
      guardianPhone: true,
      guardianWhatsapp: true,
      guardianEmail: true,
      guardianOccupation: true,
      guardianAddress: true,
      city: true,
    },
  });
  if (!student) return { parentId: null, changed: false, siblingCount: 0, newlyLinked: 0 };

  const digits = cnicDigits(student.guardianCnic);
  // Incomplete CNICs are not used for matching
  if (digits.length !== 13) {
    return { parentId: student.parentId, changed: false, siblingCount: 0, newlyLinked: 0 };
  }
  const variants = cnicVariants(student.guardianCnic);

  // 1. Families that already have this CNIC
  const matchingParents: { id: string }[] = await tx.parent.findMany({
    where: { cnic: { in: variants } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  let targetId: string | null =
    matchingParents.find((p) => p.id === student.parentId)?.id ?? matchingParents[0]?.id ?? null;

  // 2. Own family, if it has no CNIC yet or this student is its only member:
  //    give it the CNIC (keeps the student with their current siblings)
  if (!targetId && student.parentId) {
    const own = await tx.parent.findUnique({ where: { id: student.parentId }, select: { cnic: true } });
    const others = await tx.student.count({ where: { parentId: student.parentId, id: { not: student.id } } });
    if (!cnicDigits(own?.cnic) || others === 0) {
      await tx.parent.update({ where: { id: student.parentId }, data: { cnic: student.guardianCnic } });
      targetId = student.parentId;
    }
  }

  // 3. Family of another student with the same guardian CNIC
  if (!targetId) {
    const other = await tx.student.findFirst({
      where: { id: { not: student.id }, guardianCnic: { in: variants }, parentId: { not: null } },
      select: { parentId: true },
      orderBy: { createdAt: "asc" },
    });
    targetId = other?.parentId ?? null;
  }

  // 4. New family from this student's guardian details
  if (!targetId) {
    const created = await tx.parent.create({
      data: {
        name: (student.guardianName || student.fatherName || "Guardian").trim() || "Guardian",
        cnic: student.guardianCnic,
        phone: student.guardianPhone || "",
        whatsapp: student.guardianWhatsapp || null,
        email: student.guardianEmail || null,
        occupation: student.guardianOccupation || null,
        address: student.guardianAddress || null,
        city: student.city || null,
      },
      select: { id: true },
    });
    targetId = created.id;
  }

  const changed = targetId !== student.parentId;
  if (changed) {
    await tx.student.update({ where: { id: student.id }, data: { parentId: targetId } });
  }

  // Link students with the same guardian CNIC that have no family yet
  const linked = await tx.student.updateMany({
    where: { id: { not: student.id }, guardianCnic: { in: variants }, parentId: null },
    data: { parentId: targetId },
  });

  const siblingCount = await tx.student.count({ where: { parentId: targetId, id: { not: student.id } } });
  return { parentId: targetId, changed, siblingCount, newlyLinked: linked.count };
}
