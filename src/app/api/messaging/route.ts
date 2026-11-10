import { NextRequest, NextResponse } from "next/server";
import { getPhoneStatus, sendSms } from "@/lib/sms-phone";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";
import { logTransaction } from "@/lib/transaction-log";

// GET - Fetch message history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_STUDENTS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type"); // WHATSAPP or SMS
    const studentId = searchParams.get("studentId");

    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (studentId) where.studentId = studentId;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              registrationNo: true,
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
          sentBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return NextResponse.json({
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Messaging GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST - Send messages
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.SEND_MESSAGES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, content, templateName, recipients } = body;

    if (!type || !content || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get messaging settings
    const settings = await prisma.messagingSettings.findUnique({
      where: { id: "default" },
    });

    if (
      type === "WHATSAPP" &&
      (!settings?.whatsappEnabled || !settings?.whatsappNumber)
    ) {
      return NextResponse.json(
        {
          error: "WhatsApp is not configured. Please configure it in settings.",
        },
        { status: 400 }
      );
    }

    if (type === "SMS" && !settings?.smsEnabled) {
      return NextResponse.json(
        { error: "SMS is turned off. Turn it on in Messaging settings." },
        { status: 400 }
      );
    }

    // SMS goes through the USB-connected phone: check it before creating records
    if (type === "SMS") {
      const phoneStatus = await getPhoneStatus();
      if (!phoneStatus.connected) {
        return NextResponse.json(
          { error: phoneStatus.problem || "SMS phone is not connected", phoneStatus },
          { status: 503 }
        );
      }
      // Android 6+ can't send in the background: each SMS opens the phone's SMS
      // app and someone taps Send, so sending to many parents at once won't work.
      if (!phoneStatus.supportsSilent && recipients.length > 1) {
        return NextResponse.json(
          {
            error: `This phone (Android ${phoneStatus.androidVersion}) needs someone to tap Send for every SMS, so bulk SMS isn't possible with it. Send to one parent at a time, or use WhatsApp for bulk messages.`,
            phoneStatus,
          },
          { status: 400 }
        );
      }
    }

    // Create a message record for one recipient and send it
    const sendOne = async (recipient: any) => {
        const phone =
          type === "WHATSAPP"
            ? recipient.guardianWhatsapp || recipient.guardianPhone
            : recipient.guardianPhone;
        // The page personalises the text per parent (student name etc.)
        const text: string = recipient.personalizedMessage || content;

        // Create message record
        const message = await prisma.message.create({
          data: {
            type,
            content: text,
            templateName,
            studentId: recipient.studentId,
            recipientName: recipient.guardianName,
            recipientPhone: phone,
            status: "PENDING",
            sentById: session.user.id,
          },
        });

        // Send via WhatsApp API
        if (type === "WHATSAPP") {
          try {
            const sendResult = await sendWhatsAppMessage(
              phone,
              text,
              settings?.whatsappApiKey || ""
            );

            await prisma.message.update({
              where: { id: message.id },
              data: {
                status: sendResult.success ? "SENT" : "FAILED",
                externalId: sendResult.messageId,
                errorMessage: sendResult.error,
                sentAt: sendResult.success ? new Date() : null,
              },
            });

            return {
              studentId: recipient.studentId,
              success: sendResult.success,
              error: sendResult.error,
            };
          } catch (error: any) {
            await prisma.message.update({
              where: { id: message.id },
              data: {
                status: "FAILED",
                errorMessage: error.message,
              },
            });
            return {
              studentId: recipient.studentId,
              success: false,
              error: error.message,
            };
          }
        } else {
          // SMS through the USB-connected Android phone
          try {
            if (!phone) throw new Error("No guardian phone number");
            const sent = await sendSms(phone, text);
            await prisma.message.update({
              where: { id: message.id },
              data: { status: "SENT", sentAt: new Date(), recipientPhone: sent.to },
            });
            return { studentId: recipient.studentId, success: true, note: sent.note, method: sent.method };
          } catch (error: any) {
            await prisma.message.update({
              where: { id: message.id },
              data: { status: "FAILED", errorMessage: error.message },
            });
            return { studentId: recipient.studentId, success: false, error: error.message };
          }
        }
    };

    // WhatsApp in parallel; SMS one after another (one phone, one SMS at a time)
    const results: any[] = [];
    if (type === "SMS") {
      for (const recipient of recipients) results.push(await sendOne(recipient));
    } else {
      results.push(...(await Promise.all(recipients.map(sendOne))));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // Log the transaction
    await logTransaction({
      action: "CREATE",
      entityType: "MESSAGE",
      entityId: "bulk",
      userId: session.user.id,
      details: {
        type,
        templateName,
        recipientCount: recipients.length,
        successCount,
        failCount,
      },
    });

    const openedOnPhone = results.some((r) => r.method === "intent");
    return NextResponse.json({
      message:
        type === "SMS" && openedOnPhone && failCount === 0
          ? "SMS app opened on the phone. Tap Send on the phone to deliver it."
          : `Sent ${successCount} messages successfully. ${failCount} failed.`,
      results,
    });
  } catch (error) {
    console.error("Messaging POST Error:", error);
    return NextResponse.json(
      { error: "Failed to send messages" },
      { status: 500 }
    );
  }
}

// WhatsApp message sending using free API (CallMeBot or similar)
async function sendWhatsAppMessage(
  phone: string,
  message: string,
  apiKey: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Clean phone number - remove spaces and ensure country code
    let cleanPhone = phone.replace(/\s+/g, "").replace(/^0/, "92");
    if (!cleanPhone.startsWith("+")) {
      cleanPhone = "+" + cleanPhone;
    }

    // Using CallMeBot free WhatsApp API
    // User needs to register their number first at: https://www.callmebot.com/blog/free-api-whatsapp-messages/
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedMessage}&apikey=${apiKey}`;

    const response = await fetch(url, {
      method: "GET",
    });

    if (response.ok) {
      const text = await response.text();
      if (text.includes("Message queued") || text.includes("sent")) {
        return { success: true, messageId: `CMB-${Date.now()}` };
      }
      return { success: false, error: text };
    }

    return { success: false, error: `HTTP ${response.status}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
