import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id, userId } = await params;

    // Owner-only
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group || group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    // userId may refer to a GroupTeacher.userId OR a GroupTeacherInvite.id
    await Promise.all([
      prisma.groupTeacher.deleteMany({ where: { groupId: id, userId } }),
      prisma.groupTeacherInvite.deleteMany({ where: { groupId: id, id: userId } }),
    ]);

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
