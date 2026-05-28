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
  group: { id: string; name: string; joinCode: string };
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

// Derive which workflow step we're on (teacher view)
function getCurrentStep(a: AssignmentDetail): 1 | 2 | 3 | 4 {
  if (a.phase === "closed" || a.isArchived) return 4;
  const revOpen =
    a.feedbackOpen ||
    (a.feedbackDeadline && new Date(a.feedbackDeadline) <= new Date());
  if (revOpen) return 3;
  if (a.phase === "review") return 2;
  return 1;
}

const stepLabels = ["Skriving", "Respons", "Revidering", "Avsluttet"];

export default function AdminAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [texts, setTexts] = useState<TextData[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [togglingFeedback, setTogglingFeedback] = useState(false);
  const [tab, setTab] = useState<"texts" | "reviews" | "settings">("texts");
  const [expandedText, setExpandedText] = useState<string | null>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [teacherFeedbacks, setTeacherFeedbacks] = useState<TeacherFeedbackData[]>([]);
  const [addingFeedbackTo, setAddingFeedbackTo] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<string | null>(null);
  const [showTimerControls, setShowTimerControls] = useState(false);
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
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string; kandidatnummer: string }[]>([]);
  const assignmentRef = useRef<AssignmentDetail | null>(null);

  useEffect(() => {
    assignmentRef.current = assignment;
  }, [assignment]);

  useEffect(() => {
    loadData();
  }, [id]);

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
      if (!aRes.ok) return;
      const assignmentData: AssignmentDetail = await aRes.json();
      setAssignment(assignmentData);

      const [tRes, rRes, tfRes, mRes] = await Promise.all([
        fetch(`/api/assignments/${id}/texts`),
        fetch(`/api/assignments/${id}/reviews`),
        fetch(`/api/assignments/${id}/teacher-feedback`),
        fetch(`/api/groups/${assignmentData.group.id}/members`),
      ]);
      if (tRes.ok) setTexts(await tRes.json());
      if (rRes.ok) setReviews(await rRes.json());
      if (tfRes.ok) setTeacherFeedbacks(await tfRes.json());
      if (mRes.ok) setMembers(await mRes.json());
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
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setTogglingFeedback(false);
    }
  }

  useEffect(() => {
    if (!assignment?.timerEndAt) {
      setTimerRemaining(null);
      return;
    }
    function tick() {
      const end = new Date(assignmentRef.current!.timerEndAt!).getTime();
      const diff = end - Date.now();
      if (diff <= 0) { setTimerRemaining("00:00"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimerRemaining(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [assignment?.timerEndAt]);

  async function handleStartTimer(minutes: number) {
    const label = timerLabel || stepLabels[(getCurrentStep(assignment!) - 1)];
    const res = await fetch(`/api/assignments/${id}/timer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMinutes: minutes, label }),
    });
    if (res.ok) {
      const data = await res.json();
      setAssignment((prev) => prev ? { ...prev, timerEndAt: data.timerEndAt, timerLabel: data.timerLabel } : prev);
      setShowTimerControls(false);
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
      review: "responsfase",
      closed: "avsluttet",
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

  const currentStep = getCurrentStep(assignment);
  const revisionCount = texts.filter((t) => t.revisedContent).length;
  const globalOpen =
    assignment.feedbackOpen ||
    (assignment.feedbackDeadline && new Date(assignment.feedbackDeadline) <= new Date());

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/admin/assignments" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4"/></svg>
          Tilbake til oppgaver
        </Link>
        <button
          onClick={() => setShowGuideModal(true)}
          title="Slik gjennomfører du en oppgave"
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-500 flex items-center justify-center text-sm font-semibold transition-colors"
        >
          ?
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-gray-500">{assignment.group.name}</p>
            <button
              onClick={() => navigator.clipboard.writeText(assignment.group.joinCode)}
              title="Kopier kode — del denne med elevene så de kan bli med i gruppen"
              className="inline-flex items-center gap-1.5 text-xs font-mono bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 px-2 py-1 rounded-lg transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="9" height="11" rx="1"/><path d="M2 5h0a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1v0"/></svg>
              {assignment.group.joinCode}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {assignment.isArchived && (
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-gray-200 text-gray-600">Arkivert</span>
          )}
          {assignment.isPaused && (
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-orange-100 text-orange-800">Pauset</span>
          )}
        </div>
      </div>

      {/* Phase stepper — completed steps are clickable to go back */}
      <div className="flex items-start mb-6">
        {stepLabels.map((label, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          // Determine back-action for completed steps
          let backAction: (() => void) | null = null;
          if (isCompleted) {
            if (step === 1) backAction = () => handlePhaseChange("writing");
            else if (step === 2) backAction = () => handlePhaseChange("review");
            else if (step === 3 && assignment.phase !== "closed") backAction = handleToggleFeedback;
          }

          const circle = (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              isCompleted
                ? backAction ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" : "bg-blue-600 text-white"
                : isCurrent
                ? "bg-white border-2 border-blue-600 text-blue-600"
                : "bg-gray-100 text-gray-400"
            }`}>
              {isCompleted ? (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3.5 3.5L13 4"/></svg>
              ) : step}
            </div>
          );

          return (
            <div key={step} className="flex items-start flex-1 last:flex-initial">
              {backAction ? (
                <button
                  onClick={backAction}
                  disabled={changingPhase || togglingFeedback}
                  title={`Gå tilbake til ${label}`}
                  className="flex flex-col items-center disabled:opacity-50 group"
                >
                  {circle}
                  <span className="text-xs mt-1 font-medium whitespace-nowrap text-blue-500 group-hover:text-blue-700 transition-colors">
                    {label}
                  </span>
                </button>
              ) : (
                <div className="flex flex-col items-center">
                  {circle}
                  <span className={`text-xs mt-1 font-medium whitespace-nowrap ${
                    isCurrent ? "text-blue-700" : "text-gray-400"
                  }`}>
                    {label}
                  </span>
                </div>
              )}
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-px mt-4 mx-2 ${step < currentStep ? "bg-blue-400" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Paused banner */}
      {assignment.isPaused && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 mb-5 flex items-center justify-between">
          <p className="text-sm text-orange-800 font-medium">Oppgaven er midlertidig pauset. Elever kan ikke gjøre noe.</p>
          <button
            onClick={() => handlePhaseChange("resumed")}
            disabled={changingPhase}
            className="text-sm font-medium text-green-700 hover:text-green-800 disabled:opacity-50"
          >
            Gjenoppta
          </button>
        </div>
      )}

      {/* Contextual action card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">

        {/* Step 1: Skriving */}
        {currentStep === 1 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">Skrivefase pågår</h3>
              <span className="text-sm text-gray-500">
                {assignment.stats.textCount} av {assignment.stats.memberCount} elever har levert tekst
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${pct(assignment.stats.textCount, assignment.stats.memberCount)}%` }}
              />
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              {assignment.stats.textCount > 0 && (
                <button
                  onClick={handleDistribute}
                  disabled={distributing}
                  title={assignment.distributionDone
                    ? "Tildeler tekster på nytt. Elever som allerede er i gang kan bli påvirket."
                    : "Fordeler elevtekstene til hverandre for fagfellevurdering."}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {distributing ? "Tildeler..." : assignment.distributionDone ? "Tildel på nytt" : "Tildel tekster"}
                </button>
              )}
              {assignment.distributionDone && (
                <button
                  onClick={() => handlePhaseChange("review")}
                  disabled={changingPhase}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
                >
                  Bytt til Responsfase →
                </button>
              )}
              <div className="flex-1" />
              {!assignment.isPaused && (
                <button
                  onClick={() => handlePhaseChange("paused")}
                  disabled={changingPhase}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                >
                  Pause
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Respons */}
        {currentStep === 2 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">Responsfase pågår</h3>
              <span className="text-sm text-gray-500">
                {assignment.stats.reviewCount} av {assignment.stats.reviewAssignmentCount} vurderinger levert
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
              <div
                className="bg-yellow-500 h-1.5 rounded-full transition-all"
                style={{ width: `${pct(assignment.stats.reviewCount, assignment.stats.reviewAssignmentCount)}%` }}
              />
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <button
                onClick={handleToggleFeedback}
                disabled={togglingFeedback}
                title="Åpner Revideringsfasen for alle elever. De kan lese tilbakemeldingene og levere 2. utkast."
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {togglingFeedback ? "..." : "Åpne Revidering for alle"}
              </button>
              <div className="flex-1" />
              {!assignment.isPaused && (
                <button
                  onClick={() => handlePhaseChange("paused")}
                  disabled={changingPhase}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                >
                  Pause
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Revidering */}
        {currentStep === 3 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">Revideringsfase pågår</h3>
              <span className="text-sm text-gray-500">
                {revisionCount} av {texts.length} har levert revidert tekst
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all"
                style={{ width: `${pct(revisionCount, texts.length)}%` }}
              />
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <div className="flex-1" />
              <button
                onClick={handleToggleFeedback}
                disabled={togglingFeedback}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
              >
                {togglingFeedback ? "..." : "Lukk Revidering"}
              </button>
              <button
                onClick={() => handlePhaseChange("closed")}
                disabled={changingPhase}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
              >
                Avslutt oppgaven
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Avsluttet */}
        {currentStep === 4 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Oppgaven er avsluttet</h3>
            <p className="text-sm text-gray-500 mb-3">Last ned rapport eller gjenåpne for å gjøre endringer.</p>
            <div className="flex gap-3 flex-wrap items-center">
              <a
                href={`/api/assignments/${id}/export?format=pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Last ned PDF
              </a>
              <a
                href={`/api/assignments/${id}/export?format=xlsx`}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Last ned Excel
              </a>
              <a
                href={`/api/assignments/${id}/export`}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Eksporter HTML
              </a>
              <div className="flex-1" />
              <button
                onClick={() => handlePhaseChange("review")}
                disabled={changingPhase}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-50"
              >
                Gjenåpne i Responsfase
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student status table — always visible */}
      {texts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">Elevstatus</h3>
            {texts.length < assignment.stats.memberCount && (() => {
              const submittedKnr = new Set(texts.map((t) => t.author.kandidatnummer));
              const missing = members.filter((m) => !submittedKnr.has(m.kandidatnummer));
              const count = assignment.stats.memberCount - texts.length;
              return (
                <div className="relative group">
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full cursor-default">
                    {count} elev{count !== 1 ? "er" : ""} har ikke levert tekst
                  </span>
                  {missing.length > 0 && (
                    <div className="absolute right-0 top-full mt-1 z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                      {missing.map((m) => (
                        <div key={m.id}>{m.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 py-2 pr-4">Elev</th>
                  <th className="text-center font-medium text-gray-500 px-3">Respons gitt</th>
                  <th className="text-center font-medium text-gray-500 px-3">Revidering</th>
                </tr>
              </thead>
              <tbody>
                {texts.map((t) => (
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
                        t.reviewsGiven >= assignment.minReviews
                          ? "text-green-700"
                          : t.reviewsGiven > 0
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}>
                        {t.reviewsGiven} / {assignment.minReviews}
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
                          title="Åpner Revidering kun for denne eleven — nyttig for elever uten medelever å vurdere."
                          className="text-xs bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {unlockingFeedback === t.id ? "..." : "Åpne Revidering"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compact timer */}
      <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
        {assignment.timerEndAt && timerRemaining !== null ? (
          <div className="px-5 py-3 flex items-center gap-4">
            <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
            <span className={`text-2xl font-mono font-bold ${timerRemaining === "00:00" ? "text-red-600" : "text-blue-600"}`}>
              {timerRemaining}
            </span>
            {assignment.timerLabel && (
              <span className="text-sm text-gray-500">{assignment.timerLabel}</span>
            )}
            {timerRemaining === "00:00" && (
              <span className="text-sm text-red-600 font-medium">Tiden er ute!</span>
            )}
            <div className="flex-1" />
            <button
              onClick={handleStopTimer}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Stopp
            </button>
            <button
              onClick={() => setShowTimerControls((v) => !v)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Ny timer
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowTimerControls((v) => !v)}
            className="w-full px-5 py-3 flex items-center gap-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors text-left"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
            Klasseromstimer
            <svg className={`w-3.5 h-3.5 ml-auto transition-transform ${showTimerControls ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4"/></svg>
          </button>
        )}
        {showTimerControls && (
          <div className="px-5 pb-4 border-t border-gray-100 pt-3">
            <div className="flex flex-wrap gap-2 mb-3">
              {[5, 10, 15, 20, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => handleStartTimer(m)}
                  className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
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
                className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <span className="text-sm text-gray-500">min</span>
              <input
                type="text"
                value={timerLabel}
                onChange={(e) => setTimerLabel(e.target.value)}
                placeholder="Etikett (valgfri)"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <button
                onClick={() => handleStartTimer(customMinutes)}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
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
        {(["texts", "reviews", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {{ texts: "Tekster", reviews: "Vurderinger", settings: "Innstillinger" }[t]}
          </button>
        ))}
      </div>

      {/* Tekster tab */}
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
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="font-medium text-gray-900">{t.author.name}</span>
                      <span className="font-mono text-xs text-gray-500 ml-2">{t.author.kandidatnummer}</span>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t._count.reviews} vurderinger mottatt</span>
                    {t.revisedContent && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">2. utkast levert</span>
                    )}
                    {t.windowSwitches > 0 && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          t.windowSwitches >= 5 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}
                        title="Antall ganger eleven byttet vindu eller fane under skriving"
                      >
                        {t.windowSwitches}× vindubytte
                      </span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{expandedText === t.id ? <path d="M4 10l4-4 4 4"/> : <path d="M4 6l4 4 4-4"/>}</svg>
                </button>
                {expandedText === t.id && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    {/* 1. utkast */}
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mt-4 mb-2">1. utkast</p>
                    <div className="prose prose-sm max-w-none text-gray-700 bg-blue-50 rounded-lg p-4" dangerouslySetInnerHTML={{ __html: t.content }} />
                    <p className="text-xs text-gray-400 mt-1">Levert: {new Date(t.createdAt).toLocaleString("no-NO")}</p>

                    {/* Tilbakemeldinger fra medelever */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Tilbakemeldinger fra medelever ({reviews.filter((r) => r.text.id === t.id && !r.rejectedAt).length})
                      </p>
                      {reviews.filter((r) => r.text.id === t.id).length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Ingen tilbakemeldinger ennå.</p>
                      ) : reviews.filter((r) => r.text.id === t.id).map((r, i) => (
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

                    {/* 2. utkast (revidert) */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">2. utkast (revidert)</p>
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

      {/* Vurderinger tab */}
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
                    <div className="flex items-center gap-1">
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
                  <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{expandedReview === r.id ? <path d="M4 10l4-4 4 4"/> : <path d="M4 6l4 4 4-4"/>}</svg>
                </button>
                {expandedReview === r.id && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    <div className="prose prose-sm max-w-none text-gray-700 mt-4" dangerouslySetInnerHTML={{ __html: r.content }} />
                    <div className="flex items-center gap-3 mt-3">
                      <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString("no-NO")}</p>
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

      {/* Innstillinger tab */}
      {tab === "settings" && (
        <div className="space-y-5">

          {/* Oppgavetekst */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
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
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingTaskText ? "Lagrer..." : "Lagre"}
                  </button>
                  <button onClick={() => setEditingTaskText(false)} className="text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100">
                    Avbryt
                  </button>
                </div>
              </div>
            ) : assignment.taskText ? (
              <p className="text-gray-600 text-sm whitespace-pre-wrap bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">{assignment.taskText}</p>
            ) : (
              <p className="text-gray-400 text-sm italic">Ingen oppgavetekst satt.</p>
            )}
          </div>

          {/* Hjelpemidler */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
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
                  { key: "feedback", label: "Revidering" },
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
                          {phases.map((p) => <th key={p.key} className="text-center font-medium text-gray-600 px-3">{p.label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {tools.map((tool) => (
                          <tr key={tool.key}>
                            <td className="py-1 pr-4 text-gray-700">{tool.label}</td>
                            {phases.map((phase) => (
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
                          {phases.map((phase) => (
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

          {/* Frister og info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-medium text-gray-700 mb-3">Frister og info</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-600">Skrivefrist: </span>
                <span className="text-gray-500">
                  {new Date(assignment.writeDeadline).getFullYear() > new Date().getFullYear()
                    ? "Manuelt styrt"
                    : new Date(assignment.writeDeadline).toLocaleString("no-NO")}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Vurderingsfrist: </span>
                <span className="text-gray-500">
                  {new Date(assignment.reviewDeadline).getFullYear() > new Date().getFullYear()
                    ? "Manuelt styrt"
                    : new Date(assignment.reviewDeadline).toLocaleString("no-NO")}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Min. vurderinger: </span>
                <span className="text-gray-500">{assignment.minReviews}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Tildeling: </span>
                <span className="text-gray-500">{assignment.distributionDone ? "Gjort" : "Ikke gjort"}</span>
              </div>
              {assignment.feedbackDeadline && (
                <div>
                  <span className="font-medium text-gray-600">Revideringsfrist: </span>
                  <span className="text-gray-500">{new Date(assignment.feedbackDeadline).toLocaleString("no-NO")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Eksport */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-medium text-gray-700 mb-3">Eksporter rapport</h3>
            <div className="flex gap-3 flex-wrap">
              <a
                href={`/api/assignments/${id}/export?format=pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Last ned PDF
              </a>
              <a href={`/api/assignments/${id}/export`} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Eksporter HTML
              </a>
              <a
                href={`/api/assignments/${id}/export?format=xlsx`}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Last ned Excel
              </a>
            </div>
          </div>

          {/* Faresone */}
          <div className="bg-white rounded-xl border border-red-100 p-5">
            <h3 className="font-medium text-gray-700 mb-3">Faresone</h3>
            <div className="flex gap-3 flex-wrap">
              {!assignment.isArchived && (
                <button
                  onClick={() => handlePhaseChange("archived")}
                  disabled={changingPhase}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Arkiver oppgaven
                </button>
              )}
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Slett oppgaven permanent
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Arkivering skjuler oppgaven for elever. Sletting er permanent og kan ikke angres.</p>
          </div>

        </div>
      )}

      {/* Guide modal overlay */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Slik gjennomfører du en oppgave</h2>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-x-8 gap-y-2 text-sm text-gray-800">
              <div className="flex-1 space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  <p><strong>Skrivefase</strong> — Elevene skriver og leverer teksten sin. Du kan legge til oppgavetekst og velge hjelpemidler under Innstillinger.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  <p><strong>Tildel tekster</strong> — Klikk «Tildel tekster» når skrivefristen er ute, deretter «Bytt til Responsfase».</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  <p><strong>Responsfase</strong> — Elevene gir tilbakemeldinger på hverandres tekster. Følg med i Elevstatus-tabellen.</p>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">4</span>
                  <p><strong>Åpne Revidering</strong> — Klikk «Åpne Revidering for alle». Elevene leser tilbakemeldingene og leverer et revidert utkast.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">5</span>
                  <p><strong>Individuelle unntak</strong> — Elev uten medelever? Bruk «Åpne Revidering» per elev i Elevstatus-tabellen.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">6</span>
                  <p><strong>Eksporter</strong> — Last ned rapport (HTML/CSV) med 1. utkast, tilbakemeldinger og revidert utkast.</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Tips: Klikk på fullførte faser i fremgangslinjen for å gå tilbake til en tidligere fase.</p>
          </div>
        </div>
      )}

    </div>
  );
}
