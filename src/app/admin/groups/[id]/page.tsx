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

interface CoTeacher {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

interface PendingInvite {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

interface Group {
  id: string;
  name: string;
  joinCode: string;
  adminId: string;
  members: { user: Member }[];
}

interface Me {
  id: string;
}

export default function AdminGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [kicking, setKicking] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Co-teacher state
  const [coTeachers, setCoTeachers] = useState<CoTeacher[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [removingTeacher, setRemovingTeacher] = useState<string | null>(null);
  const [endingYear, setEndingYear] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  useEffect(() => {
    loadGroup();
    loadMe();
  }, [id]);

  async function loadGroup() {
    try {
      const res = await fetch(`/api/groups/${id}`);
      if (res.ok) setGroup(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function loadMe() {
    const res = await fetch("/api/auth/me");
    if (res.ok) setMe(await res.json());
  }

  async function loadTeachers() {
    const res = await fetch(`/api/groups/${id}/teachers`);
    if (res.ok) {
      const data = await res.json();
      setCoTeachers(data.coTeachers);
      setPendingInvites(data.pendingInvites);
    }
  }

  const isOwner = group && me && group.adminId === me.id;

  useEffect(() => {
    if (isOwner) loadTeachers();
  }, [isOwner]);

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerateCode() {
    if (!confirm("Er du sikker på at du vil generere en ny kode? Den gamle koden vil slutte å fungere.")) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateCode: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGroup((prev) => prev ? { ...prev, joinCode: updated.joinCode } : prev);
      }
    } finally {
      setRegenerating(false);
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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/groups/${id}/teachers`, {
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
        loadTeachers();
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleEndYear() {
    const activeCount = group?.members.filter((m) => m.user.isActive).length ?? 0;
    if (!confirm(`Dette vil deaktivere alle ${activeCount} aktive elever i gruppen og logge dem ut. Fortsette?`)) return;
    setEndingYear(true);
    try {
      const res = await fetch(`/api/groups/${id}/end-year`, { method: "POST" });
      if (res.ok) {
        loadGroup();
      } else {
        const data = await res.json();
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setEndingYear(false);
    }
  }

  async function handleDeleteGroup() {
    const confirmName = prompt(`Skriv inn gruppenavnet "${group?.name}" for å bekrefte sletting:`);
    if (confirmName !== group?.name) {
      if (confirmName !== null) alert("Gruppenavn stemmer ikke. Sletting avbrutt.");
      return;
    }
    setDeletingGroup(true);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/admin/groups";
      } else {
        const data = await res.json();
        alert(data.error || "Noe gikk galt");
        setDeletingGroup(false);
      }
    } catch {
      setDeletingGroup(false);
    }
  }

  async function handleRemoveTeacher(entityId: string) {
    if (!confirm("Fjerne denne læreren fra gruppen?")) return;
    setRemovingTeacher(entityId);
    try {
      await fetch(`/api/groups/${id}/teachers/${entityId}`, { method: "DELETE" });
      loadTeachers();
    } finally {
      setRemovingTeacher(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Laster...</div>;
  if (!group) return <div className="p-8 text-gray-500">Gruppe ikke funnet</div>;

  return (
    <div className="p-8">
      <Link href="/admin/groups" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4">
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4"/></svg>
        Tilbake til grupper
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{group.members.length} medlemmer</p>
        </div>
        {isOwner && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-blue-600 font-medium mb-2">Gruppekode</p>
            <p className="text-2xl font-mono font-bold text-blue-700 tracking-wider mb-3">
              {group.joinCode}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => copyCode(group.joinCode)}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {copied ? "Kopiert!" : "Kopier"}
              </button>
              <button
                onClick={handleRegenerateCode}
                disabled={regenerating}
                className="text-xs bg-white border border-blue-300 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors font-medium disabled:opacity-50"
              >
                {regenerating ? "Genererer..." : "Ny kode"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Co-teacher management — owner only */}
      {isOwner && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Medlærere</h2>

          {coTeachers.length === 0 && pendingInvites.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">Ingen medlærere ennå.</p>
          ) : (
            <ul className="divide-y divide-gray-100 mb-4">
              {coTeachers.map((ct) => (
                <li key={ct.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{ct.user.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{ct.user.email}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveTeacher(ct.userId)}
                    disabled={removingTeacher === ct.userId}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Fjern
                  </button>
                </li>
              ))}
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="text-sm text-gray-600">{inv.email}</span>
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Venter</span>
                  </div>
                  <button
                    onClick={() => handleRemoveTeacher(inv.id)}
                    disabled={removingTeacher === inv.id}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Avbryt
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleInvite} className="flex gap-2 items-start">
            <div className="flex-1">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteMsg(null); }}
                placeholder="kollega@skole.no"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {inviteMsg && (
                <p className={`mt-1.5 text-xs ${inviteMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                  {inviteMsg.text}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {inviting ? "Sender..." : "Inviter"}
            </button>
          </form>
        </div>
      )}

      {/* Danger zone — owner only */}
      {isOwner && (
        <div className="bg-white rounded-xl border border-red-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Farlig sone</h2>
          <p className="text-sm text-gray-500 mb-4">Disse handlingene kan ikke angres.</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleEndYear}
              disabled={endingYear}
              className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {endingYear ? "Avslutter..." : "Avslutt skoleår"}
            </button>
            <button
              onClick={handleDeleteGroup}
              disabled={deletingGroup}
              className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {deletingGroup ? "Sletter..." : "Slett gruppe"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            «Avslutt skoleår» deaktiverer alle elever og logger dem ut. «Slett gruppe» fjerner gruppen og all tilknyttet data permanent.
          </p>
        </div>
      )}

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
                  {isOwner && m.user.isActive && (
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
