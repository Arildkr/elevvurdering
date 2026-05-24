import { NextRequest, NextResponse } from "next/server";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { generateUniqueCandidateNumber } from "@/lib/candidate-number";
import { registerSchema } from "@/lib/validation/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`register:${ip}`, 5, 300_000);

    if (!allowed) {
      return NextResponse.json(
        { error: `For mange registreringsforsøk. Prøv igjen om ${Math.ceil(retryAfterMs / 60000)} minutter.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, joinCode } = parsed.data;

    // Find group by join code
    const group = await prisma.group.findUnique({
      where: { joinCode },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Gruppekoden er ikke gyldig. Kontroller stavingen og prøv igjen." },
        { status: 400 }
      );
    }

    // Check if a user with this email already exists in this group
    const existingInGroup = await prisma.groupMember.findFirst({
      where: {
        groupId: group.id,
        user: { name: name.toLowerCase() },
      },
    });

    if (existingInGroup) {
      return NextResponse.json(
        { error: "Du har allerede registrert deg. Logg inn med kandidatnummeret ditt." },
        { status: 400 }
      );
    }

    // Generate unique candidate number
    const kandidatnummer = await generateUniqueCandidateNumber();

    // Create user and group membership in a transaction
    const user = await prisma.$transaction(async (tx: TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          name,
          kandidatnummer,
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: newUser.id,
        },
      });

      return newUser;
    });

    // Create session
    await createSession(user.id);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      kandidatnummer: user.kandidatnummer,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Noe gikk galt ved registrering" },
      { status: 500 }
    );
  }
}
