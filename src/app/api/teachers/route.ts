import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await requireAdmin();

    const [teachers, ownedGroups, coTeacherLinks] = await Promise.all([
      prisma.user.findMany({
        where: { isAdmin: true },
        select: {
          id: true,
          name: true,
          email: true,
          kandidatnummer: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.group.findMany({
        where: { adminId: admin.id },
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.groupTeacher.findMany({
        where: { group: { adminId: admin.id } },
        select: {
          userId: true,
          groupId: true,
          group: { select: { name: true } },
        },
      }),
    ]);

    const membershipsByUser = new Map<string, { id: string; name: string }[]>();
    for (const link of coTeacherLinks) {
      if (!membershipsByUser.has(link.userId)) membershipsByUser.set(link.userId, []);
      membershipsByUser.get(link.userId)!.push({ id: link.groupId, name: link.group.name });
    }

    const enriched = teachers.map((t) => ({
      ...t,
      isSelf: t.id === admin.id,
      groupMemberships: membershipsByUser.get(t.id) ?? [],
    }));

    return NextResponse.json({ teachers: enriched, ownedGroups });
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
