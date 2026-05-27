import { NextRequest, NextResponse } from "next/server";
import nspell from "nspell";
import { getConfusions } from "@/lib/norwegian-confusions";

type SpellInstance = ReturnType<typeof nspell>;

const instances: Partial<Record<string, Promise<SpellInstance>>> = {};

function loadDict(lang: "nb" | "nn"): Promise<SpellInstance> {
  if (instances[lang] != null) return instances[lang]!;

  instances[lang] = (async () => {
    const { default: dict } =
      lang === "nb"
        ? await import("dictionary-nb")
        : await import("dictionary-nn");
    return nspell(dict as unknown as { aff: Buffer; dic: Buffer });
  })();

  return instances[lang]!;
}

// Norwegian-aware word splitter
const WORD_RE = /(?<![a-zA-ZæøåÆØÅ])[a-zA-ZæøåÆØÅ]{2,}(?![a-zA-ZæøåÆØÅ])/g;

/**
 * Phonetic variant expansion for Norwegian dyslexia patterns.
 *
 * Students often omit digraph prefixes (gj→j, kj→j, hj→j, hv→v, skj→sj)
 * or drop one consonant from a pair. We generate candidates and ask nspell
 * to suggest from each candidate — this bridges the edit-distance gap that
 * prevents Hunspell from finding "gjorde" for "jore".
 */
function phoneticVariants(word: string): string[] {
  const w = word.toLowerCase();
  const v: string[] = [];

  // j → gj / kj / hj  (most common confusion: "jore" → "gjorde")
  if (/^j[a-zæøå]/i.test(w)) {
    v.push("gj" + w.slice(1));
    v.push("kj" + w.slice(1));
    v.push("hj" + w.slice(1));
  }

  // v → hv  ("vor" → "hvor", "vorfor" → "hvorfor")
  if (/^v[a-zæøå]/i.test(w)) {
    v.push("hv" + w.slice(1));
  }

  // sj → skj  ("sjønn" → "skjønn")
  if (/^sj/i.test(w)) {
    v.push("sk" + w.slice(1));
  }

  // Single consonant → double (common dyslexia: "seken" → "sekken")
  const CONS = "bcdfglmnprst";
  for (let i = 0; i < w.length - 1; i++) {
    if (CONS.includes(w[i]) && w[i] !== w[i + 1]) {
      v.push(w.slice(0, i + 1) + w[i] + w.slice(i + 1));
    }
  }

  // Double consonant → single ("kannski" → "kanskje")
  for (let i = 0; i < w.length - 1; i++) {
    if (w[i] === w[i + 1] && CONS.includes(w[i])) {
      v.push(w.slice(0, i) + w.slice(i + 1));
    }
  }

  // Bergensfeil: remove trailing -t  ("gøyt" → "gøy", "gøtt" → "godt" via suggest)
  if (w.endsWith("t") && w.length >= 3) {
    v.push(w.slice(0, -1));
  }

  // Bergensfeil: "maste/mista" type — try "mistet" via is/iste/mistet
  if (w.endsWith("ste") || w.endsWith("sta")) {
    v.push(w.slice(0, -1) + "et");
    v.push("mis" + w.slice(1));
  }

  return [...new Set(v)];
}

async function enhancedSuggestions(
  word: string,
  spell: SpellInstance
): Promise<string[]> {
  const base = spell.suggest(word);
  if (base.length >= 4) return base.slice(0, 4);

  const extra = new Set<string>(base);
  for (const variant of phoneticVariants(word)) {
    // If the variant itself is correct, it's a strong candidate
    if (spell.correct(variant)) {
      extra.add(variant);
    } else {
      // Ask Hunspell to suggest from the phonetically-expanded variant
      for (const s of spell.suggest(variant)) {
        extra.add(s);
        if (extra.size >= 6) break;
      }
    }
    if (extra.size >= 6) break;
  }

  return [...extra].slice(0, 4);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, lang = "nb" } = body as { text: string; lang?: string };

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const safeLang = lang === "nn" ? "nn" : "nb";
    const spell = await loadDict(safeLang);
    const confusions = getConfusions(safeLang);

    const plainText = text
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&[a-z]+;/g, " ");

    const seen = new Map<string, { word: string; suggestions: string[] }>();
    const re = new RegExp(WORD_RE.source, "g");
    let match: RegExpExecArray | null;

    while ((match = re.exec(plainText)) !== null) {
      const word = match[0];
      const key = word.toLowerCase();
      if (seen.has(key) || /^\d+$/.test(word)) continue;

      const confusion = confusions[key];
      if (confusion) {
        // Always flag known forvekslingslyder/dialect words, even if Hunspell accepts them
        const extra = await enhancedSuggestions(key, spell);
        const suggestions = [confusion.standard, ...extra]
          .filter((s, i, a) => a.indexOf(s) === i) // deduplicate
          .slice(0, 4);
        seen.set(key, { word, suggestions });
      } else if (!spell.correct(word) && !spell.correct(key)) {
        const suggestions = await enhancedSuggestions(key, spell);
        seen.set(key, { word, suggestions });
      }
    }

    return NextResponse.json({ errors: Array.from(seen.values()) });
  } catch (error) {
    console.error("Spellcheck error:", error);
    return NextResponse.json({ error: "Spellcheck failed" }, { status: 500 });
  }
}
