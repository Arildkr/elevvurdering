import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canAccessGroup } from "@/lib/group-access";
import { Resend } from "resend";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (!await canAccessGroup(id, admin.id)) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const [coTeachers, pendingInvites] = await Promise.all([
      prisma.groupTeacher.findMany({
        where: { groupId: id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.groupTeacherInvite.findMany({
        where: { groupId: id, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({ coTeachers, pendingInvites });
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

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const email: string = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Ugyldig e-postadresse" }, { status: 400 });
    }

    // Check if already a co-teacher (via existing User account)
    const existingUser = await prisma.user.findFirst({ where: { email, isAdmin: true } });
    if (existingUser) {
      const alreadyTeacher = await prisma.groupTeacher.findUnique({
        where: { groupId_userId: { groupId: id, userId: existingUser.id } },
      });
      if (alreadyTeacher) {
        return NextResponse.json({ error: "Denne læreren har allerede tilgang" }, { status: 409 });
      }
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.groupTeacherInvite.upsert({
      where: { groupId_email: { groupId: id, email } },
      create: { groupId: id, email, invitedByAdminId: admin.id, expiresAt },
      update: { invitedByAdminId: admin.id, expiresAt },
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Elevvurdering <onboarding@resend.dev>";
      const origin = request.headers.get("origin") || "https://elevvurdering.no";
      const inviteUrl = `${origin}/invite/${invite.id}`;

      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `${admin.name} inviterer deg som medlærer — Elevvurdering`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px;font-size:22px;color:#111">Du er invitert som medlærer</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px">
              <strong>${admin.name}</strong> inviterer deg til å bli medlærer i gruppen
              <strong>${group.name}</strong> på Elevvurdering.
            </p>
            <a href="${inviteUrl}"
               style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
              Godta invitasjon
            </a>
            <div style="margin:24px 0 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px">
              <p style="margin:0 0 8px;font-size:13px;color:#374151;font-weight:600">Slik fungerer det:</p>
              <ol style="margin:0;padding-left:20px;color:#6b7280;font-size:13px;line-height:1.7">
                <li>Klikk på knappen over</li>
                <li>Logg inn med e-postadressen <strong>${email}</strong> (ny konto opprettes automatisk om du ikke har en)</li>
                <li>Du legges automatisk til i gruppen</li>
              </ol>
            </div>
            <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">Lenken er gyldig i 7 dager.</p>
          </div>
        `,
      }).catch((err) => console.error("Invite email error:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Invite teacher error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
