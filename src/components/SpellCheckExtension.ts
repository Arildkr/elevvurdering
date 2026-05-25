import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

export interface SpellError {
  word: string;
  suggestions: string[];
}

interface PluginState {
  errors: SpellError[];
  ignored: Set<string>;
}

export const spellCheckKey = new PluginKey<PluginState>("spellCheck");
export const hoverHighlightKey = new PluginKey<string | null>("hoverHighlight");

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Norwegian-aware word boundary (handles æ, ø, å)
const NOR_LETTER = "a-zA-ZæøåÆØÅ";
const NOT_LETTER = `(?<![${NOR_LETTER}])`;
const NOT_LETTER_AFTER = `(?![${NOR_LETTER}])`;

function buildDecorations(
  doc: Node,
  errors: SpellError[],
  ignored: Set<string>
): DecorationSet {
  if (errors.length === 0) return DecorationSet.empty;

  const active = errors.filter((e) => !ignored.has(e.word.toLowerCase()));
  if (active.length === 0) return DecorationSet.empty;

  const decorations: Decoration[] = [];

  doc.descendants((node: Node, pos: number) => {
    if (!node.isText || !node.text) return;
    const text = node.text;

    for (const error of active) {
      const pattern = new RegExp(
        `${NOT_LETTER}${escapeRegex(error.word)}${NOT_LETTER_AFTER}`,
        "gi"
      );
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        decorations.push(
          Decoration.inline(pos + m.index, pos + m.index + m[0].length, {
            class: "spell-error",
          })
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

function buildHoverDecorations(doc: Node, word: string | null): DecorationSet {
  if (!word) return DecorationSet.empty;
  // Use the first word of a bigram (e.g. "kjempe stor" → match "kjempe")
  const matchWord = word.split(" ")[0];
  const decorations: Decoration[] = [];
  const pattern = new RegExp(
    `${NOT_LETTER}${escapeRegex(matchWord)}${NOT_LETTER_AFTER}`,
    "gi"
  );

  doc.descendants((node: Node, pos: number) => {
    if (!node.isText || !node.text) return;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(node.text)) !== null) {
      decorations.push(
        Decoration.inline(pos + m.index, pos + m.index + m[0].length, {
          class: "spell-hover",
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const SpellCheckExtension = Extension.create({
  name: "spellCheck",

  addProseMirrorPlugins() {
    return [
      new Plugin<PluginState>({
        key: spellCheckKey,
        state: {
          init(): PluginState {
            return { errors: [], ignored: new Set() };
          },
          apply(tr, prev): PluginState {
            const meta = tr.getMeta(spellCheckKey) as
              | Partial<PluginState>
              | undefined;
            if (!meta) return prev;
            return {
              errors: meta.errors ?? prev.errors,
              ignored: meta.ignored ?? prev.ignored,
            };
          },
        },
        props: {
          decorations(state) {
            const ps = spellCheckKey.getState(state);
            if (!ps) return DecorationSet.empty;
            return buildDecorations(state.doc, ps.errors, ps.ignored);
          },
        },
      }),

      new Plugin<string | null>({
        key: hoverHighlightKey,
        state: {
          init(): string | null { return null; },
          apply(tr, prev): string | null {
            const meta = tr.getMeta(hoverHighlightKey);
            if (meta === undefined) return prev;
            return (meta ?? null) as string | null;
          },
        },
        props: {
          decorations(state) {
            const word = hoverHighlightKey.getState(state);
            return buildHoverDecorations(state.doc, word ?? null);
          },
        },
      }),
    ];
  },
});
