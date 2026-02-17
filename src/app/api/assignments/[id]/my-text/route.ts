import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { getAssignmentPhase, canSubmitText, canEditText } from "@/lib/phase";
import { submitTextSchema } from "@/lib/validation/text";

async function getAssignmentWithAccess(userId: string, assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) return null;

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: assignment.groupId, userId } },
  });
  if (!member) return null;

  return assignment;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateSession();
    if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

    const { id } = await params;
    const assignment = await getAssignmentWithAccess(user.id, id);
    if (!assignment) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

    const text = await prisma.text.findUnique({
      where: { assignmentId_authorId: { assignmentId: id, authorId: user.id } },
      select: { id: true, content: true, createdAt: true, updatedAt: true },
    });

    const phase = getAssignmentPhase(assignment.writeDeadline, assignment.reviewDeadline);

    return NextResponse.json({
      text,
      canEdit: canEditText(phase, assignment.distributionDone),
      canSubmit: canSubmitText(phase),
    });
  } catch (error) {
    console.error("My-text GET error:", error);
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
    const assignment = await getAssignmentWithAccess(user.id, id);
    if (!assignment) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

    const phase = getAssignmentPhase(assignment.writeDeadline, assignment.reviewDeadline);
    if (!canSubmitText(phase)) {
      return NextResponse.json({ error: "Skrivefristen har utløpt" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = submitTextSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const text = await prisma.text.upsert({
      where: { assignmentId_authorId: { assignmentId: id, authorId: user.id } },
      update: { content: parsed.data.content },
      create: {
        assignmentId: id,
        authorId: user.id,
        content: parsed.data.content,
      },
    });

    return NextResponse.json(text, { status: 201 });
  } catch (error) {
    console.error("My-text POST error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateSession();
    if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

    const { id } = await params;
    const assignment = await getAssignmentWithAccess(user.id, id);
    if (!assignment) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

    const phase = getAssignmentPhase(assignment.writeDeadline, assignment.reviewDeadline);
    if (!canEditText(phase, assignment.distributionDone)) {
      return NextResponse.json(
        { error: "Teksten kan ikke redigeres (frist utløpt eller tildeling er gjort)" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = submitTextSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const text = await prisma.text.update({
      where: { assignmentId_authorId: { assignmentId: id, authorId: user.id } },
      data: { content: parsed.data.content },
    });

    return NextResponse.json(text);
  } catch (error) {
    console.error("My-text PUT error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
