import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { reassignAfterDeactivation } from "@/lib/distribution";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
    }

    if (user.isAdmin) {
      return NextResponse.json({ error: "Kan ikke deaktivere admin-brukere" }, { status: 400 });
    }

    // Deactivate user
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Delete all sessions (force logout)
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    // Re-assign affected reviewers
    const reassigned = await reassignAfterDeactivation(id);

    return NextResponse.json({
      success: true,
      message: `Bruker deaktivert. ${reassigned} vurdering(er) re-tildelt.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Deactivate error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
