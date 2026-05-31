import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canAccessGroup } from "@/lib/group-access";
import * as XLSX from "xlsx";

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
        group: { select: { name: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Oppgave ikke funnet" }, { status: 404 });
    }
    if (!await canAccessGroup(assignment.groupId, admin.id)) {
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
        teacherFeedbacks: {
          select: { content: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const format = request.nextUrl.searchParams.get("format");

    if (format === "pdf") {
      return buildPdfExport(assignment, texts);
    }
    if (format === "xlsx") {
      return buildXlsxExport(assignment, texts);
    }
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
  revisedContent: string | null;
  revisedAt: Date | null;
  createdAt: Date;
  author: { name: string; kandidatnummer: string };
  reviews: {
    id: string;
    content: string;
    createdAt: Date;
    rejectedAt: Date | null;
    reviewer: { name: string; kandidatnummer: string };
  }[];
  teacherFeedbacks: { content: string; createdAt: Date }[];
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
  .section-header { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 10px; padding: 6px 12px; border-radius: 4px; }
  .section-header.draft1 { background: #eff6ff; color: #1d4ed8; }
  .section-header.feedback { background: #f9fafb; color: #374151; }
  .section-header.draft2 { background: #f0fdf4; color: #15803d; }
  .review { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .review.rejected { border-color: #fca5a5; background: #fef2f2; }
  .review.teacher { border-color: #e9d5ff; background: #faf5ff; }
  .reviewer-name { font-weight: 600; font-size: 14px; }
  .review-meta { color: #9ca3af; font-size: 12px; }
  .review-content { margin-top: 8px; }
  .review-content h2, .review-content h3 { font-size: 15px; margin: 0 0 4px; }
  .review-content p { margin: 0 0 4px; }
  .rejected-badge { background: #fee2e2; color: #dc2626; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
  .no-reviews { color: #9ca3af; font-style: italic; }
  .revised-content { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 8px 0; }
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

<div class="section-header draft1">1. utkast</div>
<div class="text-content">${text.content}</div>

<div class="section-header feedback">Tilbakemeldinger fra medelever (${activeReviews.length})</div>
`;

    if (text.teacherFeedbacks.length > 0) {
      for (const tf of text.teacherFeedbacks) {
        html += `<div class="review teacher">
<div class="reviewer-name">Lærer</div>
<div class="review-meta">${tf.createdAt.toLocaleDateString("no-NO")}</div>
<div class="review-content"><p>${escapeHtml(tf.content)}</p></div>
</div>\n`;
      }
    }

    if (activeReviews.length > 0) {
      for (const review of text.reviews) {
        const cls = review.rejectedAt ? "review rejected" : "review";
        html += `<div class="${cls}">
<div class="reviewer-name">Anonym medelev${review.rejectedAt ? ' <span class="rejected-badge">Underkjent</span>' : ""}</div>
<div class="review-meta">${review.createdAt.toLocaleDateString("no-NO")}</div>
<div class="review-content">${review.content}</div>
</div>\n`;
      }
    } else {
      html += `<p class="no-reviews">Ingen tilbakemeldinger.</p>\n`;
    }

    html += `<div class="section-header draft2">2. utkast (forbedret)</div>\n`;
    if (text.revisedContent) {
      html += `<div class="revised-content">${text.revisedContent}</div>
<div class="review-meta" style="margin-top:4px">Levert ${text.revisedAt ? text.revisedAt.toLocaleDateString("no-NO") : ""}</div>\n`;
    } else {
      html += `<p class="no-reviews">Ikke levert forbedret utkast.</p>\n`;
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

function buildXlsxExport(assignment: AssignmentData, texts: TextWithReviews[]) {
  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

  const rows: (string | number)[][] = [[
    "Forfatter", "Kandidatnr", "Levert dato",
    "1. utkast", "Tilbakemelding", "Status tilbakemelding",
    "2. utkast (forbedret)", "2. utkast dato",
  ]];

  for (const text of texts) {
    const activeReviews = text.reviews.filter((r) => !r.rejectedAt);
    if (activeReviews.length === 0) {
      rows.push([
        text.author.name, text.author.kandidatnummer,
        text.createdAt.toLocaleDateString("no-NO"),
        stripHtml(text.content), "", "",
        stripHtml(text.revisedContent ?? ""),
        text.revisedAt ? text.revisedAt.toLocaleDateString("no-NO") : "",
      ]);
    } else {
      for (let i = 0; i < activeReviews.length; i++) {
        rows.push([
          i === 0 ? text.author.name : "",
          i === 0 ? text.author.kandidatnummer : "",
          i === 0 ? text.createdAt.toLocaleDateString("no-NO") : "",
          i === 0 ? stripHtml(text.content) : "",
          stripHtml(activeReviews[i].content),
          "Godkjent",
          i === 0 ? stripHtml(text.revisedContent ?? "") : "",
          i === 0 && text.revisedAt ? text.revisedAt.toLocaleDateString("no-NO") : "",
        ]);
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 22 }, { wch: 12 }, { wch: 12 },
    { wch: 50 }, { wch: 50 }, { wch: 18 },
    { wch: 50 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Elevvurdering");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `elevvurdering-${assignment.title.replace(/[^a-zA-Z0-9æøåÆØÅ ]/g, "").replace(/ /g, "-")}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function buildCsvExport(assignment: AssignmentData, texts: TextWithReviews[]) {
  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
  const rows: string[] = [];
  rows.push("Forfatter,Kandidatnr,1. utkast,Tilbakemelding (anonym),Status,2. utkast (forbedret),2. utkast dato");

  for (const text of texts) {
    if (text.reviews.length === 0) {
      rows.push(csvRow([
        text.author.name, text.author.kandidatnummer,
        stripHtml(text.content), "", "",
        stripHtml(text.revisedContent ?? ""),
        text.revisedAt ? text.revisedAt.toLocaleDateString("no-NO") : "",
      ]));
    } else {
      for (let i = 0; i < text.reviews.length; i++) {
        const review = text.reviews[i];
        rows.push(csvRow([
          text.author.name, text.author.kandidatnummer,
          i === 0 ? stripHtml(text.content) : "",
          stripHtml(review.content),
          review.rejectedAt ? "Underkjent" : "Godkjent",
          i === 0 ? stripHtml(text.revisedContent ?? "") : "",
          i === 0 && text.revisedAt ? text.revisedAt.toLocaleDateString("no-NO") : "",
        ]));
      }
    }
  }

  const csv = "﻿" + rows.join("\n");
  const filename = `elevvurdering-${assignment.title.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvRow(values: string[]): string {
  return values.map((v) => `"${v.replace(/"/g, '""').replace(/\n/g, " ")}"`).join(",");
}

function buildPdfExport(assignment: AssignmentData, texts: TextWithReviews[]) {
  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const date = new Date().toLocaleDateString("no-NO");

  let body = "";
  for (const text of texts) {
    const activeReviews = text.reviews.filter(r => !r.rejectedAt);
    body += `<div class="student-page">
<div class="student-header">
  <div class="student-name">${escapeHtml(text.author.name)}</div>
  <div class="student-meta">${escapeHtml(text.author.kandidatnummer)} &middot; Levert ${text.createdAt.toLocaleDateString("no-NO")}</div>
</div>
<div class="section-label draft1">1. utkast</div>
<div class="text-box">${text.content}</div>
<div class="section-label feedback">Tilbakemeldinger fra medelever (${activeReviews.length})</div>`;

    if (text.teacherFeedbacks.length > 0) {
      for (const tf of text.teacherFeedbacks) {
        body += `<div class="review teacher-review"><strong>L\u00E6rer</strong><div>${escapeHtml(tf.content)}</div></div>`;
      }
    }
    if (activeReviews.length > 0) {
      for (const r of activeReviews) {
        body += `<div class="review"><div class="review-content">${r.content}</div></div>`;
      }
    } else {
      body += `<p class="none">Ingen tilbakemeldinger.</p>`;
    }

    body += `<div class="section-label draft2">2. utkast (forbedret)</div>`;
    if (text.revisedContent) {
      body += `<div class="text-box revised">${text.revisedContent}</div>`;
    } else {
      body += `<p class="none">Ikke levert forbedret utkast.</p>`;
    }
    body += `</div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8">
<title>${escapeHtml(assignment.title)} \u2013 PDF</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, serif; font-size: 11pt; color: #111; margin: 0; }
  @page { size: A4; margin: 20mm 18mm; }
  .student-page { page-break-before: always; }
  .student-page:first-child { page-break-before: auto; }
  .report-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 20px; }
  .report-header h1 { font-size: 16pt; margin: 0 0 4px; }
  .report-header .meta { font-size: 9pt; color: #555; }
  .student-name { font-size: 14pt; font-weight: bold; margin-bottom: 2px; }
  .student-meta { font-size: 9pt; color: #666; margin-bottom: 14px; }
  .section-label { font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; margin: 14px 0 6px; padding: 3px 8px; border-radius: 3px; display: inline-block; }
  .draft1 { background: #dbeafe; color: #1e40af; }
  .feedback { background: #f3f4f6; color: #374151; }
  .draft2 { background: #dcfce7; color: #166534; }
  .text-box { border: 1px solid #d1d5db; border-radius: 4px; padding: 10px 14px; margin-bottom: 6px; line-height: 1.6; }
  .text-box p, .review-content p { margin: 0 0 6px; }
  .revised { border-color: #86efac; background: #f0fdf4; }
  .review { border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 12px; margin-bottom: 8px; }
  .teacher-review { border-color: #d8b4fe; background: #faf5ff; }
  .none { color: #9ca3af; font-style: italic; font-size: 10pt; }
</style>
</head>
<body>
<div class="report-header">
  <h1>${escapeHtml(assignment.title)}</h1>
  <div class="meta">${escapeHtml(assignment.group.name)} &middot; Eksportert ${date} &middot; ${texts.length} elever</div>
</div>
${body}
<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
