"use client";

import { useEffect, useState } from "react";

interface Teacher {
  id: string;
  name: string;
  kandidatnummer: string;
  isActive: boolean;
  createdAt: string;
  _count: { createdGroups: number };
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [newTeacher, setNewTeacher] = useState<{ name: string; kandidatnummer: string } | null>(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  async function loadTeachers() {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) setTeachers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setCreating(true);

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Noe gikk galt");
        return;
      }

      setNewTeacher({ name: data.name, kandidatnummer: data.kandidatnummer });
      setName("");
      setShowForm(false);
      loadTeachers();
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
        <h1 className="text-2xl font-bold text-gray-900">Lærere</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Avbryt" : "Opprett lærer"}
        </button>
      </div>

      {/* New teacher created modal */}
      {newTeacher && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-green-800 mb-2">Ny lærer opprettet!</h3>
          <p className="text-green-700 mb-1">
            <span className="font-medium">Navn:</span> {newTeacher.name}
          </p>
          <p className="text-green-700 mb-3">
            <span className="font-medium">Kandidatnummer:</span>{" "}
            <span className="font-mono text-lg bg-green-100 px-2 py-0.5 rounded">{newTeacher.kandidatnummer}</span>
          </p>
          <p className="text-sm text-green-600 mb-3">
            Del dette kandidatnummeret med den nye læreren. De logger inn med dette nummeret.
          </p>
          <button
            onClick={() => setNewTeacher(null)}
            className="text-sm text-green-700 hover:text-green-800 font-medium"
          >
            Lukk
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Opprett ny lærer</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ola Nordmann"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
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
              {creating ? "Oppretter..." : "Opprett lærer"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Navn</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Kandidatnr.</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Grupper</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Opprettet</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                <td className="px-6 py-4 font-mono text-sm text-gray-600">{t.kandidatnummer}</td>
                <td className="px-6 py-4 text-gray-600">{t._count.createdGroups}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(t.createdAt).toLocaleDateString("no-NO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
