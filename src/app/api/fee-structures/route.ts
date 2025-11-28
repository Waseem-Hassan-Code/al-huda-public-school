import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - List fee structures
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get("classId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (classId) {
      where.OR = [
        { classId: classId },
        { classId: null }, // Global fees apply to all classes
      ];
    }

    const feeStructures = await prisma.feeStructure.findMany({
      where,
      include: {
        class: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: feeStructures,
    });
  } catch (error) {
    console.error("Fee Structures GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fee structures" },
      { status: 500 }
    );
  }
}

// POST - Create new fee structure
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.MANAGE_FEE_STRUCTURE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, amount, frequency, classId, dueDay } = body;

    const feeStructure = await prisma.feeStructure.create({
      data: {
        name,
        description,
        amount,
        frequency: frequency || "MONTHLY",
        classId: classId || null,
        dueDay: dueDay || 10,
        isActive: true,
      },
      include: {
        class: true,
      },
    });

    // Log the transaction
    await logTransaction({
      action: "CREATE",
      entityType: "FeeStructure",
      entityId: feeStructure.id,
      userId: session.user.id,
      details: { name, amount },
    });

    return NextResponse.json(feeStructure, { status: 201 });
  } catch (error) {
    console.error("Fee Structures POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create fee structure" },
      { status: 500 }
    );
  }
}
