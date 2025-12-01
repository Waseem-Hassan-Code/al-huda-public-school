import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// GET - Fetch messaging settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create default settings
    let settings = await prisma.messagingSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.messagingSettings.create({
        data: { id: "default" },
      });
    }

    // Don't expose API keys to client
    return NextResponse.json({
      whatsappNumber: settings.whatsappNumber,
      whatsappEnabled: settings.whatsappEnabled,
      whatsappConfigured: !!settings.whatsappApiKey,
      smsNumber: settings.smsNumber,
      smsEnabled: settings.smsEnabled,
      smsConfigured: !!settings.smsApiKey,
    });
  } catch (error) {
    console.error("Messaging Settings GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT - Update messaging settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update settings
    if (!hasPermission(session.user.role, Permission.MANAGE_SETTINGS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      whatsappNumber,
      whatsappApiKey,
      whatsappEnabled,
      smsNumber,
      smsApiKey,
      smsEnabled,
    } = body;

    // Update or create settings
    const settings = await prisma.messagingSettings.upsert({
      where: { id: "default" },
      update: {
        whatsappNumber: whatsappNumber || null,
        whatsappApiKey: whatsappApiKey || undefined, // Don't clear if not provided
        whatsappEnabled: whatsappEnabled ?? false,
        smsNumber: smsNumber || null,
        smsApiKey: smsApiKey || undefined,
        smsEnabled: smsEnabled ?? false,
      },
      create: {
        id: "default",
        whatsappNumber,
        whatsappApiKey,
        whatsappEnabled: whatsappEnabled ?? false,
        smsNumber,
        smsApiKey,
        smsEnabled: smsEnabled ?? false,
      },
    });

    return NextResponse.json({
      message: "Settings updated successfully",
      whatsappNumber: settings.whatsappNumber,
      whatsappEnabled: settings.whatsappEnabled,
      whatsappConfigured: !!settings.whatsappApiKey,
      smsNumber: settings.smsNumber,
      smsEnabled: settings.smsEnabled,
      smsConfigured: !!settings.smsApiKey,
    });
  } catch (error) {
    console.error("Messaging Settings PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
