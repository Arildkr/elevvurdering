"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Assignment {
  id: string;
  title: string;
  description?: string;
  writeDeadline: string;
  reviewDeadline: string;
  groupName: string;
  phase: "writing" | "review" | "closed";
  hasSubmitted: boolean;
  unreadCount: number;
  pendingReviews: number;
  timerEndAt: string | null;
  timerLabel: string | null;
}

interface User {
  id: string;
  name: string;
  kandidatnummer: string;
  isAdmin: boolean;
}

function useCountdown(endAt: string | null): string | null {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!endAt) { setRemaining(null); return; }
    function tick() {
      const diff = new Date(endAt!).getTime() - Date.now();
      if (diff <= 0) { setRemaining("00:00"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  return remaining;
}

function TimerBadge({ endAt, label }: { endAt: string; label: string | null }) {
  const remaining = useCountdown(endAt);
  if (!remaining) return null;
  const expired = remaining === "00:00";
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
      expired ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
    }`}>
      {remaining}{label ? ` · ${label}` : ""}
    </span>
  );
}

const phaseLabels = { writing: "Skriving", review: "Vurdering", closed: "Lukket" };
const phaseColors = {
  writing: "bg-green-100 text-green-800",
  review: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-600",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, assignRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/assignments"),
        ]);

        if (!meRes.ok) { router.push("/login"); return; }

        const meData = await meRes.json();
        if (meData.isAdmin) { router.push("/admin"); return; }

        setUser(meData);
        if (assignRes.ok) setAssignments(await assignRes.json());
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // Poll for timer updates every 15 seconds
  useEffect(() => {
    const hasActiveTimer = assignments.some((a) => a.timerEndAt && new Date(a.timerEndAt) > new Date());
    if (!hasActiveTimer) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/assignments");
        if (res.ok) setAssignments(await res.json());
      } catch { /* ignore */ }
    }, 15000);
    return () => clearInterval(poll);
  }, [assignments]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Laster...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Elevvurdering</h1>
            <p className="text-sm text-gray-600">Velkommen, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Logg ut
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mine oppgaver</h2>

        {assignments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Ingen oppgaver ennå.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {assignments.map((a) => (
              <Link
                key={a.id}
                href={`/assignment/${a.id}`}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{a.title}</h3>
                    <p className="text-sm text-gray-500">{a.groupName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.timerEndAt && (
                      <TimerBadge endAt={a.timerEndAt} label={a.timerLabel} />
                    )}
                    {a.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                        {a.unreadCount} ulest{a.unreadCount > 1 ? "e" : ""}
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${phaseColors[a.phase]}`}>
                      {phaseLabels[a.phase]}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-gray-600">
                  <span>Skrivefrist: {new Date(a.writeDeadline).toLocaleDateString("no-NO")}</span>
                  <span>Vurderingsfrist: {new Date(a.reviewDeadline).toLocaleDateString("no-NO")}</span>
                </div>

                <div className="mt-3 flex gap-3 text-sm">
                  {a.hasSubmitted ? (
                    <span className="text-green-700 font-medium">Tekst levert</span>
                  ) : a.phase === "writing" ? (
                    <span className="text-amber-700 font-medium">Tekst ikke levert</span>
                  ) : null}
                  {a.pendingReviews > 0 && (
                    <span className="text-blue-700 font-medium">{a.pendingReviews} vurdering(er) gjenstår</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
