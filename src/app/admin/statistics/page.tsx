"use client";

import { useEffect, useState } from "react";

interface Group {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  title: string;
  group: { id: string; name: string };
}

interface StudentStat {
  name: string;
  kandidatnummer: string;
  isActive: boolean;
  textsSubmitted: number;
  reviewsGiven: number;
  reviewsReceived: number;
}

export default function AdminStatisticsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<StudentStat[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [gRes, aRes] = await Promise.all([
          fetch("/api/groups"),
          fetch("/api/assignments"),
        ]);
        if (gRes.ok) setGroups(await gRes.json());
        if (aRes.ok) setAssignments(await aRes.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedAssignment) {
      setStats([]);
      return;
    }
    loadStats();
  }, [selectedAssignment]);

  async function loadStats() {
    setLoadingStats(true);
    try {
      // Get members, texts, and reviews for the selected assignment
      const assignment = assignments.find((a) => a.id === selectedAssignment);
      if (!assignment) return;

      const [membersRes, textsRes, reviewsRes] = await Promise.all([
        fetch(`/api/groups/${assignment.group.id}/members`),
        fetch(`/api/assignments/${selectedAssignment}/texts`),
        fetch(`/api/assignments/${selectedAssignment}/reviews`),
      ]);

      if (!membersRes.ok || !textsRes.ok || !reviewsRes.ok) return;

      const members = await membersRes.json();
      const texts = await textsRes.json();
      const reviews = await reviewsRes.json();

      // Build stats per student
      const studentStats: StudentStat[] = members.map((m: { id: string; name: string; kandidatnummer: string; isActive: boolean }) => {
        const textsSubmitted = texts.filter((t: { authorId: string }) => t.authorId === m.id).length;
        const reviewsGiven = reviews.filter((r: { reviewerId: string; rejectedAt: string | null }) => r.reviewerId === m.id && !r.rejectedAt).length;

        // Find this student's text, then count reviews on it
        const studentText = texts.find((t: { authorId: string }) => t.authorId === m.id);
        const reviewsReceived = studentText
          ? reviews.filter((r: { textId: string; rejectedAt: string | null }) => r.textId === studentText.id && !r.rejectedAt).length
          : 0;

        return {
          name: m.name,
          kandidatnummer: m.kandidatnummer,
          isActive: m.isActive,
          textsSubmitted,
          reviewsGiven,
          reviewsReceived,
        };
      });

      setStats(studentStats);
    } finally {
      setLoadingStats(false);
    }
  }

  const filteredAssignments = selectedGroup
    ? assignments.filter((a) => a.group.id === selectedGroup)
    : assignments;

  if (loading) return <div className="p-8 text-gray-500">Laster...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Statistikk</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gruppe</label>
          <select
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              setSelectedAssignment("");
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
          >
            <option value="">Alle grupper</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Oppgave</label>
          <select
            value={selectedAssignment}
            onChange={(e) => setSelectedAssignment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
          >
            <option value="">Velg oppgave...</option>
            {filteredAssignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.group.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats table */}
      {!selectedAssignment ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Velg en oppgave for å se statistikk.</p>
        </div>
      ) : loadingStats ? (
        <div className="p-8 text-gray-500">Laster statistikk...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Navn</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Kandidatnr.</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Tekst levert</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Vurderinger gitt</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Vurderinger mottatt</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.kandidatnummer} className="border-b border-gray-100">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-600">{s.kandidatnummer}</td>
                  <td className="px-6 py-4">
                    {s.isActive ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Aktiv</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Deaktivert</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {s.textsSubmitted > 0 ? (
                      <span className="text-green-600">Ja</span>
                    ) : (
                      <span className="text-red-600">Nei</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-medium">{s.reviewsGiven}</td>
                  <td className="px-6 py-4 text-center font-medium">{s.reviewsReceived}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
