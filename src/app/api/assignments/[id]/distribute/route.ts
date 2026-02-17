import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { distributeReviews } from "@/lib/distribution";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    // Verify ownership
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { group: { select: { adminId: true } } },
    });
    if (!assignment || assignment.group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const count = await distributeReviews(id);

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
