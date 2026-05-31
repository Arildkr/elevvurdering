"use client";

import "driver.js/dist/driver.css";
import type { DriveStep } from "driver.js";
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { usePathname } from "next/navigation";

export interface AdminTourHandle {
  startTour: () => void;
}

type PageKey = "groups" | "assignments" | "teachers";

const RESUME_KEY = "admin_tour_resume";

function navigateTo(page: PageKey) {
  sessionStorage.setItem(RESUME_KEY, page);
  window.location.href = `/admin/${page}`;
}

function buildGroupsSteps() {
  return [
    {
      element: "#tour-groups-header",
      popover: {
        title: "Gruppeadministrasjon",
        description:
          "Her ser du alle klassene dine. Klikk «Detaljer» på en gruppe for å se elevliste, deltakerkode og tilgang for medlærere.",
        side: "bottom" as const,
      },
    },
    {
      element: "#tour-create-group",
      popover: {
        title: "Opprett gruppe",
        description:
          "Klikk her for å opprette en ny klasse. Etter opprettelsen får du en deltakerkode som elevene bruker når de registrerer seg.",
        side: "left" as const,
      },
      onNextClick: () => navigateTo("assignments"),
    },
  ];
}

function buildAssignmentsSteps() {
  return [
    {
      element: "#tour-assignments-header",
      popover: {
        title: "Skriveoppgaver",
        description:
          "Her administrerer du alle skriveoppgavene dine. Klikk på en oppgave for å se innsendte tekster, justere frister og styre fasene.",
        side: "bottom" as const,
      },
    },
    {
      element: "#tour-create-assignment",
      popover: {
        title: "Ny oppgave",
        description:
          "Klikk her for å opprette en ny skriveoppgave. Du kan velge mellom ordinær oppgave (med elevrespons) og øvingsoppgave (kun lærertilbakemelding).",
        side: "left" as const,
      },
      onNextClick: () => navigateTo("teachers"),
    },
  ];
}

function buildTeachersSteps() {
  return [
    {
      element: "#tour-teachers-header",
      popover: {
        title: "Medlærere",
        description:
          "Her ser du alle lærere som har tilgang til systemet — deg selv og eventuelle medlærere du har invitert.",
        side: "bottom" as const,
      },
    },
    {
      element: "#tour-invite-teacher",
      popover: {
        title: "Inviter medlærer",
        description:
          "Send en e-postinvitasjon til en kollega. De oppretter kontoen sin selv via lenken i e-posten og kobles automatisk til gruppen du velger.",
        side: "left" as const,
      },
    },
  ];
}

async function launchPageTour(
  steps: DriveStep[],
  showProgress = false,
  progressText = ""
) {
  const { driver } = await import("driver.js");

  const d = driver({
    showProgress,
    progressText,
    allowClose: true,
    animate: true,
    overlayColor: "rgb(0,0,0)",
    overlayOpacity: 0.5,
    nextBtnText: "Neste →",
    prevBtnText: "← Forrige",
    doneBtnText: "Ferdig",
    steps,
    onDestroyStarted: () => {
      sessionStorage.removeItem(RESUME_KEY);
      d.destroy();
    },
  });

  d.drive();
}

async function startFullTour() {
  const { driver } = await import("driver.js");

  const initialSteps = [
    {
      popover: {
        title: "Velkommen til lærerpanelet!",
        description:
          "La oss ta en rask gjennomgang av de viktigste funksjonene. Klikk «Neste» for å fortsette.",
      },
    },
    {
      element: "#tour-nav",
      popover: {
        title: "Navigasjon",
        description:
          "Sidemenyen gir deg tilgang til alle hoveddeler: Grupper, Oppgaver, Statistikk og Lærere.",
        side: "right" as const,
      },
    },
    {
      element: "#tour-nav-groups",
      popover: {
        title: "Grupper",
        description:
          "Start med å opprette grupper — én gruppe per klasse. Elevene melder seg inn med en deltakerkode. Klikk «Neste» for å se gruppesiden.",
        side: "right" as const,
      },
      onNextClick: () => {
        d.destroy();
        navigateTo("groups");
      },
    },
  ];

  const d = driver({
    showProgress: false,
    allowClose: true,
    animate: true,
    overlayColor: "rgb(0,0,0)",
    overlayOpacity: 0.5,
    nextBtnText: "Neste →",
    prevBtnText: "← Forrige",
    doneBtnText: "Avslutt",
    steps: initialSteps,
    onDestroyStarted: () => {
      sessionStorage.removeItem(RESUME_KEY);
      d.destroy();
    },
  });

  d.drive();
}

const AdminTour = forwardRef<AdminTourHandle>((_, ref) => {
  const pathname = usePathname();
  const didAutoStart = useRef(false);

  useImperativeHandle(ref, () => ({
    startTour: () => {
      startFullTour();
    },
  }));

  useEffect(() => {
    if (didAutoStart.current) return;
    const resume = sessionStorage.getItem(RESUME_KEY);
    if (!resume) return;

    if (resume === "groups" && pathname === "/admin/groups") {
      didAutoStart.current = true;
      sessionStorage.removeItem(RESUME_KEY);
      setTimeout(() => launchPageTour(buildGroupsSteps(), true, "Tur {{current}} av {{total}}"), 400);
    } else if (resume === "assignments" && pathname === "/admin/assignments") {
      didAutoStart.current = true;
      sessionStorage.removeItem(RESUME_KEY);
      setTimeout(() => launchPageTour(buildAssignmentsSteps(), true, "Tur {{current}} av {{total}}"), 400);
    } else if (resume === "teachers" && pathname === "/admin/teachers") {
      didAutoStart.current = true;
      sessionStorage.removeItem(RESUME_KEY);
      setTimeout(() => launchPageTour(buildTeachersSteps(), true, "Tur {{current}} av {{total}}"), 400);
    }
  }, [pathname]);

  return null;
});

AdminTour.displayName = "AdminTour";
export default AdminTour;
