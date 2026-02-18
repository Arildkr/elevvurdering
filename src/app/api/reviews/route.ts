import { NextRequest, NextResponse } from "next/server";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getAssignmentPhase } from "@/lib/phase";
import { createReviewSchema } from "@/lib/validation/review";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const parsed = createReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { reviewAssignmentId, content } = parsed.data;

    // Find the review assignment
    const reviewAssignment = await prisma.reviewAssignment.findUnique({
      where: { id: reviewAssignmentId },
      include: {
        assignment: true,
        text: { select: { id: true } },
      },
    });

    if (!reviewAssignment) {
      return NextResponse.json({ error: "Tildeling ikke funnet" }, { status: 404 });
    }

    if (reviewAssignment.reviewerId !== user.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    if (!reviewAssignment.isActive) {
      return NextResponse.json({ error: "Denne tildelingen er ikke lenger aktiv" }, { status: 400 });
    }

    if (reviewAssignment.completed) {
      return NextResponse.json({ error: "Du har allerede vurdert denne teksten" }, { status: 400 });
    }

    const phase = getAssignmentPhase(
      reviewAssignment.assignment.writeDeadline,
      reviewAssignment.assignment.reviewDeadline
    );

    if (phase === "closed") {
      return NextResponse.json({ error: "Oppgaven er lukket" }, { status: 403 });
    }

    // Create review and mark assignment as completed in a transaction
    const review = await prisma.$transaction(async (tx: TransactionClient) => {
      const newReview = await tx.review.create({
        data: {
          reviewAssignmentId,
          textId: reviewAssignment.text.id,
          reviewerId: user.id,
          content,
        },
      });

      await tx.reviewAssignment.update({
        where: { id: reviewAssignmentId },
        data: { completed: true },
      });

      return newReview;
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    console.error("Review POST error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
