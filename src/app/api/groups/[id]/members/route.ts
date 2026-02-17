import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    // Verify ownership
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group || group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            kandidatnummer: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json(
      members.map((m: typeof members[number]) => ({
        ...m.user,
        joinedAt: m.joinedAt,
      }))
    );
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
