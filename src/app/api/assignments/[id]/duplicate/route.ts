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

    const source = await prisma.assignment.findUnique({
      where: { id },
      include: { group: { select: { adminId: true } } },
    });

    if (!source) {
      return NextResponse.json({ error: "Oppgave ikke funnet" }, { status: 404 });
    }
    if (source.group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const body = await request.json();
    const groupId: string = body.groupId ?? source.groupId;

    // Verify target group belongs to this admin
    const targetGroup = await prisma.group.findUnique({ where: { id: groupId } });
    if (!targetGroup || targetGroup.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang til denne gruppen" }, { status: 403 });
    }

    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const copy = await prisma.assignment.create({
      data: {
        groupId,
        title: source.title,
        description: source.description,
        taskText: source.taskText,
        toolsConfig: source.toolsConfig,
        minReviews: source.minReviews,
        writeDeadline: farFuture,
        reviewDeadline: new Date(farFuture.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Duplicate error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
