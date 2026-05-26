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

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: assignment.groupId, userId: user.id } },
    });
    if (!member) return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });

    // Access hierarchy:
    // 1. feedbackOpen OR deadline passed → everyone bypasses minReviews
    // 2. text.feedbackUnlocked → this student bypasses everything
    // 3. Otherwise → blocked (teacher hasn't opened yet)
    const globalUnlock =
      assignment.feedbackOpen ||
      (assignment.feedbackDeadline && new Date(assignment.feedbackDeadline) <= new Date());

    if (!globalUnlock) {
      const textCheck = await prisma.text.findUnique({
        where: { assignmentId_authorId: { assignmentId: id, authorId: user.id } },
        select: { feedbackUnlocked: true },
      });
      if (!textCheck?.feedbackUnlocked) {
        return NextResponse.json(
          { error: "Tilbakemeldinger er ikke åpnet ennå", feedbackClosed: true },
          { status: 403 }
        );
      }
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
      orderBy: { createdAt: "asc" },
    });

    // Get teacher feedback on user's text
    const teacherFeedbacks = await prisma.teacherFeedback.findMany({
      where: { textId: text.id },
      select: {
        id: true,
        content: true,
        createdAt: true,
        readAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ feedback: reviews, teacherFeedback: teacherFeedbacks });
  } catch (error) {
    console.error("My-feedback GET error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
