"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import RichTextEditor, { RichTextViewer } from "@/components/RichTextEditor";
import { parseToolsConfig, type PhaseTools } from "@/lib/tools-config";

export default function SubmitTextPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [content, setContent] = useState("");
  const [taskText, setTaskText] = useState<string | null>(null);
  const [chosenTaskText, setChosenTaskText] = useState<string | null>(null);
  const [isExercise, setIsExercise] = useState(false);
  const [existingText, setExistingText] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [writingTools, setWritingTools] = useState<PhaseTools | null>(null);
  const [error, setError] = useState("");
  const [timerEndAt, setTimerEndAt] = useState<string | null>(null);
  const [timerLabel, setTimerLabel] = useState<string | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<string | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [windowSwitches, setWindowSwitches] = useState(0);
  const windowSwitchesRef = useRef(0);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);

  // Initial load
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
            if (data.text.chosenTaskText) {
              setChosenTaskText(data.text.chosenTaskText);
              setTaskText(data.text.chosenTaskText);
            }
          } else {
            setCanEdit(true);
          }
          if (!data.canSubmit && !data.text) {
            router.push(`/assignment/${id}`);
            return;
          }
        }
        if (assignRes.ok) {
          const aData = await assignRes.json();
          setTimerEndAt(aData.timerEndAt);
          setTimerLabel(aData.timerLabel);
          setWritingTools(parseToolsConfig(aData.toolsConfig).writing);
          setIsExercise(!!aData.isExercise);
          if (aData.phase === "paused" || aData.phase === "closed" || aData.phase === "review") {
            router.push(`/assignment/${id}`);
            return;
          }
          // For exercise: use URL param only when no existing text/chosenTaskText
          if (aData.isExercise) {
            setChosenTaskText((prev) => {
              if (prev) { setTaskText(prev); return prev; }
              const taskParam = searchParams.get("task");
              const chosen =
                taskParam === "1" && aData.taskOption1 ? aData.taskOption1 :
                taskParam === "2" && aData.taskOption2 ? aData.taskOption2 :
                null;
              if (chosen) setTaskText(chosen);
              return chosen;
            });
          } else {
            setTaskText(aData.taskText ?? null);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  // Poll for phase changes while student is writing — redirect if teacher pauses/closes
  useEffect(() => {
    if (!canEdit && !loading) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/assignments/${id}`);
        if (!res.ok) return;
        const aData = await res.json();
        // Update timer in case teacher changed it
        setTimerEndAt(aData.timerEndAt);
        setTimerLabel(aData.timerLabel);
        if (aData.phase === "paused" || aData.phase === "closed" || aData.phase === "review") {
          router.push(`/assignment/${id}`);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [id, canEdit, loading, router]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!canEdit || !content || content.trim().length < 50) return;

    const interval = setInterval(async () => {
      setAutoSaveStatus("saving");
      try {
        const method = existingText ? "PUT" : "POST";
        const res = await fetch(`/api/assignments/${id}/my-text`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, windowSwitches: windowSwitchesRef.current }),
        });
        if (res.ok) {
          setAutoSaveStatus("saved");
          setLastSavedTime(new Date());
          localStorage.setItem(`draft_${id}`, content);
          setTimeout(() => setAutoSaveStatus("idle"), 2000);
        }
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [id, content, canEdit, existingText]); // windowSwitchesRef.current lest via ref

  // Save draft to localStorage on content change
  useEffect(() => {
    localStorage.setItem(`draft_${id}`, content);
  }, [id, content]);

  // Warn when leaving — always active while writing (not just before first autosave)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (canEdit && content.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [content, canEdit]);

  // Track window/tab switches — 1s warmup avoids false positive on page load
  useEffect(() => {
    if (!canEdit) return;
    let ready = false;
    const warmup = setTimeout(() => { ready = true; }, 1000);
    const handleVisibility = () => {
      if (!ready || document.visibilityState === "hidden") return;
      windowSwitchesRef.current += 1;
      setWindowSwitches(windowSwitchesRef.current);
      setShowSwitchWarning(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(warmup);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [canEdit]);

  // Timer countdown — clears itself when expired
  useEffect(() => {
    if (!timerEndAt) { setTimerRemaining(null); setTimerExpired(false); return; }
    function tick() {
      const diff = new Date(timerEndAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimerRemaining("00:00");
        setTimerExpired(true);
        clearInterval(interval);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimerRemaining(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerEndAt]);

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
        body: JSON.stringify({
          content,
          windowSwitches: windowSwitchesRef.current,
          ...(!existingText && chosenTaskText ? { chosenTaskText } : {}),
        }),
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
            <Link href={`/assignment/${id}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4"/></svg>
              Tilbake
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
          <Link href={`/assignment/${id}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4"/></svg>
            Tilbake
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">

        {/* Timer */}
        {timerEndAt && timerRemaining !== null && (
          <div className={`rounded-xl border-2 p-4 text-center ${
            timerExpired ? "border-red-300 bg-red-50" : "border-blue-300 bg-blue-50"
          }`}>
            <div className={`text-4xl font-mono font-bold ${
              timerExpired ? "text-red-600" : "text-blue-600"
            }`}>
              {timerRemaining}
            </div>
            {timerLabel && (
              <p className={`text-sm mt-1 font-medium ${timerExpired ? "text-red-600" : "text-blue-600"}`}>
                {timerLabel}
              </p>
            )}
            {timerExpired && (
              <p className="text-red-700 font-semibold mt-2">
                Tiden er ute — lever teksten din nå!
              </p>
            )}
          </div>
        )}

        {/* Window switch warning */}
        {showSwitchWarning && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-800 text-sm">Du har byttet vindu eller fane</p>
              <p className="text-amber-700 text-sm mt-0.5">
                Dette registreres ({windowSwitches} gang{windowSwitches !== 1 ? "er" : ""}). Prøv å holde deg i dette vinduet mens du skriver.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSwitchWarning(false)}
              className="shrink-0 text-amber-600 hover:text-amber-800 text-lg leading-none mt-0.5"
              aria-label="Lukk"
            >
              ✕
            </button>
          </div>
        )}

        {/* Task text */}
        {taskText && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Oppgave</p>
            <div className="text-gray-800 text-sm whitespace-pre-wrap">{taskText}</div>
          </div>
        )}

        {/* Editor card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            {existingText ? "Rediger tekst" : "Skriv tekst"}
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Skriv teksten din her..."
                minHeight="300px"
                availableTools={writingTools ?? undefined}
              />
              <div className="mt-2">
                <p className={`text-sm ${charCount < 50 ? "text-amber-600" : "text-gray-500"}`}>
                  {charCount} tegn{charCount < 50 ? ` — minimum 50 tegn` : ""}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={submitting || charCount < 50}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  timerExpired
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {submitting ? "Lagrer..." : existingText ? "Lagre endringer" : "Lever tekst"}
              </button>
              <div className="text-sm">
                {autoSaveStatus === "saving" && (
                  <span className="text-gray-500">Lagrer automatisk...</span>
                )}
                {autoSaveStatus === "saved" && (
                  <span className="text-green-600">✓ Lagret</span>
                )}
                {lastSavedTime && autoSaveStatus === "idle" && (
                  <span className="text-gray-400 text-xs">
                    Sist lagret: {lastSavedTime.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
