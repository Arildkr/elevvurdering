"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  phase: "writing" | "review" | "closed";
  _count: { texts: number; reviewAssignments: number };
}

const phaseLabels = { writing: "Skriving", review: "Vurdering", closed: "Lukket" };
const phaseColors = {
  writing: "bg-green-100 text-green-800",
  review: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-600",
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
          groupId,
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
            <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              Oppgaven aktiveres med en gang i skrivefase. Du styrer fasene manuelt fra oppgavesiden, eller kan sette frister under avanserte innstillinger.
            </p>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vurderingsfrist (valgfritt)</label>
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
                      Tilbakemeldingsfrist (valgfritt)
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
                      Minimum antall vurderinger per elev
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
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${phaseColors[a.phase]}`}>
                      {phaseLabels[a.phase]}
                    </span>
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
