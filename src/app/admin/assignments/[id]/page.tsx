"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface AssignmentDetail {
  id: string;
  title: string;
  description?: string;
  writeDeadline: string;
  reviewDeadline: string;
  minReviews: number;
  distributionDone: boolean;
  feedbackOpen: boolean;
  feedbackDeadline: string | null;
  timerEndAt: string | null;
  timerLabel: string | null;
  group: { id: string; name: string };
  phase: "writing" | "review" | "closed";
  stats: {
    memberCount: number;
    textCount: number;
    reviewAssignmentCount: number;
    reviewCount: number;
  };
}

interface TextData {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string; kandidatnummer: string };
  _count: { reviews: number };
}

interface ReviewData {
  id: string;
  content: string;
  createdAt: string;
  rejectedAt: string | null;
  reviewer: { name: string; kandidatnummer: string };
  text: { author: { name: string; kandidatnummer: string } };
}

const phaseLabels = { writing: "Skrivefase", review: "Vurderingsfase", closed: "Lukket" };
const phaseColors = {
  writing: "bg-green-100 text-green-800",
  review: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-600",
};

export default function AdminAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [texts, setTexts] = useState<TextData[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [togglingFeedback, setTogglingFeedback] = useState(false);
  const [tab, setTab] = useState<"overview" | "texts" | "reviews">("overview");
  const [expandedText, setExpandedText] = useState<string | null>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [timerLabel, setTimerLabel] = useState("");
  const [changingPhase, setChangingPhase] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const aRes = await fetch(`/api/assignments/${id}`);
      if (aRes.ok) setAssignment(await aRes.json());

      // Load texts for admin view
      const tRes = await fetch(`/api/assignments/${id}/texts`);
      if (tRes.ok) setTexts(await tRes.json());

      // Load reviews for admin view
      const rRes = await fetch(`/api/assignments/${id}/reviews`);
      if (rRes.ok) setReviews(await rRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleDistribute() {
    if (!confirm("Er du sikker? Dette tildeler hver elev en tekst å vurdere.")) return;

    setDistributing(true);
    try {
      const res = await fetch(`/api/assignments/${id}/distribute`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        loadData();
      } else {
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setDistributing(false);
    }
  }

  async function handleToggleFeedback() {
    setTogglingFeedback(true);
    try {
      const res = await fetch(`/api/assignments/${id}/toggle-feedback`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        loadData();
      } else {
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setTogglingFeedback(false);
    }
  }

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

  async function handleStartTimer(minutes: number) {
    const label = timerLabel || phaseLabels[assignment!.phase];
    const res = await fetch(`/api/assignments/${id}/timer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMinutes: minutes, label }),
    });
    if (res.ok) {
      loadData();
    } else {
      const data = await res.json();
      alert(data.error || "Noe gikk galt");
    }
  }

  async function handleStopTimer() {
    const res = await fetch(`/api/assignments/${id}/timer`, { method: "DELETE" });
    if (res.ok) {
      loadData();
    }
  }

  async function handleReject(reviewId: string) {
    if (!confirm("Underkjenne denne tilbakemeldingen? Eleven må skrive en ny.")) return;

    const res = await fetch(`/api/reviews/${reviewId}/reject`, { method: "PATCH" });
    if (res.ok) {
      loadData();
    } else {
      const data = await res.json();
      alert(data.error || "Noe gikk galt");
    }
  }

  async function handleDelete() {
    if (!confirm("Er du sikker på at du vil slette denne oppgaven? Alle tekster og vurderinger slettes permanent.")) return;
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/assignments");
      } else {
        const data = await res.json();
        alert(data.error || "Noe gikk galt");
      }
    } catch {
      alert("Noe gikk galt");
    }
  }

  async function handlePhaseChange(phase: "writing" | "review" | "closed") {
    const labels = { writing: "skrivefase", review: "vurderingsfase", closed: "lukket" };
    if (!confirm(`Bytte til ${labels[phase]}?`)) return;
    setChangingPhase(true);
    try {
      const res = await fetch(`/api/assignments/${id}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase }),
      });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setChangingPhase(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Laster...</div>;
  if (!assignment) return <div className="p-8 text-gray-500">Oppgave ikke funnet</div>;

  return (
    <div className="p-8">
      <Link href="/admin/assignments" className="text-sm text-blue-600 hover:text-blue-700 mb-4 block">
        &larr; Tilbake til oppgaver
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{assignment.group.name}</p>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${phaseColors[assignment.phase]}`}>
          {phaseLabels[assignment.phase]}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold">{assignment.stats.memberCount}</p>
          <p className="text-xs text-gray-500">Medlemmer</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold">{assignment.stats.textCount}</p>
          <p className="text-xs text-gray-500">Tekster levert</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold">{assignment.stats.reviewAssignmentCount}</p>
          <p className="text-xs text-gray-500">Tildelinger</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold">{assignment.stats.reviewCount}</p>
          <p className="text-xs text-gray-500">Vurderinger</p>
        </div>
      </div>

      {/* Phase control */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Fase:</span>
          {(["writing", "review", "closed"] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePhaseChange(p)}
              disabled={changingPhase || assignment.phase === p}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                assignment.phase === p
                  ? `${phaseColors[p]} ring-2 ring-offset-1 ring-gray-300`
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {phaseLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={handleDistribute}
          disabled={distributing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {distributing ? "Tildeler..." : assignment.distributionDone ? "Tildel på nytt" : "Tildel tekster"}
        </button>
        <button
          onClick={handleToggleFeedback}
          disabled={togglingFeedback}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            assignment.feedbackOpen
              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {togglingFeedback
            ? "..."
            : assignment.feedbackOpen
            ? "Lukk tilbakemeldinger"
            : "Åpne tilbakemeldinger"}
        </button>
        <a
          href={`/api/assignments/${id}/export`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Eksporter HTML
        </a>
        <a
          href={`/api/assignments/${id}/export?format=csv`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Eksporter CSV
        </a>
        <button
          onClick={handleDelete}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors ml-auto"
        >
          Slett oppgave
        </button>
      </div>

      {/* Timer */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Klasseromstimer</h3>
        {assignment.timerEndAt && timerRemaining !== null ? (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-4xl font-mono font-bold ${timerRemaining === "00:00" ? "text-red-600" : "text-blue-600"}`}>
                {timerRemaining}
              </div>
              {assignment.timerLabel && (
                <p className="text-sm text-gray-500 mt-1">{assignment.timerLabel}</p>
              )}
              {timerRemaining === "00:00" && (
                <p className="text-sm text-red-600 font-medium mt-1">Tiden er ute!</p>
              )}
            </div>
            <button
              onClick={handleStopTimer}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Stopp timer
            </button>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {[5, 10, 15, 20, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => handleStartTimer(m)}
                  className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  {m} min
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={180}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <span className="text-sm text-gray-500">min</span>
              <input
                type="text"
                value={timerLabel}
                onChange={(e) => setTimerLabel(e.target.value)}
                placeholder={phaseLabels[assignment.phase]}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <button
                onClick={() => handleStartTimer(customMinutes)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Start
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Elevene ser nedtellingen i sanntid på sine skjermer.</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {(["overview", "texts", "reviews"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {{ overview: "Oversikt", texts: "Tekster", reviews: "Vurderinger" }[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {assignment.description && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-1">Beskrivelse</h3>
              <p className="text-gray-600">{assignment.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Skrivefrist: </span>
              <span className="text-gray-600">
                {new Date(assignment.writeDeadline).getFullYear() > new Date().getFullYear()
                  ? "Manuelt styrt"
                  : new Date(assignment.writeDeadline).toLocaleString("no-NO")}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Vurderingsfrist: </span>
              <span className="text-gray-600">
                {new Date(assignment.reviewDeadline).getFullYear() > new Date().getFullYear()
                  ? "Manuelt styrt"
                  : new Date(assignment.reviewDeadline).toLocaleString("no-NO")}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Min. vurderinger: </span>
              <span className="text-gray-600">{assignment.minReviews}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Tildeling gjort: </span>
              <span className="text-gray-600">{assignment.distributionDone ? "Ja" : "Nei"}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Tilbakemeldinger: </span>
              <span className={assignment.feedbackOpen ? "text-green-600 font-medium" : "text-gray-600"}>
                {assignment.feedbackOpen ? "Åpne" : "Lukket"}
              </span>
            </div>
            {assignment.feedbackDeadline && (
              <div>
                <span className="font-medium text-gray-700">Feedback-frist: </span>
                <span className="text-gray-600">{new Date(assignment.feedbackDeadline).toLocaleString("no-NO")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "texts" && (
        <div className="space-y-3">
          {texts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-gray-500">Ingen tekster levert ennå.</p>
            </div>
          ) : (
            texts.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedText(expandedText === t.id ? null : t.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-medium text-gray-900">{t.author.name}</span>
                      <span className="font-mono text-xs text-gray-500 ml-2">{t.author.kandidatnummer}</span>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t._count.reviews} vurderinger</span>
                  </div>
                  <span className="text-gray-400 text-sm">{expandedText === t.id ? "\u25B2" : "\u25BC"}</span>
                </button>
                {expandedText === t.id && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    <div className="prose prose-sm max-w-none text-gray-700 mt-4" dangerouslySetInnerHTML={{ __html: t.content }} />
                    <p className="text-xs text-gray-400 mt-3">Levert: {new Date(t.createdAt).toLocaleString("no-NO")}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "reviews" && (
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-gray-500">Ingen vurderinger ennå.</p>
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className={`bg-white rounded-xl border overflow-hidden ${r.rejectedAt ? "border-red-200" : "border-gray-200"}`}>
                <button
                  onClick={() => setExpandedReview(expandedReview === r.id ? null : r.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="font-medium text-gray-900">{r.reviewer.name}</span>
                      <span className="text-gray-400 mx-1">&rarr;</span>
                      <span className="text-gray-600">{r.text.author.name}</span>
                    </div>
                    {r.rejectedAt ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Underkjent</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Godkjent</span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">{expandedReview === r.id ? "\u25B2" : "\u25BC"}</span>
                </button>
                {expandedReview === r.id && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    <div className="prose prose-sm max-w-none text-gray-700 mt-4" dangerouslySetInnerHTML={{ __html: r.content }} />
                    <div className="flex items-center gap-3 mt-3">
                      <p className="text-xs text-gray-400">
                        {new Date(r.createdAt).toLocaleString("no-NO")}
                      </p>
                      {!r.rejectedAt && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(r.id); }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Underkjenn
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
