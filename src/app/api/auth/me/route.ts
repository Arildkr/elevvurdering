import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await validateSession();

    if (!user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    // Get group memberships
    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.id },
      include: {
        group: {
          select: { id: true, name: true, joinCode: true },
        },
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      kandidatnummer: user.kandidatnummer,
      isAdmin: user.isAdmin,
      groups: memberships.map((m: typeof memberships[number]) => m.group),
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json(
      { error: "Noe gikk galt" },
      { status: 500 }
    );
  }
}
