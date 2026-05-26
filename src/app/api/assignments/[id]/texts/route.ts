import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
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
    if (!assignment || assignment.group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const [texts, reviewAssignments] = await Promise.all([
      prisma.text.findMany({
        where: { assignmentId: id },
        include: {
          author: { select: { name: true, kandidatnummer: true, isActive: true } },
          _count: { select: { reviews: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.reviewAssignment.findMany({
        where: { assignmentId: id, isActive: true },
        select: { reviewerId: true, review: { select: { rejectedAt: true } } },
      }),
    ]);

    // Count completed non-rejected reviews per reviewer
    const reviewsGivenMap = new Map<string, number>();
    for (const ra of reviewAssignments) {
      if (ra.review && !ra.review.rejectedAt) {
        reviewsGivenMap.set(ra.reviewerId, (reviewsGivenMap.get(ra.reviewerId) ?? 0) + 1);
      }
    }

    const result = texts.map((t) => ({
      ...t,
      reviewsGiven: reviewsGivenMap.get(t.authorId) ?? 0,
    }));

    return NextResponse.json(result);
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
