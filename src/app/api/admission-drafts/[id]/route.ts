import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as string, Permission.CREATE_STUDENT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET - Load one draft to resume it
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await authorize();
  if (denied) return denied;
  const { id } = await params;

  const draft = await prisma.admissionDraft.findUnique({ where: { id } });
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  return NextResponse.json(draft);
}

// DELETE - Discard a draft
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await authorize();
  if (denied) return denied;
  const { id } = await params;

  await prisma.admissionDraft.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
