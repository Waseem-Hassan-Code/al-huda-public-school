import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission, rolePermissions } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";
import bcrypt from "bcryptjs";

// GET - Get single user
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

    // Users can view their own profile
    if (
      id !== session.user.id &&
      !hasPermission(session.user.role, Permission.VIEW_USERS)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        role: true,
        permissions: {
          select: {
            id: true,
            permission: true,
          },
        },
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("User GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT - Update user
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

    // Users can update their own basic info, admins can update everything
    const isSelf = id === session.user.id;
    if (!isSelf && !hasPermission(session.user.role, Permission.UPDATE_USER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      permissions,
      isActive,
      avatar,
      phone,
      firstName,
      lastName,
    } = body;

    const updateData: any = {};

    // Basic info can be updated by self or admin
    if (name) {
      updateData.name = name;
    } else if (firstName || lastName) {
      // Handle firstName/lastName format
      const currentUser = await prisma.user.findUnique({
        where: { id },
        select: { name: true },
      });
      const parts = currentUser?.name?.split(" ") || ["", ""];
      const fName = firstName || parts[0] || "";
      const lName = lastName || parts.slice(1).join(" ") || "";
      updateData.name = `${fName} ${lName}`.trim();
    }
    if (email && !isSelf) updateData.email = email; // Email can only be changed by admin
    if (avatar !== undefined) updateData.avatar = avatar || null;
    if (phone !== undefined) updateData.phone = phone || null;

    // Password change
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Admin-only fields
    if (!isSelf && hasPermission(session.user.role, Permission.UPDATE_USER)) {
      if (role) updateData.role = role;
      if (permissions) updateData.permissions = permissions;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
        isActive: true,
      },
    });

    await logTransaction({
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      userId: session.user.id,
      details: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("User PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate user
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

    if (!hasPermission(session.user.role, Permission.DELETE_USER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Soft delete - deactivate user
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await logTransaction({
      action: "DELETE",
      entityType: "User",
      entityId: id,
      userId: session.user.id,
      details: { action: "DEACTIVATED" },
    });

    return NextResponse.json({ message: "User deactivated successfully" });
  } catch (error) {
    console.error("User DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
