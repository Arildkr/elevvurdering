import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    // Owner-only
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group || group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    // Find all active students in this group
    const members = await prisma.groupMember.findMany({
      where: { groupId: id },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId);

    // Deactivate all students and delete their sessions
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { id: { in: userIds }, isAdmin: false },
        data: { isActive: false },
      }),
      prisma.session.deleteMany({
        where: { userId: { in: userIds } },
      }),
    ]);

    return NextResponse.json({ success: true, deactivated: userIds.length });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("End year error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
