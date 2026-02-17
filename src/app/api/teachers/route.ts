import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { generateUniqueCandidateNumber } from "@/lib/candidate-number";
import { z } from "zod";

const createTeacherSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn").max(100),
});

export async function GET() {
  try {
    await requireAdmin();

    const teachers = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        name: true,
        kandidatnummer: true,
        isActive: true,
        createdAt: true,
        _count: { select: { createdGroups: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(teachers);
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

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const parsed = createTeacherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const kandidatnummer = await generateUniqueCandidateNumber();

    const teacher = await prisma.user.create({
      data: {
        name: parsed.data.name,
        kandidatnummer,
        isAdmin: true,
      },
    });

    return NextResponse.json(
      { id: teacher.id, name: teacher.name, kandidatnummer: teacher.kandidatnummer },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Create teacher error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
