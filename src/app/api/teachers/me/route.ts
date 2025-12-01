import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get current logged-in teacher's information
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find teacher by userId
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        classSections: {
          include: {
            class: {
              select: { id: true, name: true },
            },
          },
        },
        subjects: {
          include: {
            subject: {
              select: { id: true, name: true, code: true },
            },
            class: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: teacher });
  } catch (error) {
    console.error("Teacher Me GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teacher information" },
      { status: 500 }
    );
  }
}
