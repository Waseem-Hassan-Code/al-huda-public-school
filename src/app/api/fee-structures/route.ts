import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import { FeeType } from "@prisma/client";

// GET - List fee structures
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const feeTypesOnly = searchParams.get("feeTypes") === "true";

    // Return just fee types if requested
    if (feeTypesOnly) {
      const feeTypeValues = Object.values(FeeType);
      // Format fee types as objects with id and name for the dropdown
      const feeTypes = feeTypeValues.map((type) => ({
        id: type,
        name: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      }));
      return NextResponse.json({ feeTypes });
    }

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
      feeStructures,
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
    const {
      name,
      description,
      amount,
      feeType,
      feeTypeId, // Frontend sends this
      academicYearId,
      academicYear, // Frontend sends this as string like "2025"
      classId,
      dueDay,
      lateFeeAmount,
      lateFeeAfterDays,
      isRecurring,
      frequency,
      isOptional,
      isActive,
    } = body;

    // Use feeTypeId if feeType is not provided (frontend compatibility)
    const finalFeeType = feeType || feeTypeId;

    // If academicYear is provided as string (e.g., "2025"), find or use the academicYearId
    let finalAcademicYearId = academicYearId;
    if (!finalAcademicYearId && academicYear) {
      // Find the academic year by the year string
      const academicYearRecord = await prisma.academicYear.findFirst({
        where: {
          OR: [
            { name: { contains: academicYear } },
            {
              startDate: {
                gte: new Date(`${academicYear}-01-01`),
                lt: new Date(`${parseInt(academicYear) + 1}-01-01`),
              },
            },
          ],
        },
        orderBy: { startDate: "desc" },
      });

      if (academicYearRecord) {
        finalAcademicYearId = academicYearRecord.id;
      } else {
        // If no academic year found, get the current/active one
        const currentAcademicYear = await prisma.academicYear.findFirst({
          where: { isCurrent: true },
        });
        if (currentAcademicYear) {
          finalAcademicYearId = currentAcademicYear.id;
        }
      }
    }

    if (!name || !amount || !finalFeeType) {
      return NextResponse.json(
        { error: "Name, amount, and fee type are required" },
        { status: 400 }
      );
    }

    if (!finalAcademicYearId) {
      return NextResponse.json(
        {
          error:
            "No academic year found. Please create an academic year first.",
        },
        { status: 400 }
      );
    }

    const feeStructure = await prisma.feeStructure.create({
      data: {
        name,
        description,
        amount: parseFloat(amount.toString()),
        feeType: finalFeeType,
        academicYearId: finalAcademicYearId,
        classId: classId || null,
        dueDay: dueDay || 10,
        lateFeeAmount: lateFeeAmount || 0,
        lateFeeAfterDays: lateFeeAfterDays || 15,
        isRecurring:
          isRecurring ||
          frequency === "MONTHLY" ||
          frequency === "QUARTERLY" ||
          frequency === "YEARLY",
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        class: true,
        academicYear: true,
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

// DELETE - Delete fee structure
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.MANAGE_FEE_STRUCTURE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Fee structure ID is required" },
        { status: 400 }
      );
    }

    // Check if fee structure exists
    const existingStructure = await prisma.feeStructure.findUnique({
      where: { id },
    });

    if (!existingStructure) {
      return NextResponse.json(
        { error: "Fee structure not found" },
        { status: 404 }
      );
    }

    // Delete the fee structure
    await prisma.feeStructure.delete({
      where: { id },
    });

    // Log the transaction
    await logTransaction({
      action: "DELETE",
      entityType: "FeeStructure",
      entityId: id,
      userId: session.user.id,
      details: { name: existingStructure.name },
    });

    return NextResponse.json({ message: "Fee structure deleted successfully" });
  } catch (error) {
    console.error("Fee Structures DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete fee structure" },
      { status: 500 }
    );
  }
}
