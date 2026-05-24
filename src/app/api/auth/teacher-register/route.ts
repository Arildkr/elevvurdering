import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { generateUniqueCandidateNumber } from "@/lib/candidate-number";
import { z } from "zod";

const teacherRegisterSchema = z.object({
  name: z
    .string()
    .min(2, "Navn må være minst 2 tegn")
    .max(100, "Navn kan ikke være over 100 tegn"),
  inviteCode: z.string().min(1, "Invitasjonskode er påkrevd"),
});

export async function POST(request: NextRequest) {
  try {
    const validCode = process.env.TEACHER_INVITE_CODE;
    if (!validCode) {
      return NextResponse.json(
        { error: "Lærerregistrering er ikke konfigurert" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = teacherRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, inviteCode } = parsed.data;

    if (inviteCode !== validCode) {
      return NextResponse.json(
        { error: "Ugyldig invitasjonskode" },
        { status: 401 }
      );
    }

    const kandidatnummer = await generateUniqueCandidateNumber();

    const teacher = await prisma.user.create({
      data: {
        name,
        kandidatnummer,
        isAdmin: true,
      },
    });

    await createSession(teacher.id);

    return NextResponse.json(
      {
        id: teacher.id,
        name: teacher.name,
        kandidatnummer: teacher.kandidatnummer,
        isAdmin: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Teacher registration error:", error);
    return NextResponse.json(
      { error: "Noe gikk galt ved registrering" },
      { status: 500 }
    );
  }
}
