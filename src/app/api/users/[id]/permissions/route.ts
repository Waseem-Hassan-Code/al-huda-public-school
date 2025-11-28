import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission, rolePermissions } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - Get user permissions or all available permissions
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

    if (!hasPermission(session.user.role, Permission.MANAGE_PERMISSIONS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user's current permissions
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: {
          select: {
            id: true,
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all permissions
    const allPermissions = Object.values(Permission);

    // Group permissions by category
    const groupedPermissions: Record<string, Permission[]> = {};
    allPermissions.forEach((permission) => {
      const category = permission.split(".")[0];
      if (!groupedPermissions[category]) {
        groupedPermissions[category] = [];
      }
      groupedPermissions[category].push(permission);
    });

    // Get default permissions for user's role
    const defaultPermissions = rolePermissions[user.role] || [];

    // Extract permission strings from the relation
    const currentPermissions = user.permissions.map((p) => p.permission);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      currentPermissions,
      defaultPermissions,
      allPermissions: groupedPermissions,
    });
  } catch (error) {
    console.error("Permissions GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}

// PUT - Update user permissions
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

    if (!hasPermission(session.user.role, Permission.MANAGE_PERMISSIONS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { permissions, resetToDefault } = body;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let newPermissions: string[];

    if (resetToDefault) {
      // Reset to role's default permissions
      newPermissions = rolePermissions[user.role] || [];
    } else {
      // Validate that all provided permissions are valid
      const allPermissions = Object.values(Permission);
      const invalidPermissions = permissions.filter(
        (p: string) => !allPermissions.includes(p as Permission)
      );

      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { error: `Invalid permissions: ${invalidPermissions.join(", ")}` },
          { status: 400 }
        );
      }

      newPermissions = permissions;
    }

    // Update permissions by deleting existing and creating new ones
    await prisma.$transaction([
      // Delete existing permissions
      prisma.userPermission.deleteMany({
        where: { userId: id },
      }),
      // Create new permissions
      prisma.userPermission.createMany({
        data: newPermissions.map((permission: string) => ({
          userId: id,
          permission,
        })),
      }),
    ]);

    // Get updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: {
          select: {
            id: true,
            permission: true,
          },
        },
      },
    });

    await logTransaction({
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      userId: session.user.id,
      details: {
        action: "PERMISSIONS_UPDATED",
        resetToDefault,
        permissionsCount: newPermissions.length,
      },
    });

    return NextResponse.json({
      message: "Permissions updated successfully",
      user: {
        ...updatedUser,
        permissions: updatedUser?.permissions.map((p) => p.permission) || [],
      },
    });
  } catch (error) {
    console.error("Permissions PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}
