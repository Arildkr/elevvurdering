"use client";

import { useEffect, useState } from "react";

export function StudentHelpTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Show tour only first time user logs in
    const tourSeen = localStorage.getItem("tour_seen");
    if (!tourSeen) {
      setShowTour(true);
      localStorage.setItem("tour_seen", "true");
    }
  }, []);

  if (!showTour) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Velkommen til Elevvurdering! 👋</h2>

        <div className="space-y-4 mb-6 text-gray-700">
          <div>
            <p className="font-semibold text-blue-600">📝 Lever tekst</p>
            <p className="text-sm">Gå til oppgaven og skriv din tekst. Den lagres automatisk hvert 30. sekund.</p>
          </div>

          <div>
            <p className="font-semibold text-green-600">👀 Gi tilbakemelding</p>
            <p className="text-sm">Når oppgaven er i vurderingsfase, får du tekster å kommentere. Dine tilbakemeldinger er anonyme til slut.</p>
          </div>

          <div>
            <p className="font-semibold text-purple-600">💬 Les tilbakemeldinger</p>
            <p className="text-sm">Når oppgaven er lukket, kan du lese hva medelever skrev om din tekst.</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-blue-700 mb-1">💡 Tips</p>
            <ul className="text-blue-600 space-y-1">
              <li>• Kandidatnummeret ditt er ditt ID i appen</li>
              <li>• Du kan aldri se hvem som reviewet deg før oppgaven er ferdig</li>
              <li>• Dine kommentarer hjelper andre til å forbedre seg</li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => setShowTour(false)}
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Skjønner! La meg starte
        </button>
      </div>
    </div>
  );
}

export function TeacherHelpTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const tourSeen = localStorage.getItem("teacher_tour_seen");
    if (!tourSeen && localStorage.getItem("teacher_mode")) {
      setShowTour(true);
      localStorage.setItem("teacher_tour_seen", "true");
    }
  }, []);

  if (!showTour) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Lærerommet ditt 🎓</h2>

        <div className="space-y-4 mb-6 text-gray-700">
          <div>
            <p className="font-semibold text-blue-600">📋 Oppgaver</p>
            <p className="text-sm">Opprett oppgaver med frist for skriving og vurdering. Kontroller fremdriften i sanntid.</p>
          </div>

          <div>
            <p className="font-semibold text-green-600">🎲 Fordel vurderinger</p>
            <p className="text-sm">Klikk "Fordel vurderinger" når alle har levert. Systemet randomiserer anonymt.</p>
          </div>

          <div>
            <p className="font-semibold text-purple-600">📊 Statistikk</p>
            <p className="text-sm">Se oversikt over innleveringer, vurderinger og tilbakemeldinger. Eksporter som CSV eller Google Sheets.</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-green-700 mb-1">💡 Tips</p>
            <ul className="text-green-600 space-y-1">
              <li>• Bruk gruppekoder for å invitere elever</li>
              <li>• Pause oppgaven hvis du trenger ekstra tid</li>
              <li>• Eksporter resultatene for dokumentasjon</li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => setShowTour(false)}
          className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Klar til å starte
        </button>
      </div>
    </div>
  );
}
