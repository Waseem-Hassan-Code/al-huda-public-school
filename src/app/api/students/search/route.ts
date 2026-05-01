import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/students/search?q=Muhammad&limit=3&offset=0
 *
 * Search rules:
 *   Single token   → firstName ILIKE '%token%'
 *   Multiple tokens → (firstName ILIKE '%first%' AND lastName ILIKE '%rest%')
 *                      OR firstName ILIKE '%full query%'   ← compound first names
 *
 * Returns { students, total } so the UI can show "+ N others" without an
 * extra round-trip. Default limit = 3 (dropdown preview). Callers paginate
 * via offset to lazy-load the full list in a modal.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "3"), 20);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    if (q.length < 2) {
      return NextResponse.json({ students: [], total: 0 });
    }

    const tokens = q.split(/\s+/).filter(Boolean);

    // ── Name-match condition (never searches lastName in isolation) ───────────
    const nameCondition =
      tokens.length === 1
        ? { firstName: { contains: tokens[0], mode: "insensitive" as const } }
        : {
            OR: [
              {
                AND: [
                  { firstName: { contains: tokens[0], mode: "insensitive" as const } },
                  { lastName: { contains: tokens.slice(1).join(" "), mode: "insensitive" as const } },
                ],
              },
              // Handles compound first names stored entirely in firstName
              { firstName: { contains: q, mode: "insensitive" as const } },
            ],
          };

    const where = {
      status: { in: ["ACTIVE", "INACTIVE"] as const },
      AND: [nameCondition],
    };

    const select = {
      id: true,
      registrationNo: true,
      firstName: true,
      lastName: true,
      photo: true,
      dateOfBirth: true,
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      status: true,
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select,
        take: limit,
        skip: offset,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({ students, total });
  } catch (error) {
    console.error("Student search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
