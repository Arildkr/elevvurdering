import { getConfusions } from "./norwegian-confusions";

export interface SpellError {
  word: string;
  suggestions: string[];
}

export interface AIAnalysis {
  spellingErrors: string[];
  dyslexiaFriendlyTips: string[];
  structureTips: string[];
  overallFeedback: string;
}

export async function analyzeWithAI(content: string): Promise<AIAnalysis | null> {
  try {
    const response = await fetch("/api/ai-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Short badge labels shown next to each word pair in the UI
const RULE_BADGE: Record<string, string> = {
  "gj/j":           "gj/j",
  "kj/j":           "kj/j",
  "hj/j":           "hj/j",
  "hv/v":           "hv/v",
  "skj/sj":         "skj/sj",
  "dialekt":        "dialekt",
  "sammenskriving": "sammenskriving",
  "stavemåte":      "stavemåte",
  "bokmål":         "bokmål",
};

export interface ConfusionPair {
  found: string;
  correct: string;
  badge: string;
}

export interface ReadingIssue {
  type: "forvekslingslyd" | "mulig-forveksling" | "særskriving" | "struktur";
  message: string;
  pairs?: ConfusionPair[];    // for forvekslingslyd and særskriving
  suspects?: string[];        // for mulig-forveksling
}

const LEGIT_J_WORDS = new Set([
  "ja", "jeg", "jo", "jul", "juni", "juli", "jobb", "jord", "jente",
  "jenta", "jentas", "jenter", "jentene", "jublende", "juble", "jubel",
  "journalist", "journal", "juridisk", "jurist", "jury", "jakt", "jeger",
  "jakten", "jaktet", "jage", "jager", "jaget",
]);

const WORD_RE = /(?<![a-zA-ZæøåÆØÅ])[a-zA-ZæøåÆØÅ]{2,}(?![a-zA-ZæøåÆØÅ])/g;

export function getDyslexiaFriendlyIssues(content: string, lang: "nb" | "nn" = "nb"): ReadingIssue[] {
  const KNOWN_CONFUSIONS = getConfusions(lang);
  const plainText = content
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .trim();

  if (plainText.length < 10) return [];

  const issues: ReadingIssue[] = [];

  // --- 1. Oppslagsbasert forvekslingslyd ---
  const pairs: ConfusionPair[] = [];
  const seenKeys = new Set<string>();
  const re1 = new RegExp(WORD_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re1.exec(plainText)) !== null) {
    const key = m[0].toLowerCase();
    if (seenKeys.has(key)) continue;
    const hit = KNOWN_CONFUSIONS[key];
    if (!hit) continue;
    seenKeys.add(key);
    pairs.push({
      found: m[0],
      correct: hit.standard,
      badge: RULE_BADGE[hit.rule] ?? hit.rule,
    });
  }
  if (pairs.length > 0) {
    issues.push({ type: "forvekslingslyd", message: "Forveksling av lyder", pairs });
  }

  // --- 2. Mulige j-forvekslingslyder (ord ikke i KNOWN_CONFUSIONS) ---
  const jRe = /\bj[øæeoa][a-zæøå]{2,}\b/gi;
  const suspects: string[] = [];
  let jm: RegExpExecArray | null;
  while ((jm = jRe.exec(plainText)) !== null) {
    const w = jm[0].toLowerCase();
    if (LEGIT_J_WORDS.has(w) || KNOWN_CONFUSIONS[w]) continue;
    if (!suspects.includes(jm[0])) suspects.push(jm[0]);
  }
  if (suspects.length > 0) {
    issues.push({ type: "mulig-forveksling", message: "Mulige forvekslingslyder", suspects: suspects.slice(0, 6) });
  }

  // --- 3. «kjempe» særskriving («kjempe stor» → «kjempestor») ---
  // «kjempe» som forsterkende forstavelse skrives alltid i ett med neste ord
  {
    const kjempeRe = /\bkjempe\s+[a-zæøå]{2,}\b/gi;
    const INTENSIFIER_FOLLOWS = new Set([
      "bra", "stor", "store", "stort", "god", "godt", "gode", "fin", "fint", "fine",
      "gøy", "morsom", "morsomme", "morsomt", "kul", "kult", "kule", "flink", "flinke",
      "dyktig", "dyktige", "hyggelig", "hyggelige", "trist", "triste", "glad", "glade",
      "fornøyd", "fornøyde", "mange", "mye", "viktig", "viktige", "viktigere",
      "interessant", "interessante", "spennende", "vanskelig", "vanskelige",
      "lett", "lette", "enkel", "enkelt", "lange", "lang", "kort", "korte",
      "fort", "raskt", "sakte", "tidlig", "sent", "feil", "rart", "rart",
      "snill", "snille", "stygg", "stygge", "pen", "pene", "pent",
    ]);
    const kjempeHits: string[] = [];
    let km: RegExpExecArray | null;
    while ((km = kjempeRe.exec(plainText)) !== null) {
      const next = km[0].split(/\s+/)[1]?.toLowerCase();
      if (next && INTENSIFIER_FOLLOWS.has(next) && !kjempeHits.includes(km[0])) {
        kjempeHits.push(km[0]);
      }
    }
    if (kjempeHits.length > 0) {
      issues.push({
        type: "særskriving",
        message: "«kjempe» som forsterker skrives i ett ord",
        pairs: kjempeHits.map((h) => ({
          found: h,
          correct: h.replace(/\s+/, ""),
          badge: "orddeling",
        })),
      });
    }
  }

  // --- 5. Veldig lange setninger ---
  // Split only on [?!] or on [.] followed by an uppercase letter (avoids splitting on abbreviations like "ca.", "bl.a.", "f.eks.")
  const sentences = plainText.split(/(?<=[!?])\s+|(?<=\.)\s+(?=[A-ZÆØÅ«"])/).filter((s) => s.trim().length > 0);
  const longSents = sentences.filter((s) => s.trim().split(/\s+/).length > 22);
  if (longSents.length > 0) {
    issues.push({
      type: "struktur",
      message: `${longSents.length === 1 ? "Én setning" : `${longSents.length} setninger`} er veldig lang — del opp for bedre lesbarhet`,
    });
  }

  // --- 4. Mangler avsnitt ---
  const paragraphs = content
    .split(/<\/p>|<br\s*\/?>/i)
    .filter((p) => p.replace(/<[^>]*>/g, "").trim().length > 0);
  if (sentences.length >= 6 && paragraphs.length < 2) {
    issues.push({ type: "struktur", message: "Teksten mangler avsnitt — del den opp for bedre lesbarhet" });
  }

  // --- 5. Ensformige setningsstarter ---
  if (sentences.length >= 4) {
    const starters = sentences
      .map((s) => s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-zæøå]/gi, ""))
      .filter(Boolean) as string[];
    const starterFreq = new Map<string, number>();
    for (const s of starters) starterFreq.set(s, (starterFreq.get(s) ?? 0) + 1);
    const dominated = [...starterFreq.entries()]
      .filter(([word, n]) => n >= 3 && n / starters.length >= 0.4 && word.length >= 2)
      .sort((a, b) => b[1] - a[1]);
    if (dominated.length > 0) {
      const [word, count] = dominated[0];
      issues.push({
        type: "struktur",
        message: `${count} av ${starters.length} setninger starter med «${word}» — prøv å variere innledningen`,
      });
    }

    // --- 6. Overbruk av konjunksjoner som setningsstart ---
    const CONJ_STARTERS = new Set(["og", "men", "for", "fordi", "så"]);
    const conjStarts = starters.filter((s) => CONJ_STARTERS.has(s));
    if (conjStarts.length >= 3) {
      issues.push({
        type: "struktur",
        message: `${conjStarts.length} setninger begynner med et bindeord (og/men/fordi/så) — vurder å bygge om noen av dem`,
      });
    }
  }

  // --- 7. Gjentatte innholdsord ---
  const STOP = new Set([
    "dette", "denne", "disse", "også", "ikke", "bare", "over", "under",
    "etter", "siden", "fordi", "eller", "mens", "både", "hadde", "kunne",
    "ville", "skulle", "burde", "være", "blitt", "mange", "noen", "alle",
    "når", "som", "han", "hun", "dem", "det", "den", "seg", "sin", "sitt",
  ]);
  const wordFreq = new Map<string, number>();
  for (const w of (plainText.match(/[a-zA-ZæøåÆØÅ]{4,}/g) ?? [])) {
    const k = w.toLowerCase();
    if (!STOP.has(k)) wordFreq.set(k, (wordFreq.get(k) ?? 0) + 1);
  }
  const repeated = [...wordFreq.entries()]
    .filter(([, n]) => n >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (repeated.length > 0) {
    issues.push({
      type: "struktur",
      message: `Noen ord gjentas mange ganger: ${repeated.map(([w, n]) => `"${w}" (${n}×)`).join(", ")} — prøv å variere ordvalget`,
    });
  }

  return issues;
}
