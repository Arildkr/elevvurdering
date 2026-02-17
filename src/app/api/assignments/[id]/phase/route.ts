import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { group: { select: { adminId: true } } },
    });
    if (!existing || existing.group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const body = await request.json();
    const { phase } = body;

    if (!["writing", "review", "closed"].includes(phase)) {
      return NextResponse.json({ error: "Ugyldig fase" }, { status: 400 });
    }

    const now = new Date();
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    let writeDeadline: Date;
    let reviewDeadline: Date;

    if (phase === "writing") {
      // Set both deadlines to far future
      writeDeadline = farFuture;
      reviewDeadline = new Date(farFuture.getTime() + 24 * 60 * 60 * 1000);
    } else if (phase === "review") {
      // Set writeDeadline to past, reviewDeadline to far future
      writeDeadline = new Date(now.getTime() - 1000);
      reviewDeadline = farFuture;
    } else {
      // closed: set both to past
      writeDeadline = new Date(now.getTime() - 2000);
      reviewDeadline = new Date(now.getTime() - 1000);
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: { writeDeadline, reviewDeadline },
    });

    return NextResponse.json(assignment);
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
