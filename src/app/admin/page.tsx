"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ActivityEvent } from "@/app/api/activity/route";

interface Group {
  id: string;
  name: string;
  _count: { members: number; assignments: number };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "akkurat nå";
  if (m < 60) return `${m} min siden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} t siden`;
  const d = Math.floor(h / 24);
  if (d === 1) return "i går";
  if (d < 7) return `${d} dager siden`;
  return new Date(iso).toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

function eventLabel(e: ActivityEvent): { icon: string; text: string; color: string } {
  switch (e.type) {
    case "text_submitted":
      return {
        icon: "📝",
        text: `${e.studentName} leverte tekst til «${e.assignmentTitle}»`,
        color: "text-blue-700",
      };
    case "text_updated":
      return {
        icon: "✏️",
        text: `${e.studentName} oppdaterte tekst i «${e.assignmentTitle}»`,
        color: "text-blue-600",
      };
    case "review_submitted":
      return {
        icon: "💬",
        text: `${e.studentName} leverte vurdering i «${e.assignmentTitle}»`,
        color: "text-green-700",
      };
    case "review_rejected":
      return {
        icon: "⚠️",
        text: `Vurdering fra ${e.studentName} ble underkjent i «${e.assignmentTitle}»`,
        color: "text-amber-700",
      };
    case "member_joined":
      return {
        icon: "👤",
        text: `${e.studentName} ble med i gruppen «${e.groupName}»`,
        color: "text-purple-700",
      };
    default:
      return { icon: "•", text: "", color: "text-gray-500" };
  }
}

export default function AdminDashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [groupRes, activityRes] = await Promise.all([
          fetch("/api/groups"),
          fetch("/api/activity"),
        ]);
        if (groupRes.ok) setGroups(await groupRes.json());
        if (activityRes.ok) setEvents(await activityRes.json());
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
    <div className="p-8 max-w-4xl">
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

      <div className="flex gap-4 mb-8">
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

      {/* Activity stream */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Aktivitet siste 14 dager</h2>
        </div>
        {events.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            Ingen aktivitet ennå. Aktivitet vises her når elever leverer tekster og vurderinger.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {events.map((e) => {
              const { icon, text, color } = eventLabel(e);
              const href =
                e.assignmentId ? `/admin/assignments/${e.assignmentId}` :
                e.groupId ? `/admin/groups` :
                null;
              const inner = (
                <div className="flex items-start gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                  <span className="text-base mt-0.5 shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${color} leading-snug`}>{text}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(e.timestamp)}</span>
                </div>
              );
              return (
                <li key={e.id}>
                  {href ? (
                    <Link href={href} className="block">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
