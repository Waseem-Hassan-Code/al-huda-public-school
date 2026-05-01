import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageStatus, MessageType } from "@prisma/client";

const BRIDGE = process.env.SMS_BRIDGE_URL || "http://127.0.0.1:3001";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    phoneNumber,
    message,
    method,
    // Optional — used to persist to the Message log
    studentId,
    recipientName,
  } = body;

  if (!phoneNumber || !message) {
    return NextResponse.json(
      { error: "phoneNumber and message are required" },
      { status: 400 }
    );
  }

  try {
    const bridgeRes = await fetch(`${BRIDGE}/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, message, method }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await bridgeRes.json();

    // Persist to Message log only when we have a linked student
    if (bridgeRes.ok && data.success && studentId && recipientName) {
      try {
        await prisma.message.create({
          data: {
            type: MessageType.SMS,
            content: message,
            studentId,
            recipientName,
            recipientPhone: phoneNumber,
            status: MessageStatus.SENT,
            sentAt: new Date(),
            sentById: session.user.id,
          },
        });
      } catch {
        // Non-fatal — bridge already confirmed send, don't fail the response
        console.warn("[SMS API] Could not persist message log");
      }
    }

    return NextResponse.json(data, { status: bridgeRes.status });
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "SMS Bridge is not running. Start it with: cd sms-bridge && npm start",
          bridgeOffline: true,
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
