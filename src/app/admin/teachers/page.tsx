"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/teachers");
        if (res.ok) setTeachers(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Laster...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lærere</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
        <p className="text-sm font-medium text-blue-900 mb-1">Slik inviterer du en medlærer</p>
        <p className="text-sm text-blue-700">
          Gå til en gruppe og bruk «Inviter medlærer». Læreren får en e-post med en lenke og oppretter kontoen sin selv.
        </p>
        <Link
          href="/admin/groups"
          className="inline-block mt-3 text-sm font-medium text-blue-700 hover:text-blue-900 underline underline-offset-2"
        >
          Gå til grupper →
        </Link>
      </div>

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
