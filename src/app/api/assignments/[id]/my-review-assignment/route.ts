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

    const assignments = await prisma.reviewAssignment.findMany({
      where: {
        assignmentId: id,
        reviewerId: user.id,
        isActive: true,
      },
      include: {
        text: {
          select: { id: true, content: true, createdAt: true },
        },
        review: {
          select: { id: true, content: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      assignments.map((a: typeof assignments[number]) => ({
        id: a.id,
        textId: a.text.id,
        textContent: a.text.content,
        textCreatedAt: a.text.createdAt,
        completed: a.completed,
        review: a.review
          ? { id: a.review.id, content: a.review.content, createdAt: a.review.createdAt }
          : null,
      }))
    );
  } catch (error) {
    console.error("My-review-assignment GET error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
