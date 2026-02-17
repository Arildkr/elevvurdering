"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [kandidatnummer, setKandidatnummer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kandidatnummer }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Innlogging feilet");
        return;
      }

      if (data.isAdmin) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Logg inn</h1>
          <p className="text-gray-500 mb-6">
            Skriv inn kandidatnummeret ditt for å logge inn.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="kandidatnummer"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Kandidatnummer
              </label>
              <input
                id="kandidatnummer"
                type="text"
                value={kandidatnummer}
                onChange={(e) => setKandidatnummer(e.target.value.toUpperCase())}
                placeholder="F.eks. A3K9M2"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400 uppercase tracking-widest text-center text-lg font-mono"
                maxLength={20}
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !kandidatnummer}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Logger inn..." : "Logg inn"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Første gang?{" "}
              <Link
                href="/register"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Registrer deg her
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
