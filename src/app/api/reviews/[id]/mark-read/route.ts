import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: { text: { select: { authorId: true } } },
    });

    if (!review) {
      return NextResponse.json({ error: "Tilbakemelding ikke funnet" }, { status: 404 });
    }

    // Only the text author can mark as read
    if (review.text.authorId !== user.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ id: updated.id, readAt: updated.readAt });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
