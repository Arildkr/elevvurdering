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
}

interface User {
  id: string;
  name: string;
  kandidatnummer: string;
  isAdmin: boolean;
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
            <p className="text-sm text-gray-500">Velkommen, {user?.name}</p>
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

                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Skrivefrist: {new Date(a.writeDeadline).toLocaleDateString("no-NO")}</span>
                  <span>Vurderingsfrist: {new Date(a.reviewDeadline).toLocaleDateString("no-NO")}</span>
                </div>

                <div className="mt-3 flex gap-3 text-sm">
                  {a.hasSubmitted ? (
                    <span className="text-green-600">Tekst levert</span>
                  ) : a.phase === "writing" ? (
                    <span className="text-amber-600">Tekst ikke levert</span>
                  ) : null}
                  {a.pendingReviews > 0 && (
                    <span className="text-blue-600">{a.pendingReviews} vurdering(er) gjenstår</span>
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
