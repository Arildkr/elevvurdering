import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { group: { select: { adminId: true } } },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Oppgave ikke funnet" }, { status: 404 });
    }

    if (assignment.group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: { feedbackOpen: !assignment.feedbackOpen },
    });

    return NextResponse.json({
      feedbackOpen: updated.feedbackOpen,
      message: updated.feedbackOpen
        ? "Tilbakemeldinger er nå åpne"
        : "Tilbakemeldinger er nå lukket",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Toggle feedback error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
