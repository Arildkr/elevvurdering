import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession, requireAdmin } from "@/lib/auth";
import { canAccessGroup } from "@/lib/group-access";
import { getAssignmentPhase } from "@/lib/phase";
import { updateAssignmentSchema } from "@/lib/validation/assignment";

async function verifyMembership(userId: string, assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { groupId: true },
  });
  if (!assignment) return null;

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: assignment.groupId, userId } },
  });
  return member ? assignment : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateSession();
    if (!user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true, adminId: true, joinCode: true } },
        _count: { select: { texts: true, reviewAssignments: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Oppgave ikke funnet" }, { status: 404 });
    }

    const phase = getAssignmentPhase(assignment.writeDeadline, assignment.reviewDeadline, assignment.isPaused);

    if (user.isAdmin) {
      if (!await canAccessGroup(assignment.groupId, user.id)) {
        return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
      }

      const reviewCount = await prisma.review.count({
        where: { reviewAssignment: { assignmentId: id, isActive: true } },
      });

      const members = await prisma.groupMember.count({
        where: { groupId: assignment.groupId },
      });

      return NextResponse.json({
        ...assignment,
        phase,
        stats: {
          memberCount: members,
          textCount: assignment._count.texts,
          reviewAssignmentCount: assignment._count.reviewAssignments,
          reviewCount,
        },
      });
    }

    // Student: verify membership
    const memberCheck = await verifyMembership(user.id, id);
    if (!memberCheck) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    // Check if feedback is available for the student
    let feedbackAvailable =
      assignment.feedbackOpen ||
      (assignment.feedbackDeadline && new Date(assignment.feedbackDeadline) <= new Date());

    // Check per-student unlock
    if (!feedbackAvailable) {
      const text = await prisma.text.findUnique({
        where: { assignmentId_authorId: { assignmentId: id, authorId: user.id } },
        select: { feedbackUnlocked: true },
      });
      if (text?.feedbackUnlocked) feedbackAvailable = true;
    }

    return NextResponse.json({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      taskText: assignment.taskText ?? null,
      writeDeadline: assignment.writeDeadline,
      reviewDeadline: assignment.reviewDeadline,
      minReviews: assignment.minReviews,
      distributionDone: assignment.distributionDone,
      feedbackAvailable: !!feedbackAvailable,
      feedbackDeadline: assignment.feedbackDeadline,
      timerEndAt: assignment.timerEndAt,
      timerLabel: assignment.timerLabel,
      isPaused: assignment.isPaused,
      isArchived: assignment.isArchived,
      groupName: assignment.group.name,
      phase,
      toolsConfig: assignment.toolsConfig ?? null,
      rubricConfig: assignment.rubricConfig ?? null,
      isExercise: assignment.isExercise,
      taskOption1: assignment.taskOption1 ?? null,
      taskOption2: assignment.taskOption2 ?? null,
      exerciseLanguage: assignment.exerciseLanguage ?? null,
      exerciseLanguage2: assignment.exerciseLanguage2 ?? null,
      requireTeacherFeedback: assignment.requireTeacherFeedback,
    });
  } catch (error) {
    console.error("Assignment GET error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.assignment.findUnique({ where: { id }, select: { groupId: true } });
    if (!existing || !await canAccessGroup(existing.groupId, admin.id)) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (data.writeDeadline) data.writeDeadline = new Date(data.writeDeadline as string);
    if (data.reviewDeadline) data.reviewDeadline = new Date(data.reviewDeadline as string);
    if (data.feedbackDeadline) data.feedbackDeadline = new Date(data.feedbackDeadline as string);
    if (data.feedbackDeadline === null) data.feedbackDeadline = null;

    const assignment = await prisma.assignment.update({
      where: { id },
      data,
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    // Verify ownership
    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { group: { select: { adminId: true } } },
    });
    if (!existing || existing.group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    await prisma.assignment.delete({ where: { id } });
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
