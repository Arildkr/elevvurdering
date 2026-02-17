"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor, { RichTextViewer } from "@/components/RichTextEditor";

export default function SubmitTextPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [existingText, setExistingText] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timerEndAt, setTimerEndAt] = useState<string | null>(null);
  const [timerLabel, setTimerLabel] = useState<string | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [textRes, assignRes] = await Promise.all([
          fetch(`/api/assignments/${id}/my-text`),
          fetch(`/api/assignments/${id}`),
        ]);
        if (textRes.ok) {
          const data = await textRes.json();
          if (data.text) {
            setContent(data.text.content);
            setExistingText(true);
            setCanEdit(data.canEdit);
          }
          if (!data.canSubmit && !data.text) {
            router.push(`/assignment/${id}`);
          }
        }
        if (assignRes.ok) {
          const aData = await assignRes.json();
          setTimerEndAt(aData.timerEndAt);
          setTimerLabel(aData.timerLabel);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  // Timer countdown
  useEffect(() => {
    if (!timerEndAt) { setTimerRemaining(null); return; }
    function tick() {
      const diff = new Date(timerEndAt!).getTime() - Date.now();
      if (diff <= 0) { setTimerRemaining("00:00"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimerRemaining(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerEndAt]);

  // Strip HTML tags for character counting
  function textLength(html: string): number {
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const method = existingText ? "PUT" : "POST";
      const res = await fetch(`/api/assignments/${id}/my-text`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Noe gikk galt");
        return;
      }

      router.push(`/assignment/${id}`);
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

  if (existingText && !canEdit) {
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Din tekst</h1>
            <div className="bg-gray-50 rounded-lg p-4">
              <RichTextViewer content={content} />
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Teksten kan ikke redigeres (frist utløpt eller tildeling er gjort).
            </p>
          </div>
        </main>
      </div>
    );
  }

  const charCount = textLength(content);

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
        {timerEndAt && timerRemaining !== null && (
          <div className={`rounded-xl border-2 p-4 mb-6 text-center ${
            timerRemaining === "00:00" ? "border-red-300 bg-red-50" : "border-blue-300 bg-blue-50"
          }`}>
            <div className={`text-4xl font-mono font-bold ${
              timerRemaining === "00:00" ? "text-red-600" : "text-blue-600"
            }`}>
              {timerRemaining}
            </div>
            {timerLabel && (
              <p className={`text-sm mt-1 font-medium ${
                timerRemaining === "00:00" ? "text-red-600" : "text-blue-600"
              }`}>{timerLabel}</p>
            )}
            {timerRemaining === "00:00" && (
              <p className="text-red-600 font-semibold mt-1">Tiden er ute!</p>
            )}
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            {existingText ? "Rediger tekst" : "Lever tekst"}
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Skriv teksten din her..."
                minHeight="300px"
              />
              <div className="flex justify-between mt-2">
                <p className={`text-sm ${charCount < 50 ? "text-amber-600" : "text-gray-500"}`}>
                  {charCount} / minimum 50 tegn
                </p>
              </div>
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
              {submitting ? "Lagrer..." : existingText ? "Lagre endringer" : "Lever tekst"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
