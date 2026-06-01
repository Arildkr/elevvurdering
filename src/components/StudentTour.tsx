"use client";

import "driver.js/dist/driver.css";
import type { DriveStep, PopoverDOM } from "driver.js";
import { useEffect, useRef } from "react";

const WRITE_TOUR_KEY = "student_write_tour_seen";
const REVIEW_TOUR_KEY = "student_review_tour_seen";

const chevronRight = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0"><path d="M6 4l4 4-4 4"/></svg>`;
const chevronLeft = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0"><path d="M10 12L6 8l4-4"/></svg>`;

function styleButtons(popover: PopoverDOM) {
  const nextText = popover.nextButton.textContent?.trim() ?? "";
  if (nextText === "Neste") {
    popover.nextButton.innerHTML = `<span style="display:flex;align-items:center;gap:5px">${nextText}${chevronRight}</span>`;
  }
  const prevVisible = (popover.previousButton as HTMLElement).style.display !== "none";
  if (prevVisible) {
    popover.previousButton.innerHTML = `<span style="display:flex;align-items:center;gap:5px">${chevronLeft}Forrige</span>`;
  }
}

async function launchTour(steps: DriveStep[]) {
  const { driver } = await import("driver.js");
  const d = driver({
    showProgress: true,
    progressText: "{{current}} av {{total}}",
    allowClose: true,
    animate: true,
    overlayColor: "rgb(0,0,0)",
    overlayOpacity: 0.45,
    nextBtnText: "Neste",
    prevBtnText: "Forrige",
    doneBtnText: "Ferdig",
    steps,
    onPopoverRender: styleButtons,
    onDestroyStarted: () => d.destroy(),
  });
  d.drive();
}

const WRITE_STEPS: DriveStep[] = [
  {
    popover: {
      title: "Skrivesiden",
      description:
        "Denne siden er der du skriver og leverer teksten din. Vi tar en rask gjennomgang av de viktigste elementene.",
    },
  },
  {
    element: "#tour-task-text",
    popover: {
      title: "Oppgaven",
      description:
        "Her ser du oppgaveteksten du skal svare på. Les den nøye før du begynner å skrive.",
      side: "bottom",
    },
  },
  {
    element: "#tour-timer",
    popover: {
      title: "Tidtaker",
      description:
        "Nedtellingen viser hvor mye tid du har igjen. Når den blir rød, er det på tide å levere.",
      side: "bottom",
    },
  },
  {
    element: "#tour-editor-card",
    popover: {
      title: "Tekstfeltet",
      description:
        "Skriv teksten din her. Verktøylinjen øverst gir deg enkel formatering som fet skrift og kulelister. Husk at teksten må være på minst 50 tegn for å kunne leveres.",
      side: "top",
    },
  },
  {
    element: "#tour-writing-tools",
    popover: {
      title: "Hjelpemidler",
      description:
        "<b>Stavekontroll</b> understreker ord som er stavefeil og viser forslag i et panel. Den slår seg på automatisk.<br><br>" +
        "<b>Lesehjelp</b> uthever lange ord og viser orddeling — nyttig om du synes teksten flyter dårlig.",
      side: "bottom",
    },
  },
  {
    element: "#tour-autosave",
    popover: {
      title: "Automatisk lagring",
      description:
        "Teksten din lagres automatisk hvert 30. sekund. Du ser statusen her — «Lagret» betyr at alt er trygt. Teksten lagres også lokalt i nettleseren din som sikkerhetskopi.",
      side: "top",
    },
  },
  {
    element: "#tour-submit-btn",
    popover: {
      title: "Lever teksten",
      description:
        "Når du er ferdig, klikker du her for å levere. Du kan redigere teksten og levere på nytt så lenge oppgaven er åpen. Lykke til!",
      side: "top",
    },
  },
];

const REVIEW_STEPS: DriveStep[] = [
  {
    popover: {
      title: "Responssiden",
      description:
        "Her gir du tilbakemelding på en medelevs tekst. Tilbakemeldingene er anonyme — du vet ikke hvem du vurderer, og forfatteren vet ikke hvem som gir tilbakemelding.",
    },
  },
  {
    element: "#tour-text-to-review",
    popover: {
      title: "Teksten du skal vurdere",
      description:
        "Les teksten grundig før du begynner å skrive tilbakemelding. Du kan rulle nedover for å se hele teksten.",
      side: "bottom",
    },
  },
  {
    element: "#tour-feedback-guide",
    popover: {
      title: "To stjerner og et ønske",
      description:
        "Bruk denne metoden når du skriver tilbakemelding:<br><br>" +
        "⭐ <b>Stjerne 1</b> — noe som fungerer bra<br>" +
        "⭐ <b>Stjerne 2</b> — noe annet som er bra<br>" +
        "✨ <b>Ønske</b> — ett konkret forslag til forbedring<br><br>" +
        "Klikk på «Setningsstartere og tips» for å se eksempler.",
      side: "bottom",
    },
  },
  {
    element: "#tour-review-editor",
    popover: {
      title: "Skriv tilbakemeldingen din",
      description:
        "Teksten din må være på minst 50 tegn. Vær konkret og konstruktiv — en god tilbakemelding er til stor hjelp for forfatteren.",
      side: "top",
    },
  },
  {
    element: "#tour-review-submit",
    popover: {
      title: "Send tilbakemeldingen",
      description:
        "Klikk her for å sende. Hvis du har flere tekster å vurdere, kommer du rett til neste. Bra jobbet!",
      side: "top",
    },
  },
];

export function WritingTourTrigger() {
  const didAutoStart = useRef(false);

  useEffect(() => {
    if (didAutoStart.current) return;
    didAutoStart.current = true;
    const seen = localStorage.getItem(WRITE_TOUR_KEY);
    if (!seen) {
      localStorage.setItem(WRITE_TOUR_KEY, "true");
      setTimeout(() => launchTour(getVisibleWriteSteps()), 600);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => launchTour(getVisibleWriteSteps())}
      title="Vis hjelp"
      className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-sm font-semibold transition-colors"
    >
      ?
    </button>
  );
}

function getVisibleWriteSteps(): DriveStep[] {
  return WRITE_STEPS.filter((step) => {
    const el = step.element as string | undefined;
    if (!el) return true;
    return document.querySelector(el) !== null;
  });
}

export function ReviewTourTrigger() {
  const didAutoStart = useRef(false);

  useEffect(() => {
    if (didAutoStart.current) return;
    didAutoStart.current = true;
    const seen = localStorage.getItem(REVIEW_TOUR_KEY);
    if (!seen) {
      localStorage.setItem(REVIEW_TOUR_KEY, "true");
      setTimeout(() => launchTour(REVIEW_STEPS), 600);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => launchTour(REVIEW_STEPS)}
      title="Vis hjelp"
      className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-sm font-semibold transition-colors"
    >
      ?
    </button>
  );
}
