"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Member {
  id: string;
  name: string;
  kandidatnummer: string;
  isActive: boolean;
  joinedAt: string;
}

interface Group {
  id: string;
  name: string;
  joinCode: string;
  members: { user: Member }[];
}

export default function AdminGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [kicking, setKicking] = useState<string | null>(null);

  useEffect(() => {
    loadGroup();
  }, [id]);

  async function loadGroup() {
    try {
      const res = await fetch(`/api/groups/${id}`);
      if (res.ok) setGroup(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleKick(userId: string, userName: string) {
    if (!confirm(`Er du sikker på at du vil deaktivere ${userName}? Brukeren vil ikke kunne logge inn, og tekst/reviews vil bli skjult.`)) {
      return;
    }

    setKicking(userId);
    try {
      const res = await fetch(`/api/users/${userId}/deactivate`, { method: "PATCH" });
      if (res.ok) {
        loadGroup();
      } else {
        const data = await res.json();
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setKicking(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Laster...</div>;
  if (!group) return <div className="p-8 text-gray-500">Gruppe ikke funnet</div>;

  return (
    <div className="p-8">
      <Link href="/admin/groups" className="text-sm text-blue-600 hover:text-blue-700 mb-4 block">
        &larr; Tilbake til grupper
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{group.members.length} medlemmer</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center">
          <p className="text-xs text-blue-600 font-medium mb-1">Gruppekode</p>
          <p className="text-2xl font-mono font-bold text-blue-700 tracking-wider">
            {group.joinCode}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Navn</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Kandidatnr.</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Registrert</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {group.members.map((m) => (
              <tr key={m.user.id} className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">{m.user.name}</td>
                <td className="px-6 py-4 font-mono text-sm text-gray-600">{m.user.kandidatnummer}</td>
                <td className="px-6 py-4">
                  {m.user.isActive ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Aktiv</span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Deaktivert</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(m.user.joinedAt).toLocaleDateString("no-NO")}
                </td>
                <td className="px-6 py-4 text-right">
                  {m.user.isActive && (
                    <button
                      onClick={() => handleKick(m.user.id, m.user.name)}
                      disabled={kicking === m.user.id}
                      className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      {kicking === m.user.id ? "Deaktiverer..." : "Deaktiver"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
