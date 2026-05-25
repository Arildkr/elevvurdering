import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: { reviewAssignment: { include: { assignment: { include: { group: { select: { adminId: true } } } } } } },
    });

    if (!review) {
      return NextResponse.json({ error: "Tilbakemelding ikke funnet" }, { status: 404 });
    }

    if (review.reviewAssignment.assignment.group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    // Delete review; reset assignment so reviewer can resubmit
    await prisma.$transaction([
      prisma.review.delete({ where: { id } }),
      prisma.reviewAssignment.update({
        where: { id: review.reviewAssignmentId },
        data: { completed: false },
      }),
    ]);

    return NextResponse.json({ success: true });
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
