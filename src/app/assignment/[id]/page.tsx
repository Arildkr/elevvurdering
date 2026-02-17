"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Assignment {
  id: string;
  title: string;
  description?: string;
  writeDeadline: string;
  reviewDeadline: string;
  minReviews: number;
  distributionDone: boolean;
  feedbackAvailable: boolean;
  feedbackDeadline: string | null;
  timerEndAt: string | null;
  timerLabel: string | null;
  groupName: string;
  phase: "writing" | "review" | "closed";
}

interface TextStatus {
  text: { id: string; content: string } | null;
  canEdit: boolean;
  canSubmit: boolean;
}

interface ReviewAssignment {
  id: string;
  completed: boolean;
}

const phaseLabels = { writing: "Skrivefase", review: "Vurderingsfase", closed: "Lukket" };
const phaseColors = {
  writing: "bg-green-100 text-green-800",
  review: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-600",
};

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [textStatus, setTextStatus] = useState<TextStatus | null>(null);
  const [reviewAssignments, setReviewAssignments] = useState<ReviewAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingMore, setRequestingMore] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<string | null>(null);

  // Timer countdown
  useEffect(() => {
    if (!assignment?.timerEndAt) {
      setTimerRemaining(null);
      return;
    }
    function tick() {
      const end = new Date(assignment!.timerEndAt!).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTimerRemaining("00:00");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimerRemaining(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [assignment?.timerEndAt]);

  // Poll for timer updates every 15 seconds (only when timer is active)
  const hasActiveTimer = !!(assignment?.timerEndAt && new Date(assignment.timerEndAt) > new Date());
  useEffect(() => {
    if (!id || !hasActiveTimer) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/assignments/${id}`);
        if (res.ok) setAssignment(await res.json());
      } catch { /* ignore */ }
    }, 15000);
    return () => clearInterval(poll);
  }, [id, hasActiveTimer]);

  useEffect(() => {
    async function load() {
      try {
        const [aRes, tRes, rRes] = await Promise.all([
          fetch(`/api/assignments/${id}`),
          fetch(`/api/assignments/${id}/my-text`),
          fetch(`/api/assignments/${id}/my-review-assignment`),
        ]);

        if (!aRes.ok) { router.push("/dashboard"); return; }

        setAssignment(await aRes.json());
        if (tRes.ok) setTextStatus(await tRes.json());
        if (rRes.ok) setReviewAssignments(await rRes.json());
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  async function handleRequestMore() {
    setRequestingMore(true);
    try {
      const res = await fetch(`/api/assignments/${id}/request-more`, { method: "POST" });
      if (res.ok) {
        router.push(`/assignment/${id}/review`);
      } else {
        const data = await res.json();
        alert(data.error || "Kunne ikke hente flere tekster");
      }
    } finally {
      setRequestingMore(false);
    }
  }

  if (loading || !assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Laster...</div>
      </div>
    );
  }

  const pendingReviews = reviewAssignments.filter((r) => !r.completed);
  const completedReviews = reviewAssignments.filter((r) => r.completed);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700">
            &larr; Tilbake til dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
              <p className="text-sm text-gray-500 mt-1">{assignment.groupName}</p>
            </div>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${phaseColors[assignment.phase]}`}>
              {phaseLabels[assignment.phase]}
            </span>
          </div>

          {assignment.description && (
            <p className="text-gray-600 mb-4">{assignment.description}</p>
          )}

          <div className="flex gap-6 text-sm text-gray-500">
            {new Date(assignment.writeDeadline).getFullYear() <= new Date().getFullYear() && (
              <div>
                <span className="font-medium text-gray-700">Skrivefrist:</span>{" "}
                {new Date(assignment.writeDeadline).toLocaleString("no-NO")}
              </div>
            )}
            {new Date(assignment.reviewDeadline).getFullYear() <= new Date().getFullYear() && (
              <div>
                <span className="font-medium text-gray-700">Vurderingsfrist:</span>{" "}
                {new Date(assignment.reviewDeadline).toLocaleString("no-NO")}
              </div>
            )}
          </div>
        </div>

        {/* Timer */}
        {assignment.timerEndAt && timerRemaining !== null && (
          <div className={`rounded-xl border-2 p-6 mb-6 text-center ${
            timerRemaining === "00:00"
              ? "border-red-300 bg-red-50"
              : "border-blue-300 bg-blue-50"
          }`}>
            <div className={`text-5xl font-mono font-bold ${
              timerRemaining === "00:00" ? "text-red-600" : "text-blue-600"
            }`}>
              {timerRemaining}
            </div>
            {assignment.timerLabel && (
              <p className={`text-sm mt-2 font-medium ${
                timerRemaining === "00:00" ? "text-red-600" : "text-blue-600"
              }`}>
                {assignment.timerLabel}
              </p>
            )}
            {timerRemaining === "00:00" && (
              <p className="text-red-600 font-semibold mt-1">Tiden er ute!</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {/* Text submission */}
          {assignment.phase === "writing" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Lever tekst</h2>
              {textStatus?.text ? (
                <div>
                  <p className="text-green-600 text-sm mb-3">Du har levert tekst.</p>
                  {textStatus.canEdit && (
                    <Link
                      href={`/assignment/${id}/submit`}
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Rediger tekst
                    </Link>
                  )}
                </div>
              ) : (
                <Link
                  href={`/assignment/${id}/submit`}
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Lever tekst
                </Link>
              )}
            </div>
          )}

          {/* Review section */}
          {(assignment.phase === "review" || assignment.phase === "closed") && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Vurderinger</h2>
              <div className="text-sm text-gray-600 mb-3">
                {completedReviews.length} fullført, {pendingReviews.length} gjenstår
              </div>

              {pendingReviews.length > 0 && assignment.phase === "review" && (
                <Link
                  href={`/assignment/${id}/review`}
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mr-3"
                >
                  Vurder tildelt tekst
                </Link>
              )}

              {pendingReviews.length === 0 &&
                completedReviews.length > 0 &&
                assignment.phase === "review" && (
                  <button
                    onClick={handleRequestMore}
                    disabled={requestingMore}
                    className="inline-block bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {requestingMore ? "Henter..." : "Be om flere tekster å vurdere"}
                  </button>
                )}
            </div>
          )}

          {/* Feedback section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Tilbakemeldinger</h2>
            {assignment.feedbackAvailable ? (
              <Link
                href={`/assignment/${id}/feedback`}
                className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Se tilbakemeldinger
              </Link>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-1">Tilbakemeldinger er ikke åpnet ennå.</p>
                {assignment.feedbackDeadline && (
                  <p className="text-xs text-gray-400">
                    Åpnes: {new Date(assignment.feedbackDeadline).toLocaleString("no-NO")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
