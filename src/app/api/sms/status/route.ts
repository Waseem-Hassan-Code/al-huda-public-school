import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BRIDGE = process.env.SMS_BRIDGE_URL || "http://127.0.0.1:3001";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${BRIDGE}/status`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Bridge not running or phone not connected
    return NextResponse.json({
      connected: false,
      device: null,
      bridgeOffline: true,
    });
  }
}
