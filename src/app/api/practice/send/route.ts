import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  genre: z.enum(["skjønnlitteratur", "sakprosa"]),
  language: z.enum(["bokmål", "nynorsk"]),
  taskText: z.string().max(2000),
  content: z.string().min(50).max(200000),
});

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession();
    if (!user) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    if (user.isAdmin) return NextResponse.json({ error: "Kun for elever" }, { status: 403 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { genre, language, taskText, content } = parsed.data;

    // Find all groups this student belongs to
    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.id },
      include: {
        group: {
          include: {
            admin: { select: { name: true, email: true } },
            groupTeachers: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
      },
    });

    if (memberships.length === 0) {
      return NextResponse.json({ error: "Du er ikke meldt inn i noen gruppe ennå" }, { status: 400 });
    }

    // Collect unique teacher emails (admin + co-teachers), skip nulls
    const seen = new Set<string>();
    const recipients: { name: string; email: string }[] = [];
    for (const m of memberships) {
      const g = m.group;
      if (g.admin.email && !seen.has(g.admin.email)) {
        seen.add(g.admin.email);
        recipients.push({ name: g.admin.name, email: g.admin.email });
      }
      for (const ct of g.groupTeachers) {
        if (ct.user.email && !seen.has(ct.user.email)) {
          seen.add(ct.user.email);
          recipients.push({ name: ct.user.name, email: ct.user.email });
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "Ingen lærere med e-postadresse funnet" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Elevvurdering <onboarding@resend.dev>";
      const plainText = stripHtml(content);
      const genreLabel = genre === "skjønnlitteratur" ? "Skjønnlitterær tekst" : "Sakprosa";

      await Promise.all(
        recipients.map((r) =>
          resend.emails.send({
            from: fromEmail,
            to: r.email,
            subject: `Øvingstekst fra ${user.name} — ${genreLabel} (${language})`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
                <h2 style="margin:0 0 4px;font-size:20px;color:#111">Øvingstekst fra ${user.name}</h2>
                <p style="margin:0 0 24px;color:#888;font-size:13px">${genreLabel} · ${language} · Kandidatnr. ${user.kandidatnummer}</p>

                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:24px">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#1d4ed8;text-transform:uppercase;letter-spacing:.05em">Oppgave</p>
                  <p style="margin:0;color:#1e3a5f;font-size:14px;line-height:1.6">${taskText}</p>
                </div>

                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Elevens tekst</p>
                  <div style="color:#111;font-size:15px;line-height:1.7;white-space:pre-wrap">${plainText}</div>
                </div>

                <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Sendt via Elevvurdering — elevdrevet øving</p>
              </div>
            `,
          }).catch((err) => console.error("Practice send error:", err))
        )
      );
    }

    return NextResponse.json({ sentTo: recipients.map((r) => r.name) });
  } catch (error) {
    console.error("Practice send error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
