import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { distributeReviews } from "@/lib/distribution";
import { canAccessGroup } from "@/lib/group-access";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      select: { groupId: true, writeDeadline: true, isPaused: true },
    });
    if (!assignment || !await canAccessGroup(assignment.groupId, admin.id)) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const count = await distributeReviews(id);

    // Advance to review phase if currently in writing phase, and clear any pause
    const now = new Date();
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    if (assignment.writeDeadline > now || assignment.isPaused) {
      await prisma.assignment.update({
        where: { id },
        data: {
          writeDeadline: new Date(now.getTime() - 1000),
          reviewDeadline: farFuture,
          isPaused: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      assignmentsCreated: count,
      message: `${count} nye tildelinger opprettet`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("minst 2")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Distribute error:", error);
    return NextResponse.json({ error: "Noe gikk galt ved tildeling" }, { status: 500 });
  }
}
