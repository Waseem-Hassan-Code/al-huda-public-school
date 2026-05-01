import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/parents - list all parents (paginated)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [parents, total] = await Promise.all([
      prisma.parent.findMany({
        include: {
          students: {
            select: {
              id: true,
              registrationNo: true,
              firstName: true,
              lastName: true,
              status: true,
              class: { select: { name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.parent.count(),
    ]);

    return NextResponse.json({ parents, total, page, limit });
  } catch (error) {
    console.error("Parents GET error:", error);
    return NextResponse.json({ error: "Failed to fetch parents" }, { status: 500 });
  }
}

// POST /api/parents - create a new parent record
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, cnic, phone, whatsapp, email, occupation, address, city } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "name and phone are required" },
        { status: 400 }
      );
    }

    // If CNIC provided, check for existing parent first
    if (cnic) {
      const existing = await prisma.parent.findFirst({
        where: { cnic: { equals: cnic.trim(), mode: "insensitive" } },
        include: {
          students: {
            select: {
              id: true,
              registrationNo: true,
              firstName: true,
              lastName: true,
              class: { select: { name: true } },
            },
          },
        },
      });
      if (existing) {
        return NextResponse.json(
          { parent: existing, existing: true },
          { status: 200 }
        );
      }
    }

    const parent = await prisma.parent.create({
      data: {
        name: name.trim(),
        cnic: cnic?.trim() || null,
        phone: phone.trim(),
        whatsapp: whatsapp?.trim() || null,
        email: email?.trim().toLowerCase() || null,
        occupation: occupation?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
      },
      include: {
        students: true,
      },
    });

    return NextResponse.json({ parent, existing: false }, { status: 201 });
  } catch (error) {
    console.error("Parent POST error:", error);
    return NextResponse.json({ error: "Failed to create parent" }, { status: 500 });
  }
}
