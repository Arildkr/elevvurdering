export interface RubricItem {
  id: string;
  label: string;
}

export type RubricValue = "yes" | "partial" | "no";

export interface RubricResponse {
  id: string;
  value: RubricValue;
}

export const DEFAULT_RUBRIC: RubricItem[] = [
  { id: "1", label: "Teksten svarer på oppgaven" },
  { id: "2", label: "Teksten er godt bygd opp med innledning, hoveddel og avslutning" },
  { id: "3", label: "Språket er variert og har god flyt" },
  { id: "4", label: "Rettskriving og tegnsetting er god" },
];

export const RUBRIC_LABELS: Record<RubricValue, string> = {
  yes: "Stemmer",
  partial: "Stemmer delvis",
  no: "Stemmer ikke",
};

export function parseRubricConfig(json: string | null | undefined): RubricItem[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as RubricItem[];
    return null;
  } catch {
    return null;
  }
}

export function parseRubricResponse(json: string | null | undefined): RubricResponse[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as RubricResponse[];
    return null;
  } catch {
    return null;
  }
}
