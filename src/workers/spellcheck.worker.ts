/// <reference lib="webworker" />
// Web Worker — no React, no Node.js APIs.
// Loaded via new Worker(new URL('./spellcheck.worker.ts', import.meta.url)).

import nspell from "nspell";

type SpellInstance = ReturnType<typeof nspell>;

const instances = new Map<string, Promise<SpellInstance>>();

function loadDict(lang: string): Promise<SpellInstance> {
  const key = lang === "nn" ? "nn" : "nb";
  if (instances.has(key)) return instances.get(key)!;

  const p = Promise.all([
    fetch(`/dictionaries/${key}.aff`).then((r) => r.text()),
    fetch(`/dictionaries/${key}.dic`).then((r) => r.text()),
  ]).then(([aff, dic]) => (nspell as unknown as (aff: string, dic: string) => SpellInstance)(aff, dic));

  instances.set(key, p);
  return p;
}

// Phonetic variant expansion — mirrors the server-side logic in /api/spellcheck
function phoneticVariants(word: string): string[] {
  const w = word.toLowerCase();
  const v: string[] = [];

  if (/^j[a-zæøå]/i.test(w)) {
    v.push("gj" + w.slice(1));
    v.push("kj" + w.slice(1));
    v.push("hj" + w.slice(1));
  }
  if (/^v[a-zæøå]/i.test(w)) v.push("hv" + w.slice(1));
  if (/^sj/i.test(w)) v.push("sk" + w.slice(1));

  const CONS = "bcdfglmnprst";
  for (let i = 0; i < w.length - 1; i++) {
    if (CONS.includes(w[i]) && w[i] !== w[i + 1])
      v.push(w.slice(0, i + 1) + w[i] + w.slice(i + 1));
  }
  for (let i = 0; i < w.length - 1; i++) {
    if (w[i] === w[i + 1] && CONS.includes(w[i]))
      v.push(w.slice(0, i) + w.slice(i + 1));
  }
  if (w.endsWith("t") && w.length >= 3) v.push(w.slice(0, -1));
  if (w.endsWith("ste") || w.endsWith("sta")) {
    v.push(w.slice(0, -1) + "et");
    v.push("mis" + w.slice(1));
  }

  return [...new Set(v)];
}

function enhancedSuggestions(word: string, spell: SpellInstance): string[] {
  const base = spell.suggest(word);
  if (base.length >= 4) return base.slice(0, 4);

  const extra = new Set<string>(base);
  for (const variant of phoneticVariants(word)) {
    if (spell.correct(variant)) {
      extra.add(variant);
    } else {
      for (const s of spell.suggest(variant)) {
        extra.add(s);
        if (extra.size >= 6) break;
      }
    }
    if (extra.size >= 6) break;
  }
  return [...extra].slice(0, 4);
}

const WORD_RE = /(?<![a-zA-ZæøåÆØÅ])[a-zA-ZæøåÆØÅ]{2,}(?![a-zA-ZæøåÆØÅ])/g;

self.onmessage = async (e: MessageEvent) => {
  const { id, html, lang, ignored: ignoredArr } = e.data as {
    id: number;
    html: string;
    lang: string;
    ignored: string[];
  };
  const ignored = new Set<string>(ignoredArr);

  try {
    const spell = await loadDict(lang);

    const plain = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&[a-z]+;/g, " ");

    const seen = new Map<string, { word: string; suggestions: string[] }>();
    const re = new RegExp(WORD_RE.source, "g");
    let m: RegExpExecArray | null;

    while ((m = re.exec(plain)) !== null) {
      const word = m[0];
      const key = word.toLowerCase();
      if (seen.has(key) || ignored.has(key) || /^\d+$/.test(word)) continue;
      if (!spell.correct(word) && !spell.correct(key)) {
        seen.set(key, { word, suggestions: enhancedSuggestions(key, spell) });
      }
    }

    self.postMessage({ id, errors: Array.from(seen.values()) });
  } catch {
    self.postMessage({ id, errors: [] });
  }
};
