"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  _count: { members: number; assignments: number };
}

export default function AdminDashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/groups");
        if (res.ok) setGroups(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalStudents = groups.reduce((sum, g) => sum + g._count.members, 0);
  const totalAssignments = groups.reduce((sum, g) => sum + g._count.assignments, 0);

  if (loading) {
    return <div className="p-8 text-gray-500">Laster...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-gray-900">{groups.length}</p>
          <p className="text-sm text-gray-500">Grupper</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
          <p className="text-sm text-gray-500">Elever</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-3xl font-bold text-gray-900">{totalAssignments}</p>
          <p className="text-sm text-gray-500">Oppgaver</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/admin/groups"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Administrer grupper
        </Link>
        <Link
          href="/admin/assignments"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Administrer oppgaver
        </Link>
      </div>
    </div>
  );
}
