import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession, requireAdmin } from "@/lib/auth";
import { createAssignmentSchema } from "@/lib/validation/assignment";
import { getAssignmentPhase } from "@/lib/phase";

export async function GET() {
  try {
    const user = await validateSession();
    if (!user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    if (user.isAdmin) {
      const assignments = await prisma.assignment.findMany({
        where: { group: { adminId: user.id } },
        include: {
          group: { select: { id: true, name: true } },
          _count: { select: { texts: true, reviewAssignments: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(
        assignments.map((a: typeof assignments[number]) => ({
          ...a,
          phase: getAssignmentPhase(a.writeDeadline, a.reviewDeadline),
        }))
      );
    }

    // Student: only assignments for their groups
    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m: typeof memberships[number]) => m.groupId);

    const assignments = await prisma.assignment.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get unread feedback counts for each assignment
    const assignmentsWithMeta = await Promise.all(
      assignments.map(async (a: typeof assignments[number]) => {
        const phase = getAssignmentPhase(a.writeDeadline, a.reviewDeadline);

        // Check if user has submitted text
        const text = await prisma.text.findUnique({
          where: { assignmentId_authorId: { assignmentId: a.id, authorId: user.id } },
          select: { id: true },
        });

        // Count unread feedback
        let unreadCount = 0;
        if (text) {
          unreadCount = await prisma.review.count({
            where: { textId: text.id, readAt: null, rejectedAt: null },
          });
        }

        // Count incomplete review assignments
        const pendingReviews = await prisma.reviewAssignment.count({
          where: { assignmentId: a.id, reviewerId: user.id, isActive: true, completed: false },
        });

        return {
          id: a.id,
          title: a.title,
          description: a.description,
          writeDeadline: a.writeDeadline,
          reviewDeadline: a.reviewDeadline,
          groupName: a.group.name,
          phase,
          hasSubmitted: !!text,
          unreadCount,
          pendingReviews,
        };
      })
    );

    return NextResponse.json(assignmentsWithMeta);
  } catch (error) {
    console.error("Assignments GET error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const parsed = createAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: parsed.data.groupId },
    });
    if (!group) {
      return NextResponse.json({ error: "Gruppe ikke funnet" }, { status: 404 });
    }
    if (group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang til denne gruppen" }, { status: 403 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        groupId: parsed.data.groupId,
        title: parsed.data.title,
        description: parsed.data.description,
        writeDeadline: new Date(parsed.data.writeDeadline),
        reviewDeadline: new Date(parsed.data.reviewDeadline),
        minReviews: parsed.data.minReviews,
        feedbackDeadline: parsed.data.feedbackDeadline
          ? new Date(parsed.data.feedbackDeadline)
          : null,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Assignments POST error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
