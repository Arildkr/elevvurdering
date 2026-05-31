"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";
import { getRandomPreset, type ExamGenre, type ExamLanguage } from "@/lib/exam-presets";
import { type PhaseTools } from "@/lib/tools-config";

const DRAFT_KEY = "practice_draft";
const TASK_KEY = "practice_task";

function textLength(html: string): number {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length;
}

export default function PracticePage() {
  const [language, setLanguage] = useState<ExamLanguage>("bokmål");
  const [genre, setGenre] = useState<ExamGenre>("skjønnlitteratur");
  const [taskText, setTaskText] = useState<string>("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sentTo: string[] } | { error: string } | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const didInit = useRef(false);

  // Check login state
  useEffect(() => {
    fetch("/api/auth/me").then((r) => setLoggedIn(r.ok)).catch(() => setLoggedIn(false));
  }, []);

  // Restore draft from localStorage on mount
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    const savedTask = localStorage.getItem(TASK_KEY);
    if (savedDraft) setContent(savedDraft);
    if (savedTask) {
      setTaskText(savedTask);
    } else {
      pickNewTask("skjønnlitteratur", "bokmål");
    }
  }, []);

  // Persist draft on change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, content);
  }, [content]);

  // Warn before leaving if there's content
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (content.length >= 50) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [content]);

  // Persist task on change
  useEffect(() => {
    if (taskText) localStorage.setItem(TASK_KEY, taskText);
  }, [taskText]);

  function pickNewTask(g: ExamGenre, l: ExamLanguage) {
    const preset = getRandomPreset(g, l);
    if (preset) setTaskText(preset.text);
  }

  function handleLanguageChange(l: ExamLanguage) {
    setLanguage(l);
    pickNewTask(genre, l);
  }

  function handleGenreChange(g: ExamGenre) {
    setGenre(g);
    pickNewTask(g, language);
  }

  async function handleSend() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/practice/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, language, taskText, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendResult({ error: data.error || "Noe gikk galt" });
      } else {
        setSendResult({ sentTo: data.sentTo });
      }
    } catch {
      setSendResult({ error: "Noe gikk galt. Prøv igjen." });
    } finally {
      setSending(false);
    }
  }

  const charCount = textLength(content);
  const tools: PhaseTools = {
    spellCheck: true,
    readingHelp: true,
    aiAnalysis: true,
    targetForm: language === "nynorsk" ? "nn" : "nb",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4"/></svg>
            Tilbake til dashboard
          </Link>
          <h1 className="text-base font-semibold text-gray-900">Øv til eksamen</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">

        {/* Pickers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          {/* Language */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Målform</p>
            <div className="flex gap-2">
              {(["bokmål", "nynorsk"] as ExamLanguage[]).map((l) => (
                <button
                  key={l}
                  onClick={() => handleLanguageChange(l)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    language === l
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Genre */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Sjanger</p>
            <div className="flex gap-2">
              {(["skjønnlitteratur", "sakprosa"] as ExamGenre[]).map((g) => (
                <button
                  key={g}
                  onClick={() => handleGenreChange(g)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    genre === g
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Task card */}
        {taskText && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 mb-2">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Oppgave</p>
              <button
                onClick={() => pickNewTask(genre, language)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap shrink-0"
              >
                Ny oppgave →
              </button>
            </div>
            <p className="text-gray-800 text-sm leading-relaxed">{taskText}</p>
          </div>
        )}

        {/* Editor */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Skriv teksten din her..."
            minHeight="320px"
            availableTools={tools}
          />
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className={`text-sm ${charCount < 50 ? "text-amber-600" : "text-gray-400"}`}>
              {charCount} tegn{charCount < 50 ? " — minimum 50 tegn" : ""}
            </p>
            <p className="text-xs text-gray-400">Utkastet lagres automatisk i nettleseren</p>
          </div>
        </div>

        {/* Send section */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Send til læreren din</h2>
          <p className="text-sm text-gray-500 mb-4">
            Læreren din mottar teksten på e-post. Dette lagres ikke i systemet.
          </p>

          {sendResult && "sentTo" in sendResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-green-800 font-medium">Teksten er sendt!</p>
              <p className="text-xs text-green-700 mt-0.5">
                Sendt til: {sendResult.sentTo.join(", ")}
              </p>
            </div>
          )}
          {sendResult && "error" in sendResult && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-red-700">{sendResult.error}</p>
            </div>
          )}

          {loggedIn === false ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-sm text-amber-800">
                Du må logge inn for å sende teksten.{" "}
                <Link href="/login" className="font-medium underline hover:text-amber-900">
                  Logg inn
                </Link>
              </p>
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending || charCount < 50 || !taskText}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {sending ? "Sender..." : "Send til læreren min"}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center pb-4">
          Teksten lagres kun i nettleseren din. Den slettes hvis du tømmer nettleserdata.
        </p>
      </main>
    </div>
  );
}
