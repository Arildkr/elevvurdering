import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`login:${ip}`);

    if (!allowed) {
      return NextResponse.json(
        { error: `For mange forsøk. Prøv igjen om ${Math.ceil(retryAfterMs / 1000)} sekunder.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { kandidatnummer } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { kandidatnummer },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Ugyldig kandidatnummer" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Kontoen din er deaktivert. Kontakt lærer." },
        { status: 403 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      kandidatnummer: user.kandidatnummer,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Noe gikk galt ved innlogging" },
      { status: 500 }
    );
  }
}
