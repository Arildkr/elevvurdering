import { NextRequest, NextResponse } from "next/server";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { generateUniqueCandidateNumber } from "@/lib/candidate-number";
import { registerSchema } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  try {
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
        { error: "Ugyldig gruppekode" },
        { status: 404 }
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
