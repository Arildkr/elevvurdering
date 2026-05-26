"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { parseToolsConfig } from "@/lib/tools-config";

interface AssignmentDetail {
  id: string;
  title: string;
  description?: string;
  taskText?: string | null;
  writeDeadline: string;
  reviewDeadline: string;
  minReviews: number;
  distributionDone: boolean;
  feedbackOpen: boolean;
  feedbackDeadline: string | null;
  timerEndAt: string | null;
  timerLabel: string | null;
  isPaused: boolean;
  isArchived: boolean;
  toolsConfig: string | null;
  group: { id: string; name: string };
  phase: "writing" | "review" | "closed" | "paused";
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
  revisedContent: string | null;
  revisedAt: string | null;
  createdAt: string;
  windowSwitches: number;
  feedbackUnlocked: boolean;
  reviewsGiven: number;
  author: { name: string; kandidatnummer: string };
  _count: { reviews: number };
}

interface ReviewData {
  id: string;
  content: string;
  createdAt: string;
  rejectedAt: string | null;
  reviewer: { name: string; kandidatnummer: string };
  text: { id: string; author: { name: string; kandidatnummer: string } };
}

interface TeacherFeedbackData {
  id: string;
  textId: string;
  content: string;
  createdAt: string;
}

const phaseLabels = { writing: "Skrivefase", review: "Responsfase", closed: "Lukket", paused: "Pauset" };
const phaseColors = {
  writing: "bg-green-100 text-green-800",
  review: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-600",
  paused: "bg-orange-100 text-orange-800",
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
  const [teacherFeedbacks, setTeacherFeedbacks] = useState<TeacherFeedbackData[]>([]);
  const [addingFeedbackTo, setAddingFeedbackTo] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [timerLabel, setTimerLabel] = useState("");
  const [changingPhase, setChangingPhase] = useState(false);
  const [editingTaskText, setEditingTaskText] = useState(false);
  const [taskTextDraft, setTaskTextDraft] = useState("");
  const [savingTaskText, setSavingTaskText] = useState(false);
  const [editingTools, setEditingTools] = useState(false);
  const [toolsDraft, setToolsDraft] = useState("");
  const [savingTools, setSavingTools] = useState(false);
  const [unlockingFeedback, setUnlockingFeedback] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const assignmentRef = useRef<AssignmentDetail | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("admin-guide-open");
    setShowGuide(stored === null ? true : stored === "true");
  }, []);

  useEffect(() => {
    assignmentRef.current = assignment;
  }, [assignment]);

  useEffect(() => {
    loadData();
  }, [id]);

  // Poll every 5 seconds for real-time updates
  useEffect(() => {
    if (!id) return;
    const poll = setInterval(async () => {
      try {
        const aRes = await fetch(`/api/assignments/${id}`);
        if (aRes.ok) setAssignment(await aRes.json());
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [id]);

  async function loadData() {
    try {
      const aRes = await fetch(`/api/assignments/${id}`);
      if (aRes.ok) setAssignment(await aRes.json());

      const tRes = await fetch(`/api/assignments/${id}/texts`);
      if (tRes.ok) setTexts(await tRes.json());

      const rRes = await fetch(`/api/assignments/${id}/reviews`);
      if (rRes.ok) setReviews(await rRes.json());

      const tfRes = await fetch(`/api/assignments/${id}/teacher-feedback`);
      if (tfRes.ok) setTeacherFeedbacks(await tfRes.json());
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
      const end = new Date(assignmentRef.current!.timerEndAt!).getTime();
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
      const data = await res.json();
      setAssignment((prev) => prev ? { ...prev, timerEndAt: data.timerEndAt, timerLabel: data.timerLabel } : prev);
    } else {
      const data = await res.json();
      alert(data.error || "Noe gikk galt");
    }
  }

  async function handleStopTimer() {
    const res = await fetch(`/api/assignments/${id}/timer`, { method: "DELETE" });
    if (res.ok) {
      setAssignment((prev) => prev ? { ...prev, timerEndAt: null, timerLabel: null } : prev);
      setTimerRemaining(null);
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

  async function handleDeleteReview(reviewId: string) {
    if (!confirm("Slette denne tilbakemeldingen permanent? Eleven må skrive en ny.")) return;
    const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
    if (res.ok) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } else {
      const data = await res.json();
      alert(data.error || "Noe gikk galt");
    }
  }

  async function handleAddTeacherFeedback(textId: string) {
    if (!feedbackDraft.trim()) return;
    setSavingFeedback(true);
    try {
      const res = await fetch(`/api/assignments/${id}/teacher-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textId, content: feedbackDraft }),
      });
      if (res.ok) {
        const created: TeacherFeedbackData = await res.json();
        setTeacherFeedbacks((prev) => [...prev, created]);
        setFeedbackDraft("");
        setAddingFeedbackTo(null);
      } else {
        const data = await res.json();
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setSavingFeedback(false);
    }
  }

  async function handleDeleteTeacherFeedback(feedbackId: string) {
    if (!confirm("Slette denne lærertilbakemeldingen?")) return;
    const res = await fetch(`/api/teacher-feedback/${feedbackId}`, { method: "DELETE" });
    if (res.ok) {
      setTeacherFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
    } else {
      const data = await res.json();
      alert(data.error || "Noe gikk galt");
    }
  }

  async function handleSaveTaskText() {
    setSavingTaskText(true);
    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskText: taskTextDraft || null }),
      });
      if (res.ok) {
        setAssignment((prev) => prev ? { ...prev, taskText: taskTextDraft || null } : prev);
        setEditingTaskText(false);
      } else {
        const data = await res.json();
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setSavingTaskText(false);
    }
  }

  async function handleSaveTools() {
    setSavingTools(true);
    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolsConfig: toolsDraft }),
      });
      if (res.ok) {
        setAssignment((prev) => prev ? { ...prev, toolsConfig: toolsDraft } as typeof prev : prev);
        setEditingTools(false);
      } else {
        const data = await res.json();
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setSavingTools(false);
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

  async function handlePhaseChange(phase: "writing" | "review" | "closed" | "paused" | "resumed" | "archived") {
    const labels: Record<string, string> = {
      writing: "skrivefase",
      review: "vurderingsfase",
      closed: "lukket",
      paused: "pauset",
      resumed: "gjenopptatt",
      archived: "arkivert",
    };
    if (phase === "archived") {
      if (!confirm("Arkivere oppgaven? Den vil ikke lenger vises for elever.")) return;
    } else if (!confirm(`Bytte til ${labels[phase]}?`)) {
      return;
    }
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

  async function handleUnlockFeedback(textId: string, unlock: boolean) {
    setUnlockingFeedback(textId);
    try {
      const res = await fetch(`/api/assignments/${id}/unlock-feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textId, unlock }),
      });
      if (res.ok) {
        setTexts((prev) =>
          prev.map((t) => (t.id === textId ? { ...t, feedbackUnlocked: unlock } : t))
        );
      } else {
        const data = await res.json();
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setUnlockingFeedback(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Laster...</div>;
  if (!assignment) return <div className="p-8 text-gray-500">Oppgave ikke funnet</div>;

  return (
    <div className="p-8">
      <Link href="/admin/assignments" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4">
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4"/></svg>
        Tilbake til oppgaver
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{assignment.group.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {assignment.isArchived && (
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-gray-200 text-gray-600">Arkivert</span>
          )}
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${phaseColors[assignment.phase]}`}>
            {phaseLabels[assignment.phase]}
          </span>
        </div>
      </div>

      {/* Workflow guide */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
        <button
          onClick={() => {
            const next = !showGuide;
            setShowGuide(next);
            localStorage.setItem("admin-guide-open", String(next));
          }}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-blue-100 transition-colors"
        >
          <span className="text-sm font-semibold text-blue-800">Slik gjennomfører du en oppgave</span>
          <svg className={`w-4 h-4 text-blue-600 transition-transform ${showGuide ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4"/></svg>
        </button>
        {showGuide && (
          <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-blue-900">
            <div className="flex gap-3 items-start">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              <p><strong>Skrivefase</strong> — Elevene skriver og leverer teksten sin. Du kan legge til oppgavetekst og velge hvilke hjelpemidler som er tilgjengelige.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              <p><strong>Tildel tekster</strong> — Klikk &laquo;Tildel tekster&raquo; når skrivefristen er ute. Hver elev får tildelt tekster å vurdere. Bytt deretter til Responsfase.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              <p><strong>Responsfase</strong> — Elevene gir tilbakemeldinger på hverandres tekster. Følg med i Elevstatus-tabellen under Oversikt.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">4</span>
              <p><strong>Åpne tilbakemeldinger</strong> — Når responsen er ferdig, klikk &laquo;Åpne tilbakemeldinger&raquo;. Alle elever får da tilgang til å lese tilbakemeldingene og forbedre teksten sin.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">5</span>
              <p><strong>Individuelle unntak</strong> — Har én elev ingen medelever å vurdere? Bruk &laquo;Åpne Forbedre&raquo; i Elevstatus-tabellen for å åpne kun for den eleven.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">6</span>
              <p><strong>Eksporter</strong> — Last ned rapport som HTML eller CSV når oppgaven er avsluttet. Rapporten inneholder 1. utkast, tilbakemeldinger og 2. utkast.</p>
            </div>
          </div>
        )}
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
        <div className="bg-white rounded-xl border border-gray-200 p-4" title="Antall elever som har fått tildelt en tekst å vurdere">
          <p className="text-2xl font-bold">{assignment.stats.reviewAssignmentCount}</p>
          <p className="text-xs text-gray-500">Tildelinger</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4" title="Antall vurderinger som faktisk er skrevet og levert">
          <p className="text-2xl font-bold">{assignment.stats.reviewCount}</p>
          <p className="text-xs text-gray-500">Vurderinger skrevet</p>
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
              disabled={changingPhase || (assignment.phase === p && !assignment.isPaused)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                assignment.phase === p && !assignment.isPaused
                  ? `${phaseColors[p]} ring-2 ring-offset-1 ring-gray-300`
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {phaseLabels[p]}
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1" />
          {assignment.isPaused ? (
            <button
              onClick={() => handlePhaseChange("resumed")}
              disabled={changingPhase}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Gjenoppta
            </button>
          ) : (
            <button
              onClick={() => handlePhaseChange("paused")}
              disabled={changingPhase || assignment.phase === "closed"}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 disabled:opacity-50 transition-colors"
            >
              Pause
            </button>
          )}
          {!assignment.isArchived && (
            <button
              onClick={() => handlePhaseChange("archived")}
              disabled={changingPhase}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Arkiver
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={handleDistribute}
          disabled={distributing}
          title={assignment.distributionDone
            ? "Tildeler tekster på nytt. Elever som allerede er i gang med vurdering kan bli påvirket."
            : "Fordeler elevtekstene til hverandre for fagfellevurdering. Gjøres etter at skrivefristen er ute."}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {distributing ? "Tildeler..." : assignment.distributionDone ? "Tildel på nytt" : "Tildel tekster"}
        </button>
        <button
          onClick={handleToggleFeedback}
          disabled={togglingFeedback}
          title={assignment.feedbackOpen
            ? "Stenger Forbedre-fasen for alle elever."
            : "Åpner Forbedre-fasen for alle elever i klassen. Elevene kan lese tilbakemeldingene og forbedre teksten sin."}
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
          onClick={() => {
            const csvUrl = `${window.location.origin}/api/assignments/${id}/export?format=csv`;
            const googleSheetsUrl = `https://docs.google.com/spreadsheets/create?title=${encodeURIComponent(`Elevvurdering - ${assignment.title}`)}`;
            alert(`1. Åpne Google Sheets (lukk deretter denne meldingen):\n${googleSheetsUrl}\n\n2. Gå til Fil > Åpne\n3. Klikk "Last opp"\n4. Dra eller velg CSV-fil\n\nAlternativt: Kopier CSV-URL og importer i Sheets:\n${csvUrl}`);
            window.open(googleSheetsUrl, '_blank');
          }}
          className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          Åpne i Google Sheets
        </button>
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

        {/* Current timer display */}
        {assignment.timerEndAt && timerRemaining !== null && (
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
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
        )}

        {/* Timer controls always visible */}
        <div>
          <p className="text-xs text-gray-500 mb-2">
            {assignment.timerEndAt ? "Sett ny timer (erstatter gjeldende):" : "Start timer:"}
          </p>
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
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

          {/* Student status table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-700">Elevstatus — respons og Forbedre</h3>
              {texts.length < assignment.stats.memberCount && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                  {assignment.stats.memberCount - texts.length} elev{assignment.stats.memberCount - texts.length !== 1 ? "er" : ""} har ikke levert tekst
                </span>
              )}
            </div>
            {texts.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Ingen tekster levert ennå.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left font-medium text-gray-600 py-2 pr-4">Elev</th>
                      <th className="text-center font-medium text-gray-600 px-3">Respons gitt</th>
                      <th className="text-center font-medium text-gray-600 px-3">Forbedre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {texts.map((t) => {
                      const reviewsDone = t.reviewsGiven;
                      const reviewsNeeded = assignment.minReviews;
                      const globalOpen = assignment.feedbackOpen ||
                        (assignment.feedbackDeadline && new Date(assignment.feedbackDeadline) <= new Date());
                      return (
                        <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 pr-4">
                            <button
                              onClick={() => { setTab("texts"); setExpandedText(t.id); }}
                              className="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left"
                              title="Gå til elevens tekst"
                            >
                              {t.author.name}
                            </button>
                            <span className="font-mono text-xs text-gray-400 ml-2">{t.author.kandidatnummer}</span>
                          </td>
                          <td className="text-center px-3">
                            <span className={`font-medium ${
                              reviewsDone >= reviewsNeeded
                                ? "text-green-700"
                                : reviewsDone > 0
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}>
                              {reviewsDone} / {reviewsNeeded}
                            </span>
                          </td>
                          <td className="text-center px-3">
                            {globalOpen ? (
                              <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Åpen for alle</span>
                            ) : t.feedbackUnlocked ? (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Åpen individuelt</span>
                                <button
                                  onClick={() => handleUnlockFeedback(t.id, false)}
                                  disabled={unlockingFeedback === t.id}
                                  className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  Lukk
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleUnlockFeedback(t.id, true)}
                                disabled={unlockingFeedback === t.id}
                                title="Åpner Forbedre-fasen kun for denne eleven — nyttig for elever som ikke har medelever å vurdere."
                                className="text-xs bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {unlockingFeedback === t.id ? "..." : "Åpne Forbedre"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {assignment.description && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-medium text-gray-700 mb-1">Beskrivelse</h3>
              <p className="text-gray-600">{assignment.description}</p>
            </div>
          )}

          {/* Oppgavetekst — view/edit */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-gray-700">Oppgavetekst</h3>
              {!editingTaskText && (
                <button
                  onClick={() => { setTaskTextDraft(assignment.taskText ?? ""); setEditingTaskText(true); }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {assignment.taskText ? "Rediger" : "Legg til"}
                </button>
              )}
            </div>
            {editingTaskText ? (
              <div className="space-y-2">
                <textarea
                  value={taskTextDraft}
                  onChange={(e) => setTaskTextDraft(e.target.value)}
                  rows={4}
                  placeholder="Skriv oppgaveteksten her. Vises for eleven under skriving og vurdering."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTaskText}
                    disabled={savingTaskText}
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {savingTaskText ? "Lagrer..." : "Lagre"}
                  </button>
                  <button
                    onClick={() => setEditingTaskText(false)}
                    className="text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : assignment.taskText ? (
              <p className="text-gray-600 text-sm whitespace-pre-wrap bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                {assignment.taskText}
              </p>
            ) : (
              <p className="text-gray-400 text-sm italic">Ingen oppgavetekst satt.</p>
            )}
          </div>

          {/* Tools config */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-700">Hjelpemidler</h3>
              {!editingTools && (
                <button
                  onClick={() => { setToolsDraft(assignment.toolsConfig ?? ""); setEditingTools(true); }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Rediger
                </button>
              )}
            </div>
            {editingTools ? (
              (() => {
                const cfg = parseToolsConfig(toolsDraft);
                const phases = [
                  { key: "writing", label: "Skriving" },
                  { key: "review", label: "Respons" },
                  { key: "feedback", label: "Forbedre" },
                ] as const;
                const tools = [
                  { key: "spellCheck", label: "Stavekontroll" },
                  { key: "readingHelp", label: "Lesehjelp" },
                  { key: "aiAnalysis", label: "AI-analyse" },
                ] as const;
                return (
                  <div className="space-y-3">
                    <table className="text-sm w-full">
                      <thead>
                        <tr>
                          <th className="text-left font-medium text-gray-600 py-1 pr-4">Hjelpemiddel</th>
                          {phases.map(p => <th key={p.key} className="text-center font-medium text-gray-600 px-3">{p.label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {tools.map(tool => (
                          <tr key={tool.key}>
                            <td className="py-1 pr-4 text-gray-700">{tool.label}</td>
                            {phases.map(phase => (
                              <td key={phase.key} className="text-center px-3">
                                <input
                                  type="checkbox"
                                  checked={cfg[phase.key][tool.key]}
                                  onChange={(e) => {
                                    const updated = { ...cfg, [phase.key]: { ...cfg[phase.key], [tool.key]: e.target.checked } };
                                    setToolsDraft(JSON.stringify(updated));
                                  }}
                                  className="w-4 h-4"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr>
                          <td className="py-1 pr-4 text-gray-700">Målform</td>
                          {phases.map(phase => (
                            <td key={phase.key} className="text-center px-3">
                              <select
                                value={cfg[phase.key].targetForm}
                                onChange={(e) => {
                                  const updated = { ...cfg, [phase.key]: { ...cfg[phase.key], targetForm: e.target.value } };
                                  setToolsDraft(JSON.stringify(updated));
                                }}
                                className="text-xs border border-gray-300 rounded px-1 py-0.5"
                              >
                                <option value="nb">Bokmål</option>
                                <option value="nn">Nynorsk</option>
                              </select>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex gap-2">
                      <button onClick={handleSaveTools} disabled={savingTools} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                        {savingTools ? "Lagrer..." : "Lagre"}
                      </button>
                      <button onClick={() => setEditingTools(false)} className="text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100">
                        Avbryt
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-xs text-gray-400 italic">Klikk Rediger for å endre hjelpemidler per fase.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
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
              {(() => {
                const autoOpen = assignment.feedbackDeadline && new Date(assignment.feedbackDeadline) <= new Date();
                const isOpen = assignment.feedbackOpen || autoOpen;
                return (
                  <span className={isOpen ? "text-green-600 font-medium" : "text-gray-600"}>
                    {assignment.feedbackOpen ? "Åpne (manuelt)" : autoOpen ? "Åpne (automatisk)" : "Lukket"}
                  </span>
                );
              })()}
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
                    {t.windowSwitches > 0 && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          t.windowSwitches >= 5
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                        title="Antall ganger eleven byttet vindu eller fane under skriving"
                      >
                        {t.windowSwitches}× vindubytte
                      </span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{expandedText === t.id ? <path d="M4 10l4-4 4 4"/> : <path d="M4 6l4 4 4-4"/>}</svg>
                </button>
                {expandedText === t.id && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    {/* 1. utkast */}
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mt-4 mb-2">1. utkast</p>
                    <div className="prose prose-sm max-w-none text-gray-700 bg-blue-50 rounded-lg p-4" dangerouslySetInnerHTML={{ __html: t.content }} />
                    <p className="text-xs text-gray-400 mt-1">Levert: {new Date(t.createdAt).toLocaleString("no-NO")}</p>

                    {/* Tilbakemeldinger fra medelever */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tilbakemeldinger fra medelever ({reviews.filter(r => r.text.id === t.id && !r.rejectedAt).length})</p>
                      {reviews.filter(r => r.text.id === t.id).length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Ingen tilbakemeldinger ennå.</p>
                      ) : reviews.filter(r => r.text.id === t.id).map((r, i) => (
                        <div key={r.id} className={`rounded-lg border p-3 mb-2 text-sm ${r.rejectedAt ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700">Tilbakemelding {i + 1}</span>
                            {r.rejectedAt && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Underkjent</span>}
                          </div>
                          <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: r.content }} />
                        </div>
                      ))}
                    </div>

                    {/* Lærertilbakemeldinger */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">Lærertilbakemeldinger</p>
                      {teacherFeedbacks.filter((f) => f.textId === t.id).map((f) => (
                        <div key={f.id} className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 mb-2 flex items-start justify-between gap-3">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{f.content}</p>
                          <button
                            onClick={() => handleDeleteTeacherFeedback(f.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
                          >
                            Slett
                          </button>
                        </div>
                      ))}

                      {addingFeedbackTo === t.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={feedbackDraft}
                            onChange={(e) => setFeedbackDraft(e.target.value)}
                            placeholder="Skriv tilbakemelding til eleven..."
                            rows={4}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddTeacherFeedback(t.id)}
                              disabled={savingFeedback || !feedbackDraft.trim()}
                              className="text-sm bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                            >
                              {savingFeedback ? "Lagrer..." : "Lagre"}
                            </button>
                            <button
                              onClick={() => { setAddingFeedbackTo(null); setFeedbackDraft(""); }}
                              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
                            >
                              Avbryt
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingFeedbackTo(t.id); setFeedbackDraft(""); }}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium mt-1"
                        >
                          + Legg til tilbakemelding
                        </button>
                      )}
                    </div>

                    {/* 2. utkast */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">2. utkast (forbedret)</p>
                      {t.revisedContent ? (
                        <>
                          <div className="prose prose-sm max-w-none text-gray-700 bg-green-50 rounded-lg p-4" dangerouslySetInnerHTML={{ __html: t.revisedContent }} />
                          {t.revisedAt && <p className="text-xs text-gray-400 mt-1">Levert: {new Date(t.revisedAt).toLocaleString("no-NO")}</p>}
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Ikke levert ennå.</p>
                      )}
                    </div>
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
                      <svg className="w-3 h-3 text-gray-400 mx-1 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                      <span className="text-gray-600">{r.text.author.name}</span>
                    </div>
                    {r.rejectedAt ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Underkjent</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Godkjent</span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{expandedReview === r.id ? <path d="M4 10l4-4 4 4"/> : <path d="M4 6l4 4 4-4"/>}</svg>
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
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                        >
                          Underkjenn
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteReview(r.id); }}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Slett
                      </button>
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
