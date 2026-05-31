"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface InviteInfo {
  groupName: string;
  invitedByName: string;
  email: string;
  expiresAt: string;
}

interface Me {
  id: string;
  name: string;
  email: string | null;
  isAdmin: boolean;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function load() {
      const [inviteRes, meRes] = await Promise.all([
        fetch(`/api/group-invite/${token}`),
        fetch("/api/auth/me"),
      ]);

      if (!inviteRes.ok) {
        const data = await inviteRes.json();
        setError(data.error || "Invitasjonen er ugyldig");
      } else {
        setInvite(await inviteRes.json());
      }

      if (meRes.ok) {
        setMe(await meRes.json());
      }

      setLoading(false);
    }
    load();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch(`/api/group-invite/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Noe gikk galt");
        return;
      }
      setAccepted(true);
      setTimeout(() => router.push(`/admin/groups/${data.groupId}`), 1500);
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Laster...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md w-full p-8">
        {error ? (
          <>
            <div className="text-red-600 font-semibold mb-2">Ugyldig invitasjon</div>
            <p className="text-gray-500 text-sm">{error}</p>
            <a href="/login" className="mt-6 inline-block text-blue-600 text-sm hover:underline">
              Gå til innlogging
            </a>
          </>
        ) : accepted ? (
          <>
            <div className="text-green-600 font-semibold text-lg mb-2">Invitasjon godtatt!</div>
            <p className="text-gray-500 text-sm">Du videresendes til gruppen...</p>
          </>
        ) : invite ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Du er invitert som medlærer</h1>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{invite.invitedByName}</strong> inviterer deg til gruppen{" "}
              <strong>{invite.groupName}</strong>.
            </p>

            {me && me.isAdmin ? (
              <>
                {me.email && me.email.toLowerCase() !== invite.email.toLowerCase() ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-4">
                    Invitasjonen er til <strong>{invite.email}</strong>, men du er innlogget som{" "}
                    <strong>{me.email}</strong>. Logg inn med riktig konto.
                  </div>
                ) : (
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {accepting ? "Godtar..." : "Godta invitasjon"}
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                  Logg inn med <strong>{invite.email}</strong> for å godta invitasjonen.
                </div>
                <a
                  href={`/login?returnUrl=/invite/${token}`}
                  className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
                >
                  Logg inn
                </a>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
