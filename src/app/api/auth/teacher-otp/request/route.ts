import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn").max(100),
  email: z.string().email("Ugyldig e-postadresse"),
});

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`otp-request:${ip}`, 3, 300_000);
    if (!allowed) {
      return NextResponse.json(
        { error: `For mange forsøk. Prøv igjen om ${Math.ceil(retryAfterMs / 60000)} minutter.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, email } = parsed.data;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "E-posttjeneste er ikke konfigurert" }, { status: 503 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.teacherOtp.upsert({
      where: { email },
      create: { email, name, code, expiresAt },
      update: { name, code, expiresAt },
    });

    const resend = new Resend(apiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Elevvurdering <onboarding@resend.dev>";

    const { error: mailError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Din bekreftelseskode — Elevvurdering",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="margin:0 0 8px;font-size:22px;color:#111">Hei, ${name}!</h2>
          <p style="margin:0 0 24px;color:#555;font-size:15px">
            Her er bekreftelseskoden din for å opprette lærerkonto på Elevvurdering:
          </p>
          <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:0.2em;color:#111">
              ${code}
            </span>
          </div>
          <p style="margin:0;color:#888;font-size:13px">
            Koden er gyldig i 15 minutter. Hvis du ikke ba om dette, kan du ignorere e-posten.
          </p>
        </div>
      `,
    });

    if (mailError) {
      console.error("Resend error:", mailError);
      return NextResponse.json({ error: "Kunne ikke sende e-post. Prøv igjen." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("OTP request error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
