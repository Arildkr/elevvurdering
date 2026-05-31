"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  joinCode: string;
  _count: { members: number; assignments: number };
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newGroup, setNewGroup] = useState<{ name: string; joinCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) setGroups(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setCreating(true);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Noe gikk galt");
        return;
      }

      const created: Group = await res.json();
      setNewGroup({ name: created.name, joinCode: created.joinCode });
      setName("");
      setShowForm(false);
      setCopied(false);
      loadGroups();
    } catch {
      setFormError("Noe gikk galt");
    } finally {
      setCreating(false);
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="p-8 text-gray-500">Laster...</div>;

  return (
    <div className="p-8">
      <div id="tour-groups-header" className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Grupper</h1>
        <button
          id="tour-create-group"
          onClick={() => { setShowForm(!showForm); setNewGroup(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Avbryt" : "Opprett gruppe"}
        </button>
      </div>

      {/* New group code banner — shown after creation */}
      {newGroup && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <p className="text-sm font-semibold text-green-800 mb-1">
            Gruppe «{newGroup.name}» opprettet
          </p>
          <p className="text-sm text-green-700 mb-3">
            Del denne koden med elevene dine så de kan registrere seg:
          </p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-mono font-bold text-green-900 tracking-[0.2em] bg-white border border-green-200 rounded-lg px-4 py-2">
              {newGroup.joinCode}
            </span>
            <button
              onClick={() => copyCode(newGroup.joinCode)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              {copied ? "Kopiert!" : "Kopier"}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Ny gruppe</h2>
          <p className="text-sm text-gray-500 mb-4">
            Gruppekoden genereres automatisk — du kan dele den med elevene etter opprettelsen.
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gruppenavn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="F.eks. Klasse 10B Norsk"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
                autoFocus
              />
            </div>
            {formError && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
            )}
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? "Oppretter..." : "Opprett"}
            </button>
          </form>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Ingen grupper opprettet ennå.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Navn</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Kode</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Medlemmer</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Oppgaver</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{g.name}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-700 tracking-wider bg-gray-100 px-2 py-1 rounded">
                      {g.joinCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{g._count.members}</td>
                  <td className="px-6 py-4 text-gray-600">{g._count.assignments}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/groups/${g.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Detaljer
                    </Link>
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
