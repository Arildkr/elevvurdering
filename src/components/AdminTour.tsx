"use client";

import "driver.js/dist/driver.css";
import type { DriveStep, PopoverDOM } from "driver.js";
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { usePathname } from "next/navigation";

const chevronRight = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0"><path d="M6 4l4 4-4 4"/></svg>`;
const chevronLeft = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0"><path d="M10 12L6 8l4-4"/></svg>`;

function styleButtons(popover: PopoverDOM) {
  const nextText = popover.nextButton.textContent?.trim() ?? "";
  if (nextText === "Neste") {
    popover.nextButton.innerHTML = `<span style="display:flex;align-items:center;gap:5px">${nextText}${chevronRight}</span>`;
  } else if (nextText === "Neste side") {
    popover.nextButton.innerHTML = `<span style="display:flex;align-items:center;gap:5px">${nextText}${chevronRight}</span>`;
  }
  const prevVisible = (popover.previousButton as HTMLElement).style.display !== "none";
  if (prevVisible) {
    popover.previousButton.innerHTML = `<span style="display:flex;align-items:center;gap:5px">${chevronLeft}Forrige</span>`;
  }
}

export interface AdminTourHandle {
  startTour: () => void;
}

type PageKey = "groups" | "assignments" | "teachers";

const RESUME_KEY = "admin_tour_resume";

function navigateTo(page: PageKey) {
  sessionStorage.setItem(RESUME_KEY, page);
  window.location.href = `/admin/${page}`;
}

const GROUPS_STEPS: DriveStep[] = [
  {
    element: "#tour-groups-header",
    popover: {
      title: "Dine klasser",
      description:
        "Her ser du alle klassene dine med antall elever og oppgaver. Klikk «Detaljer» på en gruppe for å se elevlisten, deltakerkoden og tilganger. Deltakerkoden vises der — elevene skriver den inn på registreringssiden én gang.",
      side: "bottom",
    },
  },
  {
    element: "#tour-create-group",
    popover: {
      title: "Opprett gruppe",
      description:
        "Gi gruppen et navn (f.eks. «10A Norsk»), klikk «Opprett» og du får en 6-tegns deltakerkode. Del koden med klassen — via Classroom, Feide eller på tavla. Elevene trenger ingen app, bare en nettleser og koden.",
      side: "left",
    },
  },
];

const ASSIGNMENTS_STEPS: DriveStep[] = [
  {
    element: "#tour-assignments-header",
    popover: {
      title: "Skriveoppgaver — fire faser",
      description:
        "<b>📝 Skriving</b> — Elevene leverer teksten sin med valgfrie hjelpemidler (stavekontroll, lesehjelp, AI-analyse).<br><br>" +
        "<b>💬 Respons</b> — Elevene vurderer hverandres tekster anonymt etter et responsskjema du definerer.<br><br>" +
        "<b>⭐ Tilbakemelding</b> — Du gir lærertilbakemelding direkte i systemet.<br><br>" +
        "Klikk på en oppgave i listen for å styre fasene og se innleverte tekster.",
      side: "bottom",
    },
  },
  {
    element: "#tour-create-assignment",
    popover: {
      title: "To typer oppgaver",
      description:
        "<b>Ordinær oppgave:</b> Elevene skriver → vurderer hverandres tekster anonymt → får lærertilbakemelding. Du styrer frister og faser selv.<br><br>" +
        "<b>Øvingsoppgave:</b> Ingen elevrespons — kun lærertilbakemelding. Du velger mellom oppgavetekster fra tidligere norskeksamen. Passer til eksamensforberedelse.",
      side: "left",
    },
  },
];

const TEACHERS_STEPS: DriveStep[] = [
  {
    element: "#tour-teachers-header",
    popover: {
      title: "Medlærere",
      description:
        "Her ser du alle som har lærertilgang i systemet. Medlærere kan lese alle elevtekstene i gruppen og gi lærertilbakemelding — men kan ikke endre oppgaveinnstillinger eller administrere gruppen.",
      side: "bottom",
    },
  },
  {
    element: "#tour-invite-teacher",
    popover: {
      title: "Inviter kollega",
      description:
        "Skriv inn e-postadressen og velg gruppe. Kollegaen mottar en e-post med en personlig lenke, oppretter kontoen sin og kobles automatisk til gruppen — du trenger ikke gjøre noe mer.<br><br>✅ <b>Du er nå klar til å ta Elevvurdering i bruk!</b>",
      side: "left",
    },
  },
];

const INITIAL_STEPS: DriveStep[] = [
  {
    popover: {
      title: "Velkommen til Elevvurdering",
      description:
        "Elevvurdering er laget for norsklærere som vil organisere skriveoppgaver med elevrespons og lærertilbakemelding. Denne gjennomgangen tar deg gjennom de viktigste funksjonene.",
    },
  },
  {
    element: "#tour-nav",
    popover: {
      title: "Navigasjon",
      description:
        "Alt du trenger finner du i sidemenyen. Vi skal gå gjennom <b>Grupper</b>, <b>Oppgaver</b> og <b>Lærere</b> — de tre hovedelementene.",
      side: "right",
    },
  },
  {
    element: "#tour-nav-groups",
    popover: {
      title: "Steg 1 – Grupper",
      description:
        "Grupper er klassene dine i systemet — opprett én gruppe per klasse. Elevene melder seg inn med en unik deltakerkode du deler med dem. Ingen app eller installasjon trengs. Klikk «Neste» for å gå til gruppesiden.",
      side: "right",
    },
  },
];

async function launchPageTour(
  steps: DriveStep[],
  progressText: string,
  nextPage?: PageKey
) {
  const { driver } = await import("driver.js");
  const lastIndex = steps.length - 1;

  const d = driver({
    showProgress: true,
    progressText,
    allowClose: true,
    animate: true,
    overlayColor: "rgb(0,0,0)",
    overlayOpacity: 0.5,
    nextBtnText: "Neste",
    prevBtnText: "Forrige",
    doneBtnText: nextPage ? "Neste side" : "Ferdig",
    steps,
    onPopoverRender: styleButtons,
    onNextClick: nextPage
      ? (_el, _step, opts) => {
          if (opts.driver.getActiveIndex() === lastIndex) {
            opts.driver.destroy();
            navigateTo(nextPage);
          } else {
            opts.driver.moveNext();
          }
        }
      : undefined,
    onDestroyStarted: () => {
      d.destroy();
    },
  });

  d.drive();
}

async function startFullTour() {
  const { driver } = await import("driver.js");

  const d = driver({
    allowClose: true,
    animate: true,
    overlayColor: "rgb(0,0,0)",
    overlayOpacity: 0.5,
    nextBtnText: "Neste",
    prevBtnText: "Forrige",
    doneBtnText: "Neste side",
    steps: INITIAL_STEPS,
    onPopoverRender: styleButtons,
    onNextClick: (_el, _step, opts) => {
      if (opts.driver.getActiveIndex() === INITIAL_STEPS.length - 1) {
        opts.driver.destroy();
        navigateTo("groups");
      } else {
        opts.driver.moveNext();
      }
    },
    onDestroyStarted: () => {
      d.destroy();
    },
  });

  d.drive();
}

const AdminTour = forwardRef<AdminTourHandle>((_, ref) => {
  const pathname = usePathname();
  const didAutoStart = useRef(false);

  useImperativeHandle(ref, () => ({
    startTour: () => startFullTour(),
  }));

  useEffect(() => {
    if (didAutoStart.current) return;
    const resume = sessionStorage.getItem(RESUME_KEY);
    if (!resume) return;
    sessionStorage.removeItem(RESUME_KEY);
    didAutoStart.current = true;

    if (resume === "groups" && pathname === "/admin/groups") {
      setTimeout(() => launchPageTour(GROUPS_STEPS, "Del {{current}} av {{total}}", "assignments"), 400);
    } else if (resume === "assignments" && pathname === "/admin/assignments") {
      setTimeout(() => launchPageTour(ASSIGNMENTS_STEPS, "Del {{current}} av {{total}}", "teachers"), 400);
    } else if (resume === "teachers" && pathname === "/admin/teachers") {
      setTimeout(() => launchPageTour(TEACHERS_STEPS, "Del {{current}} av {{total}}"), 400);
    }
  }, [pathname]);

  return null;
});

AdminTour.displayName = "AdminTour";
export default AdminTour;
