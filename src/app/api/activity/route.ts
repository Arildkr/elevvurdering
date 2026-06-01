import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";

export interface ActivityEvent {
  id: string;
  type:
    | "text_submitted"
    | "text_updated"
    | "review_submitted"
    | "review_rejected"
    | "member_joined";
  timestamp: string;
  assignmentTitle?: string;
  assignmentId?: string;
  groupName?: string;
  groupId?: string;
  studentName: string;
}

const LIMIT = 30;

export async function GET() {
  try {
    const user = await validateSession();
    if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

    // Groups the teacher owns or co-teaches
    const [ownedGroups, caughtGroups] = await Promise.all([
      prisma.group.findMany({ where: { adminId: user.id }, select: { id: true } }),
      prisma.groupTeacher.findMany({ where: { userId: user.id }, select: { groupId: true } }),
    ]);
    const groupIds = [
      ...ownedGroups.map((g) => g.id),
      ...caughtGroups.map((g) => g.groupId),
    ];
    if (groupIds.length === 0) return NextResponse.json([]);

    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days

    const [texts, reviews, rejections, joins] = await Promise.all([
      // Text submissions (createdAt) and updates (updatedAt > createdAt + 60s)
      prisma.text.findMany({
        where: {
          assignment: { groupId: { in: groupIds } },
          createdAt: { gte: cutoff },
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { name: true } },
          assignment: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
      }),

      // Reviews submitted
      prisma.review.findMany({
        where: {
          rejectedAt: null,
          text: { assignment: { groupId: { in: groupIds } } },
          createdAt: { gte: cutoff },
        },
        select: {
          id: true,
          createdAt: true,
          reviewer: { select: { name: true } },
          text: { select: { assignment: { select: { id: true, title: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
      }),

      // Rejected reviews
      prisma.review.findMany({
        where: {
          rejectedAt: { not: null, gte: cutoff },
          text: { assignment: { groupId: { in: groupIds } } },
        },
        select: {
          id: true,
          rejectedAt: true,
          reviewer: { select: { name: true } },
          text: { select: { assignment: { select: { id: true, title: true } } } },
        },
        orderBy: { rejectedAt: "desc" },
        take: LIMIT,
      }),

      // Group member joins
      prisma.groupMember.findMany({
        where: {
          groupId: { in: groupIds },
          joinedAt: { gte: cutoff },
        },
        select: {
          id: true,
          joinedAt: true,
          user: { select: { name: true } },
          group: { select: { id: true, name: true } },
        },
        orderBy: { joinedAt: "desc" },
        take: LIMIT,
      }),
    ]);

    const events: ActivityEvent[] = [];

    for (const t of texts) {
      events.push({
        id: `text-${t.id}`,
        type: "text_submitted",
        timestamp: t.createdAt.toISOString(),
        assignmentTitle: t.assignment.title,
        assignmentId: t.assignment.id,
        studentName: t.author.name,
      });
      // If updated significantly after creation, add an update event
      if (t.updatedAt.getTime() - t.createdAt.getTime() > 60_000 && t.updatedAt >= cutoff) {
        events.push({
          id: `text-upd-${t.id}`,
          type: "text_updated",
          timestamp: t.updatedAt.toISOString(),
          assignmentTitle: t.assignment.title,
          assignmentId: t.assignment.id,
          studentName: t.author.name,
        });
      }
    }

    for (const r of reviews) {
      events.push({
        id: `review-${r.id}`,
        type: "review_submitted",
        timestamp: r.createdAt.toISOString(),
        assignmentTitle: r.text.assignment.title,
        assignmentId: r.text.assignment.id,
        studentName: r.reviewer.name,
      });
    }

    for (const r of rejections) {
      events.push({
        id: `reject-${r.id}`,
        type: "review_rejected",
        timestamp: r.rejectedAt!.toISOString(),
        assignmentTitle: r.text.assignment.title,
        assignmentId: r.text.assignment.id,
        studentName: r.reviewer.name,
      });
    }

    for (const m of joins) {
      events.push({
        id: `join-${m.id}`,
        type: "member_joined",
        timestamp: m.joinedAt.toISOString(),
        groupName: m.group.name,
        groupId: m.group.id,
        studentName: m.user.name,
      });
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(events.slice(0, LIMIT));
  } catch (error) {
    console.error("Activity GET error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
