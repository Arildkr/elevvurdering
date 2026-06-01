"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import {
  SpellCheckExtension,
  spellCheckKey,
  hoverHighlightKey,
  type SpellError,
} from "./SpellCheckExtension";
import {
  getDyslexiaFriendlyIssues,
  analyzeWithAI,
  type AIAnalysis,
  type ReadingIssue,
} from "@/lib/spellcheck";
import { getConfusions } from "@/lib/norwegian-confusions";
import {
  DEFAULT_PHASE_TOOLS,
  type PhaseTools,
  type TargetForm,
} from "@/lib/tools-config";

type Lang = TargetForm;

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  /** Which tools the teacher has enabled for this phase. Defaults to all on. */
  availableTools?: Partial<PhaseTools>;
}

function MenuButton({
  onClick,
  active,
  children,
  title,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`px-2 py-1.5 rounded text-sm font-medium transition-colors ${
        disabled
          ? "text-gray-300 cursor-not-allowed"
          : active
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Skriv her...",
  minHeight = "200px",
  availableTools,
}: RichTextEditorProps) {
  const tools: PhaseTools = { ...DEFAULT_PHASE_TOOLS, ...availableTools };

  const [spellCheckEnabled, setSpellCheckEnabled] = useState(false);
  const [readingHelpEnabled, setReadingHelpEnabled] = useState(false);
  const [lang, setLang] = useState<Lang>(tools.targetForm);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [dyslexiaIssues, setDyslexiaIssues] = useState<ReadingIssue[]>([]);
  const [spellingErrors, setSpellingErrors] = useState<SpellError[]>([]);
  const [ignoredWords, setIgnoredWords] = useState<Set<string>>(new Set());
  const [spellLoading, setSpellLoading] = useState(false);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());

  // Keep a ref to ignored so callbacks always see current value
  const ignoredRef = useRef(ignoredWords);
  ignoredRef.current = ignoredWords;

  const applyErrorsToEditor = useCallback(
    (ed: ReturnType<typeof useEditor>, errors: SpellError[], ignored: Set<string>) => {
      if (!ed) return;
      ed.view.dispatch(
        ed.state.tr.setMeta(spellCheckKey, { errors, ignored })
      );
    },
    []
  );

  // Client-side check of KNOWN_CONFUSIONS — instant, no API needed
  const getKnownErrors = useCallback((html: string, ignored: Set<string>): SpellError[] => {
    const confusions = getConfusions(lang);
    const plain = html.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/&nbsp;/g, " ");
    const re = /(?<![a-zA-ZæøåÆØÅ])[a-zA-ZæøåÆØÅ]{2,}(?![a-zA-ZæøåÆØÅ])/g;
    const seen = new Map<string, SpellError>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(plain)) !== null) {
      const word = m[0];
      const key = word.toLowerCase();
      if (ignored.has(key) || seen.has(key)) continue;
      const c = confusions[key];
      if (c) seen.set(key, { word, suggestions: [c.standard] });
    }
    return Array.from(seen.values());
  }, [lang]);

  const runSpellCheck = useCallback(
    async (html: string, currentLang: Lang, ignored: Set<string>, editor: ReturnType<typeof useEditor>) => {
      if (!editor) return;

      // Step 1: immediate client-side errors (always works)
      const known = getKnownErrors(html, ignored);
      setSpellingErrors(known);
      // Defer dispatch to avoid nested ProseMirror transaction inside onUpdate
      setTimeout(() => {
        if (editor && !editor.isDestroyed) applyErrorsToEditor(editor, known, ignored);
      }, 0);

      // Step 2: augment with Hunspell via API
      setSpellLoading(true);
      try {
        const res = await fetch("/api/spellcheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: html, lang: currentLang }),
        });
        if (res.ok) {
          const data = await res.json();
          const apiErrors: SpellError[] = data.errors ?? [];
          // Merge: add API errors not already covered by client-side check
          const knownKeys = new Set(known.map((e) => e.word.toLowerCase()));
          const extra = apiErrors.filter((e) => !knownKeys.has(e.word.toLowerCase()));
          const merged = [...known, ...extra];
          setSpellingErrors(merged);
          applyErrorsToEditor(editor, merged, ignored);
        }
      } catch {
        // API failed — client-side errors already shown
      } finally {
        setSpellLoading(false);
      }
    },
    [applyErrorsToEditor, getKnownErrors]
  );

  const clearSpellCheck = useCallback((ed: ReturnType<typeof useEditor>) => {
    if (!ed) return;
    setSpellingErrors([]);
    setIgnoredWords(new Set());
    ed.view.dispatch(
      ed.state.tr.setMeta(spellCheckKey, { errors: [], ignored: new Set() })
    );
  }, []);

  const runAIAnalysis = useCallback(async (html: string) => {
    setAiAnalysisLoading(true);
    try {
      const result = await analyzeWithAI(html);
      setAiAnalysis(result);
    } finally {
      setAiAnalysisLoading(false);
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: { languageClassPrefix: "language-" },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      SpellCheckExtension,
    ],
    content,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(html);
      if (readingHelpEnabled) {
        setDyslexiaIssues(getDyslexiaFriendlyIssues(html, lang));
      }
      if (spellCheckEnabled) {
        const text = e.state.doc.textContent;
        const lastChar = text[text.length - 1];
        if (!lastChar || /[\s.,!?;:()"'\[\]{}-]/.test(lastChar)) {
          runSpellCheck(html, lang, ignoredRef.current, e);
        }
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none",
        style: `min-height: ${minHeight}`,
        spellcheck: "false",
      },
    },
  });

  // Toggle spell check or change language
  useEffect(() => {
    if (!editor) return;
    if (spellCheckEnabled) {
      runSpellCheck(editor.getHTML(), lang, ignoredRef.current, editor);
    } else {
      clearSpellCheck(editor);
      setDyslexiaIssues([]);
    }
  }, [spellCheckEnabled, lang, editor, runSpellCheck, clearSpellCheck]);

  // Toggle reading help
  useEffect(() => {
    if (!editor) return;
    if (readingHelpEnabled) {
      setDyslexiaIssues(getDyslexiaFriendlyIssues(editor.getHTML()));
    } else {
      setDyslexiaIssues([]);
    }
  }, [readingHelpEnabled, editor]);

  if (!editor) return null;

  function ignoreWord(word: string) {
    const newIgnored = new Set(ignoredRef.current);
    newIgnored.add(word.toLowerCase());
    setIgnoredWords(newIgnored);
    applyErrorsToEditor(editor!, spellingErrors, newIgnored);
  }

  function dismissTip(message: string) {
    setDismissedTips((prev) => new Set([...prev, message]));
  }

  function hoverWord(word: string | null) {
    editor!.view.dispatch(
      editor!.state.tr.setMeta(hoverHighlightKey, word)
    );
  }

  function jumpToWord(word: string) {
    if (!editor) return;
    const lower = word.toLowerCase();
    let from = -1;
    let to = -1;
    editor.state.doc.descendants((node, pos) => {
      if (from !== -1 || !node.isText || !node.text) return;
      const idx = node.text.toLowerCase().indexOf(lower);
      if (idx !== -1) { from = pos + idx; to = from + word.length; }
    });
    if (from !== -1) {
      editor.chain().setTextSelection({ from, to }).scrollIntoView().run();
      editor.view.focus();
    }
  }

  const visibleErrors = spellingErrors.filter(
    (e) => !ignoredWords.has(e.word.toLowerCase())
  );

  // Words already shown in stavekontroll — filter these out of lesehjelp forvekslingslyd
  const spellCheckedWords = new Set(spellingErrors.map((e) => e.word.toLowerCase()));

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <MenuButton
          onClick={() => editor.chain().focus().clearNodes().run()}
          active={!editor.isActive("heading")}
          title="Vanlig tekst"
        >
          <span className="text-xs">Normal</span>
        </MenuButton>
        <MenuButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          title="Overskrift"
        >
          <span className="text-sm font-bold">Overskrift</span>
        </MenuButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Fet (Ctrl+B)"
        >
          <strong>Fet</strong>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Kursiv (Ctrl+I)"
        >
          <em>Kursiv</em>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Understrek (Ctrl+U)"
        >
          <span className="underline">Understrek</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="Utheving"
        >
          <span className="bg-yellow-200 px-0.5 rounded">Utheving</span>
        </MenuButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Punktliste"
        >
          <svg
            className="w-4 h-4 inline mr-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <circle cx="3" cy="5" r="2" />
            <rect x="7" y="4" width="12" height="2" rx="1" />
            <circle cx="3" cy="10" r="2" />
            <rect x="7" y="9" width="12" height="2" rx="1" />
            <circle cx="3" cy="15" r="2" />
            <rect x="7" y="14" width="12" height="2" rx="1" />
          </svg>
          <span className="text-xs">Punktliste</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Nummerert liste"
        >
          <svg
            className="w-4 h-4 inline mr-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <text x="0" y="7" fontSize="6" fontWeight="bold">
              1.
            </text>
            <rect x="7" y="4" width="12" height="2" rx="1" />
            <text x="0" y="12" fontSize="6" fontWeight="bold">
              2.
            </text>
            <rect x="7" y="9" width="12" height="2" rx="1" />
            <text x="0" y="17" fontSize="6" fontWeight="bold">
              3.
            </text>
            <rect x="7" y="14" width="12" height="2" rx="1" />
          </svg>
          <span className="text-xs">Nummerert</span>
        </MenuButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Angre (Ctrl+Z)"
        >
          <span className="text-xs">↶</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Gjenta (Ctrl+Y)"
        >
          <span className="text-xs">↷</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().clearNodes().run()}
          title="Fjern formatering"
        >
          <span className="text-xs">⌫</span>
        </MenuButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Målform – alltid synlig når minst ett verktøy er tilgjengelig, eleven kan overstyre */}
        {(tools.spellCheck || tools.readingHelp || tools.aiAnalysis) && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-gray-400">Målform:</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-700"
              title="Velg målform for stavekontroll og lesehjelp – du kan endre dette selv"
            >
              <option value="nb">Bokmål</option>
              <option value="nn">Nynorsk</option>
            </select>
          </div>
        )}

        {tools.spellCheck && (
          <button
            type="button"
            onClick={() => setSpellCheckEnabled((v) => !v)}
            title="Stavekontroll: markerer stavefeil i teksten"
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              spellCheckEnabled
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-150"
            }`}
          >
            {spellLoading ? "⏳" : "✓"} Stavekontroll
          </button>
        )}

        {tools.readingHelp && (
          <button
            type="button"
            onClick={() => setReadingHelpEnabled((v) => !v)}
            title="Lesehjelp: tips om struktur, lesbarhet og forvekslingslyder"
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              readingHelpEnabled
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-150"
            }`}
          >
            💡 Lesehjelp
          </button>
        )}

        {tools.aiAnalysis && (
          <button
            type="button"
            onClick={() => editor && runAIAnalysis(editor.getHTML())}
            disabled={aiAnalysisLoading}
            title="AI-analyse: kontekstbaserte, intelligente tips fra kunstig intelligens"
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              aiAnalysisLoading
                ? "bg-gray-200 text-gray-500 cursor-wait"
                : aiAnalysis
                  ? "bg-purple-100 text-purple-700 border border-purple-300"
                  : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-150"
            }`}
          >
            {aiAnalysisLoading ? "⏳ Analyserer..." : "🤖 AI-analyse"}
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="px-4 py-3 relative">
        {editor.isEmpty && (
          <div className="pointer-events-none absolute text-gray-400 text-sm top-3 left-4">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Stavekontroll errors */}
      {spellCheckEnabled && (
        <div className="border-t border-gray-200">
          {visibleErrors.length === 0 ? (
            <div className="px-4 py-2 text-xs text-green-700 bg-green-50">
              {spellLoading ? "Sjekker stavemåte..." : "Ingen stavefeil funnet"}
            </div>
          ) : (
            <div className="bg-red-50 px-4 py-3">
              <div className="text-xs font-semibold text-red-800 uppercase tracking-wide mb-2">
                Stavekontroll — {visibleErrors.length} ord
                {spellLoading && <span className="font-normal ml-1 text-red-500">(oppdaterer…)</span>}
              </div>
              <ul className="space-y-1.5">
                {visibleErrors.map((error, idx) => (
                  <li key={idx} className="flex items-center gap-2 bg-white rounded-lg border border-red-200 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => jumpToWord(error.word)}
                      onMouseEnter={() => hoverWord(error.word)}
                      onMouseLeave={() => hoverWord(null)}
                      title="Gå til ordet i teksten"
                      className="text-sm font-semibold text-red-700 underline decoration-wavy decoration-red-400 hover:text-red-900 text-left"
                    >
                      {error.word}
                    </button>
                    {error.suggestions.length > 0 ? (
                      <>
                        <span className="text-gray-400 text-xs shrink-0">→</span>
                        <span className="text-sm text-gray-700">
                          {error.suggestions.slice(0, 3).join(", ")}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">ingen forslag</span>
                    )}
                    <button
                      type="button"
                      onClick={() => ignoreWord(error.word)}
                      className="ml-auto shrink-0 text-xs text-gray-400 hover:text-gray-600"
                    >
                      Ignorer
                    </button>
                  </li>
                ))}
              </ul>
              {ignoredWords.size > 0 && (
                <button
                  type="button"
                  onClick={() => { setIgnoredWords(new Set()); applyErrorsToEditor(editor!, spellingErrors, new Set()); }}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Vis {ignoredWords.size} ignorerte ord igjen
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lesehjelp */}
      {readingHelpEnabled && (
        <div className="border-t border-blue-200 bg-blue-50 px-4 py-4">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">💡 Lesehjelp</p>
          {dyslexiaIssues.length === 0 ? (
            <p className="text-sm text-blue-700">Ingen åpenbare mønster funnet.</p>
          ) : (
            <div className="space-y-4">

              {/* Kjente forvekslingslyder — skjul de som allerede vises i stavekontroll */}
              {(() => {
                const forveksling = dyslexiaIssues.find((i) => i.type === "forvekslingslyd");
                const pairs = (forveksling?.pairs ?? []).filter(
                  (p) => !spellCheckedWords.has(p.found.toLowerCase()) && !ignoredWords.has(p.found.toLowerCase())
                );
                if (!pairs.length) return null;
                return (
                  <div>
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">
                      Forveksling av lyder — {pairs.length} ord funnet
                    </p>
                    <div className="space-y-1.5">
                      {pairs.map((pair, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white rounded-lg border border-orange-200 px-3 py-2">
                          <span className="shrink-0 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {pair.badge}
                          </span>
                          <button
                            type="button"
                            onClick={() => jumpToWord(pair.found)}
                            onMouseEnter={() => hoverWord(pair.found)}
                            onMouseLeave={() => hoverWord(null)}
                            title="Gå til ordet i teksten"
                            className="text-sm font-semibold text-orange-800 hover:text-orange-900 underline decoration-dotted"
                          >
                            {pair.found}
                          </button>
                          <span className="text-gray-400 text-xs">→</span>
                          <span className="text-sm font-semibold text-green-700">{pair.correct}</span>
                          <button
                            type="button"
                            onClick={() => ignoreWord(pair.found)}
                            className="ml-auto shrink-0 text-xs text-gray-400 hover:text-gray-600"
                          >
                            Ignorer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Særskriving */}
              {(() => {
                const issue = dyslexiaIssues.find((i) => i.type === "særskriving");
                const pairs = (issue?.pairs ?? []).filter(
                  (p) => !dismissedTips.has(p.found)
                );
                if (!pairs.length) return null;
                return (
                  <div>
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">
                      Orddeling — {pairs.length} tilfelle{pairs.length !== 1 ? "r" : ""} funnet
                    </p>
                    <div className="space-y-1.5">
                      {pairs.map((pair, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white rounded-lg border border-orange-200 px-3 py-2">
                          <span className="shrink-0 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {pair.badge}
                          </span>
                          <button
                            type="button"
                            onClick={() => jumpToWord(pair.found.split(" ")[0])}
                            onMouseEnter={() => hoverWord(pair.found)}
                            onMouseLeave={() => hoverWord(null)}
                            title="Gå til ordet i teksten"
                            className="text-sm font-semibold text-orange-800 hover:text-orange-900 underline decoration-dotted"
                          >
                            {pair.found}
                          </button>
                          <span className="text-gray-400 text-xs">→</span>
                          <span className="text-sm font-semibold text-green-700">{pair.correct}</span>
                          <button
                            type="button"
                            onClick={() => dismissTip(pair.found)}
                            className="ml-auto shrink-0 text-xs text-gray-400 hover:text-gray-600"
                          >
                            Ignorer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Mulige forvekslingslyder (j-ord ikke i KNOWN_CONFUSIONS) */}
              {(() => {
                const mulig = dyslexiaIssues.find((i) => i.type === "mulig-forveksling");
                const suspects = (mulig?.suspects ?? []).filter(
                  (w) => !spellCheckedWords.has(w.toLowerCase()) && !ignoredWords.has(w.toLowerCase())
                );
                if (!suspects.length) return null;
                return (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                      Mulige forvekslingslyder — sjekk selv
                    </p>
                    <div className="bg-white rounded-lg border border-amber-200 px-3 py-2.5">
                      <p className="text-sm text-amber-900 mb-2">
                        Disse ordene starter med «j» — skal noen begynne med <strong>gj-</strong>, <strong>kj-</strong> eller <strong>hj-</strong>?
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {suspects.map((w, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 rounded px-2 py-0.5">
                            <button
                              type="button"
                              onClick={() => jumpToWord(w)}
                              onMouseEnter={() => hoverWord(w)}
                              onMouseLeave={() => hoverWord(null)}
                              title="Gå til ordet i teksten"
                              className="text-sm font-medium text-amber-800 hover:text-amber-900 underline decoration-dotted"
                            >
                              {w}
                            </button>
                            <button
                              type="button"
                              onClick={() => ignoreWord(w)}
                              title="Ignorer"
                              className="text-amber-400 hover:text-amber-600 text-xs leading-none"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tekststruktur */}
              {(() => {
                const tips = dyslexiaIssues
                  .filter((i) => i.type === "struktur")
                  .filter((t) => !dismissedTips.has(t.message));
                if (!tips.length) return null;
                return (
                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                      Tekststruktur
                    </p>
                    <ul className="space-y-1.5">
                      {tips.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 bg-white rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-900">
                          <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                          <span className="flex-1">{t.message}</span>
                          <button
                            type="button"
                            onClick={() => dismissTip(t.message)}
                            className="shrink-0 text-xs text-gray-400 hover:text-gray-600 ml-1"
                            title="Skjul dette tipset"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className="bg-purple-50 border-t border-purple-200 px-4 py-3">
          <div className="text-sm font-medium text-purple-900 mb-3">
            🤖 AI-analyse:
          </div>

          {aiAnalysis.overallFeedback && (
            <div className="bg-purple-100 rounded-lg px-3 py-2.5 mb-4 text-sm text-purple-900 font-medium">
              {aiAnalysis.overallFeedback}
            </div>
          )}

          {aiAnalysis.spellingErrors.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide mb-1.5">
                Stavemåte
              </p>
              <ul className="space-y-1">
                {aiAnalysis.spellingErrors.slice(0, 4).map((error, idx) => (
                  <li key={idx} className="text-sm text-purple-800 flex items-start gap-1.5">
                    <span className="text-purple-400 mt-0.5 shrink-0">•</span>{error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiAnalysis.dyslexiaFriendlyTips.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide mb-1.5">
                Setningsbygging og språk
              </p>
              <ul className="space-y-1">
                {aiAnalysis.dyslexiaFriendlyTips.slice(0, 3).map((tip, idx) => (
                  <li key={idx} className="text-sm text-purple-800 flex items-start gap-1.5">
                    <span className="text-purple-400 mt-0.5 shrink-0">•</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiAnalysis.structureTips.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide mb-1.5">
                Struktur og flyt
              </p>
              <ul className="space-y-1">
                {aiAnalysis.structureTips.slice(0, 2).map((tip, idx) => (
                  <li key={idx} className="text-sm text-purple-800 flex items-start gap-1.5">
                    <span className="text-purple-400 mt-0.5 shrink-0">•</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .spell-error {
          text-decoration: underline wavy #dc2626;
          text-underline-offset: 3px;
          cursor: default;
        }
        .cap-error {
          text-decoration: underline wavy #f97316;
          text-underline-offset: 3px;
          cursor: default;
        }
        .spell-hover {
          background-color: #bfdbfe;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

export function RichTextViewer({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-gray-700"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
