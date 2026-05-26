import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { sanitizeHtml } from "@/lib/sanitize";

async function getOpenAssignment(userId: string, assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) return null;

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: assignment.groupId, userId } },
  });
  if (!member) return null;

  const globalUnlock =
    assignment.feedbackOpen ||
    (assignment.feedbackDeadline && new Date(assignment.feedbackDeadline) <= new Date());

  if (globalUnlock) return assignment;

  // Check per-student unlock
  const text = await prisma.text.findUnique({
    where: { assignmentId_authorId: { assignmentId, authorId: userId } },
    select: { feedbackUnlocked: true },
  });
  if (text?.feedbackUnlocked) return assignment;

  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateSession();
    if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

    const { id } = await params;
    const assignment = await getOpenAssignment(user.id, id);
    if (!assignment) {
      return NextResponse.json({ error: "Forbedre-fasen er ikke åpnet ennå" }, { status: 403 });
    }

    const text = await prisma.text.findUnique({
      where: { assignmentId_authorId: { assignmentId: id, authorId: user.id } },
      select: { revisedContent: true, revisedAt: true },
    });

    return NextResponse.json({
      revisedContent: text?.revisedContent ?? null,
      revisedAt: text?.revisedAt ?? null,
    });
  } catch (error) {
    console.error("my-revised-text GET error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateSession();
    if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

    const { id } = await params;
    const assignment = await getOpenAssignment(user.id, id);
    if (!assignment) {
      return NextResponse.json({ error: "Forbedre-fasen er ikke åpnet ennå" }, { status: 403 });
    }

    const body = await request.json();
    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json({ error: "Mangler innhold" }, { status: 400 });
    }

    const sanitized = sanitizeHtml(body.content);

    const text = await prisma.text.update({
      where: { assignmentId_authorId: { assignmentId: id, authorId: user.id } },
      data: { revisedContent: sanitized, revisedAt: new Date() },
      select: { revisedContent: true, revisedAt: true },
    });

    return NextResponse.json(text);
  } catch (error) {
    console.error("my-revised-text POST error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
