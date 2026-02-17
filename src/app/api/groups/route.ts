import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createGroupSchema } from "@/lib/validation/group";

export async function GET() {
  try {
    const admin = await requireAdmin();

    const groups = await prisma.group.findMany({
      where: { adminId: admin.id },
      include: {
        _count: { select: { members: true, assignments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(groups);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Groups GET error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.group.findUnique({
      where: { joinCode: parsed.data.joinCode },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Gruppekoden er allerede i bruk" },
        { status: 409 }
      );
    }

    const group = await prisma.group.create({
      data: {
        name: parsed.data.name,
        joinCode: parsed.data.joinCode,
        adminId: admin.id,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Groups POST error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
