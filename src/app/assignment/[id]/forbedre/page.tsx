"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RichTextEditor, { RichTextViewer } from "@/components/RichTextEditor";
import { parseToolsConfig, type PhaseTools } from "@/lib/tools-config";

interface Feedback {
  id: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export default function ForbedreePage() {
  const { id } = useParams<{ id: string }>();
  const [originalText, setOriginalText] = useState("");
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [teacherFeedback, setTeacherFeedback] = useState<Feedback[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");
  const [feedbackClosed, setFeedbackClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [revisedContent, setRevisedContent] = useState("");
  const [revisedAt, setRevisedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [forbedreTools, setForbedreTools] = useState<PhaseTools | null>(null);
  const [requireTeacherFeedback, setRequireTeacherFeedback] = useState(false);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    async function init() {
      const [feedbackRes, revisedRes, assignRes, textRes] = await Promise.all([
        fetch(`/api/assignments/${id}/my-feedback`),
        fetch(`/api/assignments/${id}/my-revised-text`),
        fetch(`/api/assignments/${id}`),
        fetch(`/api/assignments/${id}/my-text`),
      ]);

      if (feedbackRes.status === 403) {
        const data = await feedbackRes.json();
        setBlocked(true);
        setBlockMessage(data.error);
        if (data.feedbackClosed) setFeedbackClosed(true);
        setLoading(false);
        return;
      }

      if (feedbackRes.ok) {
        const data = await feedbackRes.json();
        setFeedback(data.feedback ?? []);
        setTeacherFeedback(data.teacherFeedback ?? []);
        for (const f of data.feedback ?? []) {
          if (!f.readAt) fetch(`/api/reviews/${f.id}/mark-read`, { method: "PATCH" });
        }
      }

      if (revisedRes.ok) {
        const data = await revisedRes.json();
        if (data.revisedContent) {
          setRevisedContent(data.revisedContent);
          lastSavedRef.current = data.revisedContent;
        }
        setRevisedAt(data.revisedAt);
      }

      if (assignRes.ok) {
        const a = await assignRes.json();
        setForbedreTools(parseToolsConfig(a.toolsConfig).feedback);
        setRequireTeacherFeedback(!!a.requireTeacherFeedback);
      }

      if (textRes.ok) {
        const data = await textRes.json();
        if (data.text?.content) {
          setOriginalText(data.text.content);
          // Pre-fill editor with original text if no revision yet
          setRevisedContent((prev) => prev || data.text.content);
        }
      }

      setLoading(false);
    }
    init();
  }, [id]);

  // Auto-save every 30s when changed
  useEffect(() => {
    if (blocked || !revisedContent || revisedContent === lastSavedRef.current) return;
    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      const res = await fetch(`/api/assignments/${id}/my-revised-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: revisedContent }),
      });
      if (res.ok) {
        const data = await res.json();
        lastSavedRef.current = revisedContent;
        setRevisedAt(data.revisedAt);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("idle");
      }
    }, 30_000);
    return () => clearTimeout(timer);
  }, [id, revisedContent, blocked]);

  async function handleSave() {
    if (!revisedContent.trim()) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/assignments/${id}/my-revised-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: revisedContent }),
      });
      if (res.ok) {
        const data = await res.json();
        lastSavedRef.current = revisedContent;
        setRevisedAt(data.revisedAt);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Laster...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href={`/assignment/${id}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4"/></svg>
            Tilbake
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Forbedre teksten din</h1>
          <p className="text-sm text-gray-500 mt-1">Les tilbakemeldingene du fikk og rediger teksten din.</p>
        </div>

        {blocked ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-amber-800">{blockMessage}</p>
            {!feedbackClosed && (
              <Link
                href={`/assignment/${id}/review`}
                className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Gå til vurdering
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* ── Tilbakemeldinger du fikk ── */}
            {(feedback.length > 0 || teacherFeedback.length > 0) && (
              <section>
                <h2 className="font-semibold text-gray-800 mb-3">Tilbakemeldinger du fikk</h2>
                <div className="space-y-3">
                  {teacherFeedback.map((f) => (
                    <div key={f.id} className="rounded-xl border border-purple-200 bg-purple-50/50 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-purple-800">Fra læreren</span>
                        <span className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleString("no-NO")}</span>
                      </div>
                      <RichTextViewer content={f.content} />
                    </div>
                  ))}
                  {feedback.map((f, i) => (
                    <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Tilbakemelding {i + 1}</span>
                        <span className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleString("no-NO")}</span>
                      </div>
                      <RichTextViewer content={f.content} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Rediger teksten ── */}
            {requireTeacherFeedback && teacherFeedback.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-medium text-amber-900 mb-1">Venter på lærertilbakemelding</p>
                <p className="text-sm text-amber-700">Du kan begynne å skrive 2. utkast når læreren din har gitt deg tilbakemelding.</p>
              </div>
            )}
            <section className={requireTeacherFeedback && teacherFeedback.length === 0 ? "opacity-40 pointer-events-none select-none" : ""}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">Teksten din</h2>
                {revisedAt && (
                  <span className="text-xs text-gray-400">
                    Lagret {new Date(revisedAt).toLocaleString("no-NO")}
                  </span>
                )}
              </div>

              <div className="bg-white rounded-xl border-2 border-green-200 overflow-hidden">
                <div className="border-b border-green-100 px-4 py-2 bg-green-50">
                  <p className="text-xs text-green-700">
                    Rediger teksten din basert på tilbakemeldingene. Bare du og læreren din kan se dette.
                  </p>
                </div>
                {forbedreTools && (
                  <RichTextEditor
                    content={revisedContent}
                    onChange={setRevisedContent}
                    availableTools={forbedreTools}
                  />
                )}
                <div className="px-4 py-3 border-t border-green-100 bg-green-50 flex items-center justify-between">
                  <span className="text-xs text-green-600">
                    {saveStatus === "saving" ? "Lagrer..." : saveStatus === "saved" ? "Lagret" : ""}
                  </span>
                  <button
                    onClick={handleSave}
                    disabled={saving || !revisedContent.trim()}
                    className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Lagrer..." : revisedAt ? "Oppdater utkast" : "Lever forbedret utkast"}
                  </button>
                </div>
              </div>
              {revisedAt && (
                <p className="text-xs text-gray-400 mt-2 text-right">
                  Læreren kan se det forbedrede utkastet ditt.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
