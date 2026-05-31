import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await prisma.groupTeacherInvite.findUnique({
      where: { id: token },
      include: {
        group: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitasjonen finnes ikke" }, { status: 404 });
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitasjonen er utløpt" }, { status: 410 });
    }

    return NextResponse.json({
      groupName: invite.group.name,
      invitedByName: invite.invitedBy.name,
      email: invite.email,
      expiresAt: invite.expiresAt,
    });
  } catch {
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { token } = await params;

    const invite = await prisma.groupTeacherInvite.findUnique({
      where: { id: token },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitasjonen finnes ikke" }, { status: 404 });
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitasjonen er utløpt" }, { status: 410 });
    }
    if (invite.email.toLowerCase() !== admin.email?.toLowerCase()) {
      return NextResponse.json({ error: "Denne invitasjonen er til en annen e-postadresse" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.groupTeacher.upsert({
        where: { groupId_userId: { groupId: invite.groupId, userId: admin.id } },
        create: { groupId: invite.groupId, userId: admin.id, invitedByAdminId: invite.invitedByAdminId },
        update: {},
      }),
      prisma.groupTeacherInvite.delete({ where: { id: token } }),
    ]);

    return NextResponse.json({ groupId: invite.groupId });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
