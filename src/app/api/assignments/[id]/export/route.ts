import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { group: { select: { adminId: true } } },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Oppgave ikke funnet" }, { status: 404 });
    }
    if (assignment.group.adminId !== admin.id) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const texts = await prisma.text.findMany({
      where: { assignmentId: id },
      include: {
        author: { select: { name: true, kandidatnummer: true } },
        reviews: {
          where: { rejectedAt: null },
          include: {
            reviewer: { select: { name: true, kandidatnummer: true } },
          },
        },
      },
    });

    // Build CSV
    const rows: string[] = [];
    rows.push("Forfatter,Forfatter Kandidatnr,Tekst (utdrag),Reviewer,Reviewer Kandidatnr,Tilbakemelding,Dato");

    for (const text of texts) {
      if (text.reviews.length === 0) {
        rows.push(
          csvRow([
            text.author.name,
            text.author.kandidatnummer,
            text.content.substring(0, 100),
            "",
            "",
            "",
            "",
          ])
        );
      } else {
        for (const review of text.reviews) {
          rows.push(
            csvRow([
              text.author.name,
              text.author.kandidatnummer,
              text.content.substring(0, 100),
              review.reviewer.name,
              review.reviewer.kandidatnummer,
              review.content,
              review.createdAt.toISOString(),
            ])
          );
        }
      }
    }

    const csv = rows.join("\n");
    const filename = `elevvurdering-${assignment.title.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    console.error("Export error:", error);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}

function csvRow(values: string[]): string {
  return values.map((v) => `"${v.replace(/"/g, '""').replace(/\n/g, " ")}"`).join(",");
}
