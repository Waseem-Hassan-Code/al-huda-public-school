import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { MessageStatus, MessageType } from "@prisma/client";
import { sendSms, smsErrorStatus, SmsMethod } from "@/lib/sms-phone";

// POST - Send one SMS through the USB-connected Android phone (ADB, in-app).
// Body: { phoneNumber, message, method?: "silent" | "intent", studentId?, recipientName? }
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, Permission.SEND_MESSAGES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { phoneNumber, message, method, studentId, recipientName } = await request.json();
  if (!phoneNumber || !message) {
    return NextResponse.json({ success: false, error: "phoneNumber and message are required" }, { status: 400 });
  }

  try {
    const result = await sendSms(String(phoneNumber), String(message), method as SmsMethod | undefined);

    // Keep a record in the message log when it's for a student
    if (studentId && recipientName) {
      await prisma.message
        .create({
          data: {
            type: MessageType.SMS,
            content: message,
            studentId,
            recipientName,
            recipientPhone: result.to,
            status: MessageStatus.SENT,
            sentAt: new Date(),
            sentById: session.user.id,
          },
        })
        .catch(() => console.warn("[SMS API] Could not save message log"));
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: smsErrorStatus(err) }
    );
  }
}
