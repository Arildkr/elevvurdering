"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface AssignmentDetail {
  id: string;
  title: string;
  description?: string;
  writeDeadline: string;
  reviewDeadline: string;
  minReviews: number;
  distributionDone: boolean;
  feedbackOpen: boolean;
  feedbackDeadline: string | null;
  group: { id: string; name: string };
  phase: "writing" | "review" | "closed";
  stats: {
    memberCount: number;
    textCount: number;
    reviewAssignmentCount: number;
    reviewCount: number;
  };
}

interface TextData {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string; kandidatnummer: string };
  _count: { reviews: number };
}

interface ReviewData {
  id: string;
  content: string;
  createdAt: string;
  rejectedAt: string | null;
  reviewer: { name: string; kandidatnummer: string };
  text: { author: { name: string; kandidatnummer: string } };
}

const phaseLabels = { writing: "Skrivefase", review: "Vurderingsfase", closed: "Lukket" };
const phaseColors = {
  writing: "bg-green-100 text-green-800",
  review: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-600",
};

export default function AdminAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [texts, setTexts] = useState<TextData[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [togglingFeedback, setTogglingFeedback] = useState(false);
  const [tab, setTab] = useState<"overview" | "texts" | "reviews">("overview");

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const aRes = await fetch(`/api/assignments/${id}`);
      if (aRes.ok) setAssignment(await aRes.json());

      // Load texts for admin view
      const tRes = await fetch(`/api/assignments/${id}/texts`);
      if (tRes.ok) setTexts(await tRes.json());

      // Load reviews for admin view
      const rRes = await fetch(`/api/assignments/${id}/reviews`);
      if (rRes.ok) setReviews(await rRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleDistribute() {
    if (!confirm("Er du sikker? Dette tildeler hver elev en tekst å vurdere.")) return;

    setDistributing(true);
    try {
      const res = await fetch(`/api/assignments/${id}/distribute`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        loadData();
      } else {
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setDistributing(false);
    }
  }

  async function handleToggleFeedback() {
    setTogglingFeedback(true);
    try {
      const res = await fetch(`/api/assignments/${id}/toggle-feedback`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        loadData();
      } else {
        alert(data.error || "Noe gikk galt");
      }
    } finally {
      setTogglingFeedback(false);
    }
  }

  async function handleReject(reviewId: string) {
    if (!confirm("Underkjenne denne tilbakemeldingen? Eleven må skrive en ny.")) return;

    const res = await fetch(`/api/reviews/${reviewId}/reject`, { method: "PATCH" });
    if (res.ok) {
      loadData();
    } else {
      const data = await res.json();
      alert(data.error || "Noe gikk galt");
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Laster...</div>;
  if (!assignment) return <div className="p-8 text-gray-500">Oppgave ikke funnet</div>;

  return (
    <div className="p-8">
      <Link href="/admin/assignments" className="text-sm text-blue-600 hover:text-blue-700 mb-4 block">
        &larr; Tilbake til oppgaver
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{assignment.group.name}</p>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${phaseColors[assignment.phase]}`}>
          {phaseLabels[assignment.phase]}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold">{assignment.stats.memberCount}</p>
          <p className="text-xs text-gray-500">Medlemmer</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold">{assignment.stats.textCount}</p>
          <p className="text-xs text-gray-500">Tekster levert</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold">{assignment.stats.reviewAssignmentCount}</p>
          <p className="text-xs text-gray-500">Tildelinger</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold">{assignment.stats.reviewCount}</p>
          <p className="text-xs text-gray-500">Vurderinger</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleDistribute}
          disabled={distributing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {distributing ? "Tildeler..." : assignment.distributionDone ? "Tildel på nytt" : "Tildel tekster"}
        </button>
        <button
          onClick={handleToggleFeedback}
          disabled={togglingFeedback}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            assignment.feedbackOpen
              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {togglingFeedback
            ? "..."
            : assignment.feedbackOpen
            ? "Lukk tilbakemeldinger"
            : "Åpne tilbakemeldinger"}
        </button>
        <a
          href={`/api/assignments/${id}/export`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Eksporter CSV
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {(["overview", "texts", "reviews"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {{ overview: "Oversikt", texts: "Tekster", reviews: "Vurderinger" }[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {assignment.description && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-1">Beskrivelse</h3>
              <p className="text-gray-600">{assignment.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Skrivefrist: </span>
              <span className="text-gray-600">{new Date(assignment.writeDeadline).toLocaleString("no-NO")}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Vurderingsfrist: </span>
              <span className="text-gray-600">{new Date(assignment.reviewDeadline).toLocaleString("no-NO")}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Min. vurderinger: </span>
              <span className="text-gray-600">{assignment.minReviews}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Tildeling gjort: </span>
              <span className="text-gray-600">{assignment.distributionDone ? "Ja" : "Nei"}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Tilbakemeldinger: </span>
              <span className={assignment.feedbackOpen ? "text-green-600 font-medium" : "text-gray-600"}>
                {assignment.feedbackOpen ? "Åpne" : "Lukket"}
              </span>
            </div>
            {assignment.feedbackDeadline && (
              <div>
                <span className="font-medium text-gray-700">Feedback-frist: </span>
                <span className="text-gray-600">{new Date(assignment.feedbackDeadline).toLocaleString("no-NO")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "texts" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {texts.length === 0 ? (
            <p className="p-6 text-gray-500">Ingen tekster levert ennå.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Forfatter</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Kandidatnr.</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Utdrag</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Vurderinger</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Dato</th>
                </tr>
              </thead>
              <tbody>
                {texts.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100">
                    <td className="px-6 py-4 font-medium text-gray-900">{t.author.name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-600">{t.author.kandidatnummer}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">{t.content.substring(0, 80)}...</td>
                    <td className="px-6 py-4 text-gray-600">{t._count.reviews}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString("no-NO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "reviews" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {reviews.length === 0 ? (
            <p className="p-6 text-gray-500">Ingen vurderinger ennå.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Reviewer</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Forfatter</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Utdrag</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{r.reviewer.name}</div>
                      <div className="font-mono text-xs text-gray-500">{r.reviewer.kandidatnummer}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{r.text.author.name}</div>
                      <div className="font-mono text-xs text-gray-500">{r.text.author.kandidatnummer}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">{r.content.substring(0, 60)}...</td>
                    <td className="px-6 py-4">
                      {r.rejectedAt ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Underkjent</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Godkjent</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!r.rejectedAt && (
                        <button
                          onClick={() => handleReject(r.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Underkjenn
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
