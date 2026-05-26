import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { group: { select: { adminId: true } } },
    });
    if (!assignment || assignment.group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const body = await request.json();
    if (typeof body.textId !== "string" || typeof body.unlock !== "boolean") {
      return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
    }

    // Verify text belongs to this assignment
    const text = await prisma.text.findUnique({
      where: { id: body.textId },
      select: { assignmentId: true },
    });
    if (!text || text.assignmentId !== id) {
      return NextResponse.json({ error: "Tekst ikke funnet" }, { status: 404 });
    }

    await prisma.text.update({
      where: { id: body.textId },
      data: { feedbackUnlocked: body.unlock },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
