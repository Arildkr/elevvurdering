"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "choose" | "candidate" | "student-register" | "teacher";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [kandidatnummer, setKandidatnummer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLoginWithCandidate(e: React.FormEvent<HTMLFormElement>) {
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

  if (step === "candidate") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <button
              onClick={() => { setStep("choose"); setError(""); }}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Tilbake
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Logg inn</h1>
            <p className="text-gray-500 mb-6">
              Skriv inn kandidatnummeret ditt.
            </p>

            <form onSubmit={handleLoginWithCandidate} className="space-y-4">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Elevvurdering</h1>
          <p className="text-gray-500 mb-8">
            Velg hvordan du vil logge inn
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/register")}
              className="w-full p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-left group"
            >
              <p className="font-medium text-gray-900 group-hover:text-blue-700">
                Jeg er ny elev
              </p>
              <p className="text-sm text-gray-500 group-hover:text-blue-600 mt-1">
                Registrer med navn og gruppekode
              </p>
            </button>

            <button
              onClick={() => { setStep("candidate"); setKandidatnummer(""); setError(""); }}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
            >
              <p className="font-medium text-gray-900 group-hover:text-blue-700">
                Jeg har et kandidatnummer
              </p>
              <p className="text-sm text-gray-500 group-hover:text-gray-700 mt-1">
                Logg inn med kandidatnummeret ditt
              </p>
            </button>

            <button
              onClick={() => router.push("/teacher-register")}
              className="w-full p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors text-left group"
            >
              <p className="font-medium text-gray-900 group-hover:text-green-700">
                Jeg er lærer
              </p>
              <p className="text-sm text-gray-500 group-hover:text-green-700 mt-1">
                Registrer eller logg inn med e-post
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
