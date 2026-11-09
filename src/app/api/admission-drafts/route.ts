import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

// Name shown in the drafts list, taken from whatever was filled in.
function draftTitle(data: any): string | null {
  const student = `${data?.firstName ?? ""} ${data?.lastName ?? ""}`.trim();
  if (student) return student;
  const guardian = `${data?.guardian?.firstName ?? ""} ${data?.guardian?.lastName ?? ""}`.trim();
  return guardian ? `Guardian: ${guardian}` : null;
}

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!hasPermission(session.user.role as string, Permission.CREATE_STUDENT)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

// GET - List unfinished admissions (newest first)
export async function GET() {
  const { session, error } = await authorize();
  if (error) return error;

  const drafts = await prisma.admissionDraft.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      studentName: true,
      currentStep: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ drafts, currentUserId: session!.user.id });
}

// POST - Create or update a draft (upsert). Body: { id?, data, currentStep }
// Also used with fetch(keepalive) when the user leaves the page.
export async function POST(request: NextRequest) {
  const { session, error } = await authorize();
  if (error) return error;

  try {
    const body = await request.json();
    const data = body?.data ?? {};
    const currentStep = Number.isInteger(body?.currentStep) ? body.currentStep : 0;
    const studentName = draftTitle(data);

    if (body?.id) {
      const existing = await prisma.admissionDraft.findUnique({
        where: { id: body.id },
        select: { id: true },
      });
      if (existing) {
        const draft = await prisma.admissionDraft.update({
          where: { id: body.id },
          data: { data, currentStep, studentName },
          select: { id: true, updatedAt: true },
        });
        return NextResponse.json(draft);
      }
    }

    const draft = await prisma.admissionDraft.create({
      data: { data, currentStep, studentName, createdById: session!.user.id },
      select: { id: true, updatedAt: true },
    });
    return NextResponse.json(draft, { status: 201 });
  } catch (err) {
    console.error("Error saving admission draft:", err);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}
