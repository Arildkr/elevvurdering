import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { getAssignmentPhase, canReview } from "@/lib/phase";
import { findTextForAdditionalReview } from "@/lib/distribution";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateSession();
    if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) return NextResponse.json({ error: "Oppgave ikke funnet" }, { status: 404 });

    const phase = getAssignmentPhase(assignment.writeDeadline, assignment.reviewDeadline);
    if (!canReview(phase)) {
      return NextResponse.json({ error: "Vurderingsperioden er ikke aktiv" }, { status: 403 });
    }

    // Check all active assignments are completed
    const incomplete = await prisma.reviewAssignment.count({
      where: {
        assignmentId: id,
        reviewerId: user.id,
        isActive: true,
        completed: false,
      },
    });

    if (incomplete > 0) {
      return NextResponse.json(
        { error: "Fullfør alle tildelte vurderinger først" },
        { status: 400 }
      );
    }

    const text = await findTextForAdditionalReview(id, user.id);
    if (!text) {
      return NextResponse.json(
        { error: "Ingen flere tekster tilgjengelig for vurdering" },
        { status: 404 }
      );
    }

    const reviewAssignment = await prisma.reviewAssignment.create({
      data: {
        assignmentId: id,
        textId: text.id,
        reviewerId: user.id,
      },
      include: {
        text: { select: { id: true, content: true, createdAt: true } },
      },
    });

    return NextResponse.json({
      id: reviewAssignment.id,
      textId: reviewAssignment.text.id,
      textContent: reviewAssignment.text.content,
      textCreatedAt: reviewAssignment.text.createdAt,
      completed: false,
    });
  } catch (error) {
    console.error("Request-more error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
