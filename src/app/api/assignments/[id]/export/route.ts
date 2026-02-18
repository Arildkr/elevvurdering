import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        group: { select: { adminId: true, name: true } },
      },
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
          include: {
            reviewer: { select: { name: true, kandidatnummer: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const format = request.nextUrl.searchParams.get("format");

    if (format === "csv") {
      return buildCsvExport(assignment, texts);
    }

    return buildHtmlExport(assignment, texts);
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

interface TextWithReviews {
  id: string;
  content: string;
  createdAt: Date;
  author: { name: string; kandidatnummer: string };
  reviews: {
    id: string;
    content: string;
    createdAt: Date;
    rejectedAt: Date | null;
    reviewer: { name: string; kandidatnummer: string };
  }[];
}

interface AssignmentData {
  title: string;
  description: string | null;
  group: { name: string };
  createdAt: Date;
}

function buildHtmlExport(assignment: AssignmentData, texts: TextWithReviews[]) {
  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const date = new Date().toLocaleDateString("no-NO");

  let html = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8">
<title>${escapeHtml(assignment.title)} - Eksport</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #1f2937; line-height: 1.6; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .meta { color: #6b7280; font-size: 14px; margin-bottom: 32px; }
  .text-section { margin-bottom: 48px; border-bottom: 2px solid #e5e7eb; padding-bottom: 32px; }
  .text-section:last-child { border-bottom: none; }
  .author { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
  .kandidatnr { font-family: monospace; color: #6b7280; font-size: 13px; }
  .text-content { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 16px 0; }
  .text-content h2 { font-size: 18px; margin: 0 0 8px; }
  .text-content h3 { font-size: 16px; margin: 0 0 8px; }
  .text-content p { margin: 0 0 8px; }
  .text-content mark { background: #fef08a; padding: 0 2px; }
  .reviews-header { font-size: 16px; font-weight: 600; color: #374151; margin: 24px 0 12px; }
  .review { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .review.rejected { border-color: #fca5a5; background: #fef2f2; }
  .reviewer-name { font-weight: 600; font-size: 14px; }
  .review-meta { color: #9ca3af; font-size: 12px; }
  .review-content { margin-top: 8px; }
  .review-content h2, .review-content h3 { font-size: 15px; margin: 0 0 4px; }
  .review-content p { margin: 0 0 4px; }
  .rejected-badge { background: #fee2e2; color: #dc2626; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
  .no-reviews { color: #9ca3af; font-style: italic; }
  @media print { body { padding: 0; } .text-section { page-break-inside: avoid; } }
</style>
</head>
<body>
<h1>${escapeHtml(assignment.title)}</h1>
<div class="meta">${escapeHtml(assignment.group.name)} &middot; Eksportert ${date} &middot; ${texts.length} tekster</div>
`;

  for (const text of texts) {
    const activeReviews = text.reviews.filter(r => !r.rejectedAt);
    html += `<div class="text-section">
<div class="author">${escapeHtml(text.author.name)}</div>
<div class="kandidatnr">${escapeHtml(text.author.kandidatnummer)} &middot; Levert ${text.createdAt.toLocaleDateString("no-NO")}</div>
<div class="text-content">${text.content}</div>
`;

    if (text.reviews.length > 0) {
      html += `<div class="reviews-header">Tilbakemeldinger (${activeReviews.length})</div>\n`;
      for (const review of text.reviews) {
        const cls = review.rejectedAt ? "review rejected" : "review";
        html += `<div class="${cls}">
<div class="reviewer-name">${escapeHtml(review.reviewer.name)} <span class="kandidatnr">${escapeHtml(review.reviewer.kandidatnummer)}</span>
${review.rejectedAt ? ' <span class="rejected-badge">Underkjent</span>' : ""}</div>
<div class="review-meta">${review.createdAt.toLocaleDateString("no-NO")}</div>
<div class="review-content">${review.content}</div>
</div>\n`;
      }
    } else {
      html += `<p class="no-reviews">Ingen tilbakemeldinger ennå.</p>\n`;
    }

    html += `</div>\n`;
  }

  html += `</body></html>`;

  const filename = `elevvurdering-${assignment.title.replace(/[^a-zA-Z0-9æøåÆØÅ ]/g, "").replace(/ /g, "-")}.html`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function buildCsvExport(assignment: AssignmentData, texts: TextWithReviews[]) {
  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
  const rows: string[] = [];
  rows.push("Forfatter,Kandidatnr,Tekst,Reviewer,Reviewer Kandidatnr,Tilbakemelding,Status,Dato");

  for (const text of texts) {
    if (text.reviews.length === 0) {
      rows.push(csvRow([text.author.name, text.author.kandidatnummer, stripHtml(text.content), "", "", "", "", ""]));
    } else {
      for (const review of text.reviews) {
        rows.push(
          csvRow([
            text.author.name,
            text.author.kandidatnummer,
            stripHtml(text.content),
            review.reviewer.name,
            review.reviewer.kandidatnummer,
            stripHtml(review.content),
            review.rejectedAt ? "Underkjent" : "Godkjent",
            review.createdAt.toISOString(),
          ])
        );
      }
    }
  }

  const csv = "\uFEFF" + rows.join("\n"); // BOM for Excel UTF-8
  const filename = `elevvurdering-${assignment.title.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvRow(values: string[]): string {
  return values.map((v: string) => `"${v.replace(/"/g, '""').replace(/\n/g, " ")}"`).join(",");
}
