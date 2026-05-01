import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/parents/search?cnic=12345-6789012-3&name=Ali+Ahmed
 *
 * Primary match: exact CNIC (case-insensitive, strips hyphens for comparison)
 * Secondary match: name ILIKE (if no CNIC or no CNIC match)
 *
 * Also searches students.guardianCnic as a fallback for parents not yet in the
 * parents table (legacy data).
 *
 * Returns the matched parent plus their linked students (siblings).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cnic = searchParams.get("cnic")?.trim() || "";
    const name = searchParams.get("name")?.trim() || "";

    if (!cnic && !name) {
      return NextResponse.json({ parent: null, siblings: [], legacySiblings: [] });
    }

    const siblingSelect = {
      id: true,
      registrationNo: true,
      firstName: true,
      lastName: true,
      photo: true,
      status: true,
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    };

    // ── 1. Try exact CNIC match against parents table ──────────────────────
    if (cnic) {
      const parent = await prisma.parent.findFirst({
        where: { cnic: { equals: cnic, mode: "insensitive" } },
        include: {
          students: { select: siblingSelect },
        },
      });

      if (parent) {
        return NextResponse.json({
          parent,
          siblings: parent.students,
          legacySiblings: [],
          matchedBy: "cnic",
        });
      }

      // ── 2. Fallback: match CNIC against legacy guardianCnic on students ──
      const legacyStudents = await prisma.student.findMany({
        where: {
          guardianCnic: { equals: cnic, mode: "insensitive" },
          status: { in: ["ACTIVE", "INACTIVE"] },
        },
        select: siblingSelect,
      });

      if (legacyStudents.length > 0) {
        // Build a synthetic parent object from the first match
        const first = await prisma.student.findFirst({
          where: { guardianCnic: { equals: cnic, mode: "insensitive" } },
          select: {
            guardianName: true,
            guardianCnic: true,
            guardianPhone: true,
            guardianWhatsapp: true,
            guardianEmail: true,
            guardianOccupation: true,
            guardianAddress: true,
            city: true,
          },
        });

        return NextResponse.json({
          parent: null,
          syntheticParent: first
            ? {
                name: first.guardianName,
                cnic: first.guardianCnic,
                phone: first.guardianPhone,
                whatsapp: first.guardianWhatsapp,
                email: first.guardianEmail,
                occupation: first.guardianOccupation,
                address: first.guardianAddress,
                city: first.city,
              }
            : null,
          siblings: [],
          legacySiblings: legacyStudents,
          matchedBy: "legacy_cnic",
        });
      }
    }

    // ── 3. Name-based match (secondary) ─────────────────────────────────────
    if (name && name.length >= 2) {
      const parents = await prisma.parent.findMany({
        where: { name: { contains: name, mode: "insensitive" } },
        include: { students: { select: siblingSelect } },
        take: 3,
      });

      if (parents.length > 0) {
        return NextResponse.json({
          parent: parents[0],
          siblings: parents[0].students,
          legacySiblings: [],
          matchedBy: "name",
          otherMatches: parents.slice(1),
        });
      }

      // Legacy name match
      const legacyStudents = await prisma.student.findMany({
        where: {
          guardianName: { contains: name, mode: "insensitive" },
          status: { in: ["ACTIVE", "INACTIVE"] },
        },
        select: siblingSelect,
        take: 5,
      });

      if (legacyStudents.length > 0) {
        return NextResponse.json({
          parent: null,
          syntheticParent: null,
          siblings: [],
          legacySiblings: legacyStudents,
          matchedBy: "legacy_name",
        });
      }
    }

    return NextResponse.json({ parent: null, siblings: [], legacySiblings: [], matchedBy: null });
  } catch (error) {
    console.error("Parent search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
