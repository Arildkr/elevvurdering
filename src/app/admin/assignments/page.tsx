"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DEFAULT_TOOLS_CONFIG,
  type AssignmentToolsConfig,
  type PhaseTools,
} from "@/lib/tools-config";

interface Group {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  title: string;
  writeDeadline: string;
  reviewDeadline: string;
  distributionDone: boolean;
  group: { id: string; name: string };
  phase: "writing" | "review" | "closed" | "paused";
  isArchived: boolean;
  _count: { texts: number; reviewAssignments: number };
}

const phaseLabels = { writing: "Skriving", review: "Respons", closed: "Lukket", paused: "Pauset" };
const phaseColors = {
  writing: "bg-green-100 text-green-800",
  review: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-600",
  paused: "bg-orange-100 text-orange-800",
};

export default function AdminAssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [writeDeadline, setWriteDeadline] = useState("");
  const [reviewDeadline, setReviewDeadline] = useState("");
  const [minReviews, setMinReviews] = useState(1);
  const [feedbackDeadline, setFeedbackDeadline] = useState("");
  const [taskText, setTaskText] = useState("");
  const [toolsConfig, setToolsConfig] = useState<AssignmentToolsConfig>(DEFAULT_TOOLS_CONFIG);

  function updatePhaseTool<K extends keyof PhaseTools>(
    phase: keyof AssignmentToolsConfig,
    key: K,
    value: PhaseTools[K]
  ) {
    setToolsConfig((prev) => ({
      ...prev,
      [phase]: { ...prev[phase], [key]: value },
    }));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [aRes, gRes] = await Promise.all([
        fetch("/api/assignments"),
        fetch("/api/groups"),
      ]);
      if (aRes.ok) setAssignments(await aRes.json());
      if (gRes.ok) setGroups(await gRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setCreating(true);

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          taskText: taskText || undefined,
          groupId,
          toolsConfig: JSON.stringify(toolsConfig),
          writeDeadline: writeDeadline ? new Date(writeDeadline).toISOString() : undefined,
          reviewDeadline: reviewDeadline ? new Date(reviewDeadline).toISOString() : undefined,
          minReviews,
          feedbackDeadline: feedbackDeadline ? new Date(feedbackDeadline).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Noe gikk galt");
        return;
      }

      setTitle("");
      setDescription("");
      setTaskText("");
      setGroupId("");
      setWriteDeadline("");
      setReviewDeadline("");
      setMinReviews(1);
      setFeedbackDeadline("");
      setShowForm(false);
      loadData();
    } catch {
      setFormError("Noe gikk galt");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Laster...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Oppgaver</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Avbryt" : "Opprett oppgave"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Ny oppgave</h2>

          {/* Onboarding: oppgaveflyt */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Slik fungerer oppgaven</p>
            <div className="flex items-start gap-0">
              {[
                { num: "1", label: "Skriving", desc: "Eleven skriver sitt utkast og bruker evt. stavekontroll og AI-analyse", color: "bg-blue-100 text-blue-700 border-blue-200" },
                { num: "2", label: "Respons", desc: "Eleven leser og vurderer én eller flere medelevtekster anonymt", color: "bg-amber-100 text-amber-700 border-amber-200" },
                { num: "3", label: "Forbedre", desc: "Eleven ser responsen de fikk og kan skrive et forbedret utkast", color: "bg-green-100 text-green-700 border-green-200" },
                { num: "4", label: "Lærer", desc: "Du leser alle tekster og responser, og kan legge til egne kommentarer", color: "bg-purple-100 text-purple-700 border-purple-200" },
              ].map((step, i, arr) => (
                <div key={step.num} className="flex items-start flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold shrink-0 ${step.color}`}>
                      {step.num}
                    </div>
                    <p className={`text-xs font-semibold mt-1.5 mb-0.5 ${step.color.split(" ")[1]}`}>{step.label}</p>
                    <p className="text-xs text-slate-500 text-center leading-snug px-1">{step.desc}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="mt-3.5 shrink-0 text-slate-300 text-sm mx-1">→</div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3 border-t border-slate-200 pt-2">
              Du styrer fasene manuelt fra oppgavesiden. Trinn 2 og 3 er valgfrie — du kan avslutte etter Skriving om du vil.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gruppe</label>
              {groups.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-yellow-800">
                    Du har ingen grupper ennå.{" "}
                    <Link href="/admin/groups" className="font-medium underline hover:text-yellow-900">
                      Opprett en gruppe først
                    </Link>
                  </p>
                </div>
              ) : (
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="">Velg gruppe...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tittel</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse (valgfritt)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Oppgavetekst (valgfritt)</label>
              <textarea
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                rows={4}
                placeholder="Skriv oppgaveteksten her. Denne vises for eleven mens de skriver."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">Vises i en blå boks over tekstfeltet under skriving.</p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAdvanced ? "Skjul avanserte innstillinger \u25B2" : "Vis avanserte innstillinger \u25BC"}
              </button>
              {showAdvanced && (
                <div className="space-y-4 border-t border-gray-100 pt-4 mt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Skrivefrist (valgfritt)</label>
                      <input
                        type="datetime-local"
                        value={writeDeadline}
                        onChange={(e) => setWriteDeadline(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Responsfrist (valgfritt)</label>
                      <input
                        type="datetime-local"
                        value={reviewDeadline}
                        onChange={(e) => setReviewDeadline(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frist for Forbedre-fase (valgfritt)
                    </label>
                    <input
                      type="datetime-local"
                      value={feedbackDeadline}
                      onChange={(e) => setFeedbackDeadline(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum antall responser per elev
                    </label>
                    <input
                      type="number"
                      value={minReviews}
                      onChange={(e) => setMinReviews(parseInt(e.target.value))}
                      min={1}
                      max={10}
                      className="w-24 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  {/* Verktøy per fase */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tilgjengelige verktøy for elevene
                    </label>

                    {/* Tool progression explanation */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3 text-sm space-y-2">
                      <p className="text-gray-600 font-medium text-xs uppercase tracking-wide mb-3">Støttenivå – velg etter elevenes behov:</p>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex items-center gap-1 shrink-0 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5">Lav støtte</span>
                        <div>
                          <span className="font-medium text-gray-800">Stavekontroll</span>
                          <span className="text-gray-500"> — markerer ord som sannsynligvis er stavet feil, og foreslår riktig stavemåte. Fanger også vanlige forvekslingslyder (gj/j, kj/j, hj/j, hv/v) og dialektformer.</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex items-center gap-1 shrink-0 bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5">Middels støtte</span>
                        <div>
                          <span className="font-medium text-gray-800">Lesehjelp</span>
                          <span className="text-gray-500"> — i tillegg: forklarer mønstre som forvekslingslyder og dialektord, og gir tips om setningsoppbygging (lange setninger, gjentagelser, avsnitt).</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="inline-flex items-center gap-1 shrink-0 bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5">Høy støtte</span>
                        <div>
                          <span className="font-medium text-gray-800">AI-analyse</span>
                          <span className="text-gray-500"> — leser hele teksten og gir kontekstbasert, intelligent tilbakemelding på innhold, struktur og språk. Mest hjelp, men krever at eleven selv vurderer forslagene kritisk.</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 pt-2 border-t border-gray-200 mt-1">
                        <span className="inline-flex items-center gap-1 shrink-0 bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5">Ingen støtte</span>
                        <div>
                          <span className="text-gray-500">Alle verktøy avslått — egnet ved eksamen eller når læreren ønsker at eleven skal arbeide helt selvstendig.</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
                      {/* Header */}
                      <div className="grid grid-cols-[140px_1fr_1fr_1fr_110px] bg-gray-50 border-b border-gray-200">
                        <div className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fase</div>
                        <div className="px-3 py-3 text-center">
                          <div className="text-xs font-semibold text-blue-700">Stavekontroll</div>
                          <div className="text-xs text-gray-400 font-normal mt-0.5">Lav støtte</div>
                        </div>
                        <div className="px-3 py-3 text-center">
                          <div className="text-xs font-semibold text-amber-700">Lesehjelp</div>
                          <div className="text-xs text-gray-400 font-normal mt-0.5">Middels støtte</div>
                        </div>
                        <div className="px-3 py-3 text-center">
                          <div className="text-xs font-semibold text-purple-700">AI-analyse</div>
                          <div className="text-xs text-gray-400 font-normal mt-0.5">Høy støtte</div>
                        </div>
                        <div className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Målform</div>
                      </div>
                      {(["writing", "review", "feedback"] as const).map((phase) => {
                        const labels = { writing: "Skriving", review: "Respons", feedback: "Forbedre" };
                        const t = toolsConfig[phase];
                        return (
                          <div
                            key={phase}
                            className="grid grid-cols-[140px_1fr_1fr_1fr_110px] border-b last:border-0 border-gray-100 items-center"
                          >
                            <div className="px-3 py-2.5 font-medium text-gray-700">{labels[phase]}</div>
                            {(["spellCheck", "readingHelp", "aiAnalysis"] as const).map((key) => (
                              <div key={key} className="flex justify-center py-2.5">
                                <input
                                  type="checkbox"
                                  checked={t[key]}
                                  onChange={(e) => updatePhaseTool(phase, key, e.target.checked)}
                                  className="w-4 h-4 rounded accent-blue-600"
                                />
                              </div>
                            ))}
                            <div className="px-3 py-2">
                              <select
                                value={t.targetForm}
                                onChange={(e) => updatePhaseTool(phase, "targetForm", e.target.value as "nb" | "nn")}
                                className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-700"
                              >
                                <option value="nb">Bokmål</option>
                                <option value="nn">Nynorsk</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {formError && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
            )}
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? "Oppretter..." : "Opprett oppgave"}
            </button>
          </form>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Ingen oppgaver opprettet ennå.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Tittel</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Gruppe</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Fase</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Tekster</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Tildelt</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/admin/assignments/${a.id}`)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">{a.title}</td>
                  <td className="px-6 py-4 text-gray-600">{a.group.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${phaseColors[a.phase]}`}>
                        {phaseLabels[a.phase]}
                      </span>
                      {a.isArchived && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-200 text-gray-500">Arkivert</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{a._count.texts}</td>
                  <td className="px-6 py-4">
                    {a.distributionDone ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Ja</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Nei</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
