import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sanitizeHtml } from "@/lib/sanitize";
import { canAccessGroup } from "@/lib/group-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({ where: { id }, select: { groupId: true } });
    if (!assignment || !await canAccessGroup(assignment.groupId, admin.id)) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const feedbacks = await prisma.teacherFeedback.findMany({
      where: { assignmentId: id },
      select: {
        id: true,
        textId: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(feedbacks);
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({ where: { id }, select: { groupId: true } });
    if (!assignment || !await canAccessGroup(assignment.groupId, admin.id)) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const body = await request.json();
    const { textId, content } = body;

    if (!textId || typeof textId !== "string") {
      return NextResponse.json({ error: "textId mangler" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Innhold kan ikke være tomt" }, { status: 400 });
    }

    // Verify text belongs to this assignment
    const text = await prisma.text.findUnique({ where: { id: textId } });
    if (!text || text.assignmentId !== id) {
      return NextResponse.json({ error: "Tekst ikke funnet" }, { status: 404 });
    }

    const feedback = await prisma.teacherFeedback.create({
      data: {
        textId,
        assignmentId: id,
        adminId: admin.id,
        content: sanitizeHtml(content.trim()),
      },
    });

    return NextResponse.json(feedback, { status: 201 });
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
