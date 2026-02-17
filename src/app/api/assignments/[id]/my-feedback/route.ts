import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateSession();
    if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) return NextResponse.json({ error: "Oppgave ikke funnet" }, { status: 404 });

    // Check if feedback is open (teacher toggle or deadline passed)
    const feedbackAvailable =
      assignment.feedbackOpen ||
      (assignment.feedbackDeadline && new Date(assignment.feedbackDeadline) <= new Date());

    if (!feedbackAvailable) {
      return NextResponse.json(
        { error: "Tilbakemeldinger er ikke åpnet ennå", feedbackClosed: true },
        { status: 403 }
      );
    }

    // Check user has completed enough non-rejected reviews
    const completedReviews = await prisma.review.count({
      where: {
        reviewAssignment: {
          assignmentId: id,
          reviewerId: user.id,
          isActive: true,
        },
        rejectedAt: null,
      },
    });

    if (completedReviews < assignment.minReviews) {
      return NextResponse.json(
        {
          error: `Du må fullføre minst ${assignment.minReviews} vurdering(er) før du kan se tilbakemeldinger`,
          required: assignment.minReviews,
          completed: completedReviews,
        },
        { status: 403 }
      );
    }

    // Get user's text
    const text = await prisma.text.findUnique({
      where: { assignmentId_authorId: { assignmentId: id, authorId: user.id } },
    });

    if (!text) {
      return NextResponse.json({ feedback: [], message: "Du har ikke levert tekst" });
    }

    // Get all non-rejected reviews on user's text
    const reviews = await prisma.review.findMany({
      where: {
        textId: text.id,
        rejectedAt: null,
        reviewAssignment: { isActive: true },
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        readAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ feedback: reviews });
  } catch (error) {
    console.error("My-feedback GET error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
