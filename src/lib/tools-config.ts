export type TargetForm = "nb" | "nn";

export interface PhaseTools {
  spellCheck: boolean;
  readingHelp: boolean;
  aiAnalysis: boolean;
  targetForm: TargetForm;
}

export interface AssignmentToolsConfig {
  writing: PhaseTools;
  review: PhaseTools;
  feedback: PhaseTools;
}

export const DEFAULT_PHASE_TOOLS: PhaseTools = {
  spellCheck: true,
  readingHelp: true,
  aiAnalysis: false,
  targetForm: "nb",
};

export const DEFAULT_TOOLS_CONFIG: AssignmentToolsConfig = {
  writing:  { ...DEFAULT_PHASE_TOOLS },
  review:   { ...DEFAULT_PHASE_TOOLS, aiAnalysis: false },
  feedback: { ...DEFAULT_PHASE_TOOLS, aiAnalysis: false },
};

export function parseToolsConfig(raw: string | null | undefined): AssignmentToolsConfig {
  if (!raw) return DEFAULT_TOOLS_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<AssignmentToolsConfig>;
    return {
      writing:  { ...DEFAULT_PHASE_TOOLS, ...parsed.writing },
      review:   { ...DEFAULT_PHASE_TOOLS, ...parsed.review },
      feedback: { ...DEFAULT_PHASE_TOOLS, ...parsed.feedback },
    };
  } catch {
    return DEFAULT_TOOLS_CONFIG;
  }
}
