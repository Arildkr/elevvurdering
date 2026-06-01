import { NextRequest, NextResponse } from "next/server";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const rejectionReason: string | undefined = typeof body?.reason === "string" ? body.reason.trim() || undefined : undefined;

    const review = await prisma.review.findUnique({
      where: { id },
      include: { reviewAssignment: true },
    });

    if (!review) {
      return NextResponse.json({ error: "Tilbakemelding ikke funnet" }, { status: 404 });
    }

    // Reject review and mark assignment as incomplete again
    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.review.update({
        where: { id },
        data: { rejectedAt: new Date(), rejectionReason: rejectionReason ?? null },
      });

      await tx.reviewAssignment.update({
        where: { id: review.reviewAssignmentId },
        data: { completed: false },
      });
    });

    return NextResponse.json({ success: true, message: "Tilbakemelding underkjent" });
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
