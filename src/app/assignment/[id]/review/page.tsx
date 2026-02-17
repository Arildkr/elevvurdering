"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor, { RichTextViewer } from "@/components/RichTextEditor";

interface ReviewAssignmentData {
  id: string;
  textId: string;
  textContent: string;
  completed: boolean;
  review: { id: string; content: string } | null;
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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/assignments/${id}/my-review-assignment`);
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
  }, [id]);

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
            <Link href={`/assignment/${id}`} className="text-sm text-blue-600 hover:text-blue-700">
              &larr; Tilbake
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
            <Link href={`/assignment/${id}`} className="text-sm text-blue-600 hover:text-blue-700">
              &larr; Tilbake
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">Alle vurderinger fullført!</h2>
            <p className="text-gray-500 mb-4">Du kan nå se tilbakemeldinger på din egen tekst.</p>
            <Link
              href={`/assignment/${id}/feedback`}
              className="inline-block bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Se tilbakemeldinger
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Tekst å vurdere</h2>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <RichTextViewer content={currentAssignment?.textContent || ""} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Din vurdering</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <RichTextEditor
                content={reviewContent}
                onChange={setReviewContent}
                placeholder="Skriv din tilbakemelding her..."
                minHeight="150px"
              />
            </div>
            <div className="flex justify-between items-center mb-4">
              <p className={`text-sm ${charCount < 10 ? "text-amber-600" : "text-gray-500"}`}>
                {charCount} / minimum 10 tegn
              </p>
              <p className="text-xs text-gray-400">Lagres automatisk</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || charCount < 10}
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
