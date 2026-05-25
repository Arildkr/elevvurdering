"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RichTextViewer } from "@/components/RichTextEditor";

interface Feedback {
  id: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [teacherFeedback, setTeacherFeedback] = useState<Feedback[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");
  const [feedbackClosed, setFeedbackClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchFeedback(markRead: boolean) {
    const res = await fetch(`/api/assignments/${id}/my-feedback`);

    if (res.status === 403) {
      const data = await res.json();
      setBlocked(true);
      setBlockMessage(data.error);
      if (data.feedbackClosed) setFeedbackClosed(true);
      return;
    }

    if (res.ok) {
      const data = await res.json();
      setFeedback(data.feedback);
      setTeacherFeedback(data.teacherFeedback ?? []);
      setBlocked(false);

      if (markRead) {
        for (const f of data.feedback) {
          if (!f.readAt) {
            fetch(`/api/reviews/${f.id}/mark-read`, { method: "PATCH" });
          }
        }
      }
    }
  }

  useEffect(() => {
    fetchFeedback(true).finally(() => setLoading(false));
  }, [id]);

  // Poll every 10 seconds — lets blocked students see feedback open without refreshing
  useEffect(() => {
    if (loading) return;
    const poll = setInterval(() => fetchFeedback(true), 10_000);
    return () => clearInterval(poll);
  }, [id, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Laster...</div>
      </div>
    );
  }

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
        <h1 className="text-xl font-bold text-gray-900 mb-6">Tilbakemeldinger</h1>

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
        ) : feedback.length === 0 && teacherFeedback.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Ingen tilbakemeldinger ennå.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {teacherFeedback.map((f) => (
              <div
                key={f.id}
                className={`rounded-xl border p-6 ${
                  !f.readAt ? "border-purple-200 bg-purple-50/40" : "bg-white border-purple-100"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-purple-900">Fra læreren</h3>
                  <div className="flex items-center gap-2">
                    {!f.readAt && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        Ny
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(f.createdAt).toLocaleString("no-NO")}
                    </span>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{f.content}</p>
              </div>
            ))}
            {feedback.map((f, i) => (
              <div
                key={f.id}
                className={`bg-white rounded-xl border p-6 ${
                  !f.readAt ? "border-blue-200 bg-blue-50/30" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Tilbakemelding {i + 1}</h3>
                  <div className="flex items-center gap-2">
                    {!f.readAt && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Ny
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(f.createdAt).toLocaleString("no-NO")}
                    </span>
                  </div>
                </div>
                <RichTextViewer content={f.content} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
