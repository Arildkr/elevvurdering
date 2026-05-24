import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { generateUniqueCandidateNumber } from "@/lib/candidate-number";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Koden må være 6 siffer"),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`otp-verify:${ip}`, 10, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: `For mange forsøk. Prøv igjen om ${Math.ceil(retryAfterMs / 1000)} sekunder.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, code } = parsed.data;

    const otp = await prisma.teacherOtp.findUnique({ where: { email } });

    if (!otp) {
      return NextResponse.json({ error: "Ugyldig eller utløpt kode" }, { status: 401 });
    }
    if (otp.expiresAt < new Date()) {
      await prisma.teacherOtp.delete({ where: { email } });
      return NextResponse.json({ error: "Koden er utløpt. Be om en ny." }, { status: 401 });
    }
    if (otp.code !== code) {
      return NextResponse.json({ error: "Feil kode. Prøv igjen." }, { status: 401 });
    }

    // Delete OTP first to ensure idempotency
    await prisma.teacherOtp.delete({ where: { email } });

    // Check if teacher with this email already exists (re-login flow)
    const existingTeacher = await prisma.user.findFirst({
      where: { email, isAdmin: true },
    });

    let teacher = existingTeacher;

    if (!teacher) {
      const kandidatnummer = await generateUniqueCandidateNumber();
      teacher = await prisma.user.create({
        data: { name: otp.name, email, kandidatnummer, isAdmin: true },
      });
    }
    await createSession(teacher.id);

    return NextResponse.json({
      id: teacher.id,
      name: teacher.name,
      kandidatnummer: teacher.kandidatnummer,
      isAdmin: true,
      isNewAccount: !existingTeacher,
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
