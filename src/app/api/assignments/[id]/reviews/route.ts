import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
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

    const reviews = await prisma.review.findMany({
      where: {
        reviewAssignment: { assignmentId: id },
      },
      include: {
        reviewer: { select: { name: true, kandidatnummer: true } },
        text: {
          select: {
            id: true,
            author: { select: { name: true, kandidatnummer: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews);
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
