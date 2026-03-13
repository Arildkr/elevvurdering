export type Phase = "writing" | "review" | "closed" | "paused";

export function getAssignmentPhase(
  writeDeadline: Date,
  reviewDeadline: Date,
  isPaused: boolean = false,
  now: Date = new Date()
): Phase {
  if (isPaused) return "paused";
  if (now < writeDeadline) return "writing";
  if (now < reviewDeadline) return "review";
  return "closed";
}

export function canSubmitText(phase: Phase): boolean {
  return phase === "writing";
}

export function canEditText(
  phase: Phase,
  distributionDone: boolean
): boolean {
  return phase === "writing" && !distributionDone;
}

export function canReview(phase: Phase): boolean {
  return phase === "review";
}

export function isReadOnly(phase: Phase): boolean {
  return phase === "closed" || phase === "paused";
}
