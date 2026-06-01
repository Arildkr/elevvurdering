"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor, { RichTextViewer } from "@/components/RichTextEditor";
import { parseToolsConfig, type PhaseTools } from "@/lib/tools-config";

interface ReviewAssignmentData {
  id: string;
  textId: string;
  textContent: string;
  completed: boolean;
  review: { id: string; content: string; rejectedAt: string | null; rejectionReason: string | null } | null;
}

interface AssignmentMeta {
  title: string;
  taskText?: string | null;
  phase: "writing" | "review" | "closed" | "paused";
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assignments, setAssignments] = useState<ReviewAssignmentData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [reviewTools, setReviewTools] = useState<PhaseTools | null>(null);
  const [assignmentMeta, setAssignmentMeta] = useState<AssignmentMeta | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [res, assignRes] = await Promise.all([
          fetch(`/api/assignments/${id}/my-review-assignment`),
          fetch(`/api/assignments/${id}`),
        ]);
        if (assignRes.ok) {
          const aData = await assignRes.json();
          setReviewTools(parseToolsConfig(aData.toolsConfig).review);
          setAssignmentMeta({
            title: aData.title,
            taskText: aData.taskText ?? null,
            phase: aData.phase,
          });
          if (aData.phase === "paused" || aData.phase === "closed") {
            router.push(`/assignment/${id}`);
            return;
          }
        }
        if (res.ok) {
          const data: ReviewAssignmentData[] = await res.json();
          setAssignments(data);

          const firstIncomplete = data.findIndex((a) => !a.completed);
          if (firstIncomplete >= 0) {
            setCurrentIndex(firstIncomplete);
            const saved = localStorage.getItem(`review-draft-${data[firstIncomplete].id}`);
            if (saved) setReviewContent(saved);
          } else if (data.length > 0) {
            setSuccess(true);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  // Poll for phase changes — redirect if teacher pauses or closes
  useEffect(() => {
    if (success || loading) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/assignments/${id}`);
        if (!res.ok) return;
        const aData = await res.json();
        setAssignmentMeta((prev) => prev ? { ...prev, phase: aData.phase } : prev);
        if (aData.phase === "paused" || aData.phase === "closed") {
          router.push(`/assignment/${id}`);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [id, success, loading, router]);

  const currentAssignment = assignments[currentIndex];
  const autoSave = useCallback(() => {
    if (currentAssignment && reviewContent.length > 0) {
      localStorage.setItem(`review-draft-${currentAssignment.id}`, reviewContent);
    }
  }, [currentAssignment, reviewContent]);

  useEffect(() => {
    const interval = setInterval(autoSave, 5000);
    return () => clearInterval(interval);
  }, [autoSave]);

  function textLength(html: string): number {
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentAssignment) return;
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewAssignmentId: currentAssignment.id,
          content: reviewContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Noe gikk galt");
        return;
      }

      localStorage.removeItem(`review-draft-${currentAssignment.id}`);

      const updatedAssignments = [...assignments];
      updatedAssignments[currentIndex] = { ...currentAssignment, completed: true };
      setAssignments(updatedAssignments);

      const nextIncomplete = updatedAssignments.findIndex((a, i) => i > currentIndex && !a.completed);
      if (nextIncomplete >= 0) {
        setCurrentIndex(nextIncomplete);
        setReviewContent("");
        const saved = localStorage.getItem(`review-draft-${updatedAssignments[nextIncomplete].id}`);
        if (saved) setReviewContent(saved);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Laster...</div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="min-h-screen">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <Link href={`/assignment/${id}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4"/></svg>
              Tilbake
            </Link>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Du har ingen tildelte tekster å vurdere ennå.</p>
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <Link href={`/assignment/${id}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4"/></svg>
              Tilbake
            </Link>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Alle vurderinger levert!</h2>
            <p className="text-gray-500 mb-6">
              Bra jobbet. Tilbakemeldinger på din egen tekst blir tilgjengelige når læreren åpner dem.
            </p>
            <Link
              href={`/assignment/${id}`}
              className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Tilbake til oppgaven
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const charCount = textLength(reviewContent);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/assignment/${id}`} className="text-sm text-blue-600 hover:text-blue-700">
            &larr; Tilbake
          </Link>
          <span className="text-sm text-gray-500">
            Vurdering {currentIndex + 1} av {assignments.length}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">

        {/* Assignment context */}
        {assignmentMeta && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Oppgave</p>
            <p className="font-semibold text-gray-900">{assignmentMeta.title}</p>
            {assignmentMeta.taskText && (
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{assignmentMeta.taskText}</p>
            )}
          </div>
        )}

        {/* Text to review */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Tekst å vurdere</h2>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <RichTextViewer content={currentAssignment?.textContent || ""} />
          </div>
        </div>

        {/* Review editor */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Din vurdering</h2>

          {/* Rejection notice */}
          {currentAssignment?.review?.rejectedAt && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 mb-4 text-sm">
              <p className="font-semibold text-yellow-900 mb-1">Tilbakemeldingen din ble underkjent</p>
              {currentAssignment.review.rejectionReason ? (
                <p className="text-yellow-800">{currentAssignment.review.rejectionReason}</p>
              ) : (
                <p className="text-yellow-700">Skriv en ny og mer utfyllende tilbakemelding.</p>
              )}
            </div>
          )}

          {/* Feedback guide */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm">
            <p className="font-semibold text-amber-900 mb-2">To stjerner og et ønske</p>
            <div className="space-y-1.5 text-amber-800">
              <p>⭐ <strong>Stjerne 1</strong> — noe som fungerer bra i teksten</p>
              <p>⭐ <strong>Stjerne 2</strong> — noe annet som er bra, f.eks. språk, struktur eller innhold</p>
              <p>✨ <strong>Ønske</strong> — ett konkret forslag til hva de kan forbedre</p>
            </div>
            <details className="mt-3">
              <summary className="text-xs text-amber-700 cursor-pointer hover:text-amber-900 font-medium select-none">
                Setningsstartere og tips ▾
              </summary>
              <div className="mt-2 space-y-2 text-xs text-amber-800">
                <div>
                  <p className="font-semibold mb-1">Stjerne:</p>
                  <p className="text-amber-700 italic">«Jeg synes det fungerte bra at …» · «Du beskriver … på en god måte» · «Innledningen din fanget oppmerksomheten min fordi …» · «Jeg liker at du bruker …»</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Ønske:</p>
                  <p className="text-amber-700 italic">«Jeg savnet mer om …» · «Hva om du prøvde å …?» · «Avslutningen kunne vært sterkere hvis …» · «Det kan hende teksten blir tydeligere om du …»</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Hva kan du se etter?</p>
                  <p className="text-amber-700">Innledning og avslutning · Oppbygging og avsnitt · Varierte setninger · Konkrete detaljer og eksempler · Rettskriving og tegnsetting</p>
                </div>
              </div>
            </details>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <RichTextEditor
                content={reviewContent}
                onChange={setReviewContent}
                placeholder="Skriv din tilbakemelding her..."
                minHeight="150px"
                availableTools={reviewTools ?? undefined}
              />
            </div>
            <div className="flex justify-between items-center mb-4">
              <p className={`text-sm ${charCount < 50 ? "text-amber-600" : "text-gray-500"}`}>
                {charCount} / minimum 50 tegn
              </p>
              <p className="text-xs text-gray-400">Lagres lokalt automatisk</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || charCount < 50}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Sender..." : "Send vurdering"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
