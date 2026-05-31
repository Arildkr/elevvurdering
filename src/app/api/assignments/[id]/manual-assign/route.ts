import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canAccessGroup } from "@/lib/group-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      select: { groupId: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Oppgave ikke funnet" }, { status: 404 });
    }
    if (!await canAccessGroup(assignment.groupId, admin.id)) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const body = await request.json();
    const { reviewerId, textId } = body;

    if (!reviewerId || typeof reviewerId !== "string") {
      return NextResponse.json({ error: "reviewerId mangler" }, { status: 400 });
    }
    if (!textId || typeof textId !== "string") {
      return NextResponse.json({ error: "textId mangler" }, { status: 400 });
    }

    // Verify text belongs to this assignment
    const text = await prisma.text.findUnique({ where: { id: textId } });
    if (!text || text.assignmentId !== id) {
      return NextResponse.json({ error: "Tekst ikke funnet" }, { status: 404 });
    }

    // Reviewer cannot review their own text
    if (text.authorId === reviewerId) {
      return NextResponse.json({ error: "Eleven kan ikke vurdere sin egen tekst" }, { status: 400 });
    }

    // Verify reviewer is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: assignment.groupId, userId: reviewerId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Eleven er ikke i denne gruppen" }, { status: 400 });
    }

    // Check for existing active assignment between this reviewer and text
    const existing = await prisma.reviewAssignment.findFirst({
      where: { assignmentId: id, reviewerId, textId, isActive: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Denne tildelingen finnes allerede" }, { status: 400 });
    }

    const reviewAssignment = await prisma.reviewAssignment.create({
      data: { assignmentId: id, textId, reviewerId },
    });

    return NextResponse.json(reviewAssignment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Manual assign error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
