"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GroupMembership {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string | null;
  kandidatnummer: string;
  isActive: boolean;
  createdAt: string;
  isSelf: boolean;
  groupMemberships: GroupMembership[];
}

interface OwnedGroup {
  id: string;
  name: string;
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [ownedGroups, setOwnedGroups] = useState<OwnedGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteGroupId, setInviteGroupId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Remove state
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers);
        setOwnedGroups(data.ownedGroups);
        if (data.ownedGroups.length > 0 && !inviteGroupId) {
          setInviteGroupId(data.ownedGroups[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteGroupId) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/groups/${inviteGroupId}/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteMsg({ type: "error", text: data.error || "Noe gikk galt" });
      } else {
        setInviteMsg({ type: "ok", text: `Invitasjon sendt til ${inviteEmail}` });
        setInviteEmail("");
        setShowInvite(false);
        load();
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(groupId: string, userId: string, teacherName: string, groupName: string) {
    if (!confirm(`Fjerne ${teacherName} som medlærer fra ${groupName}?`)) return;
    const key = `${groupId}:${userId}`;
    setRemoving(key);
    try {
      await fetch(`/api/groups/${groupId}/teachers/${userId}`, { method: "DELETE" });
      load();
    } finally {
      setRemoving(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Laster...</div>;

  return (
    <div className="p-8">
      <div id="tour-teachers-header" className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lærere</h1>
        {ownedGroups.length > 0 && (
          <button
            id="tour-invite-teacher"
            onClick={() => { setShowInvite(!showInvite); setInviteMsg(null); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {showInvite ? "Avbryt" : "Inviter medlærer"}
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Inviter medlærer</h2>
          <p className="text-sm text-gray-500 mb-4">
            Læreren mottar en e-post med en lenke og oppretter kontoen sin selv. De kobles automatisk til gruppen.
          </p>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gruppe</label>
              <select
                value={inviteGroupId}
                onChange={(e) => setInviteGroupId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                {ownedGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-postadresse</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteMsg(null); }}
                placeholder="kollega@skole.no"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {inviteMsg && (
              <p className={`text-sm ${inviteMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                {inviteMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={inviting}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {inviting ? "Sender..." : "Send invitasjon"}
            </button>
          </form>
        </div>
      )}

      {ownedGroups.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <p className="text-sm font-medium text-blue-900 mb-1">Slik inviterer du en medlærer</p>
          <p className="text-sm text-blue-700">
            Du må eie minst én gruppe for å invitere medlærere. Gå til grupper for å opprette en.
          </p>
          <Link
            href="/admin/groups"
            className="inline-block mt-3 text-sm font-medium text-blue-700 hover:text-blue-900 underline underline-offset-2"
          >
            Gå til grupper →
          </Link>
        </div>
      )}

      {/* Teacher list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Navn</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">E-post</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Medlærer i</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Opprettet</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {t.name}
                  {t.isSelf && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Deg</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{t.email ?? "—"}</td>
                <td className="px-6 py-4">
                  {t.groupMemberships.length === 0 ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {t.groupMemberships.map((g) => (
                        <span key={g.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          {g.name}
                          {!t.isSelf && (
                            <button
                              onClick={() => handleRemove(g.id, t.id, t.name, g.name)}
                              disabled={removing === `${g.id}:${t.id}`}
                              className="text-gray-400 hover:text-red-600 transition-colors ml-0.5 disabled:opacity-50"
                              title={`Fjern fra ${g.name}`}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
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
