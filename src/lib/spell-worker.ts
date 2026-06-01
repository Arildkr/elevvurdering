// Singleton Web Worker for client-side spell checking.
// Falls back gracefully — returns null if Workers are unsupported or fail to load.

export interface SpellError {
  word: string;
  suggestions: string[];
}

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 0;
const pending = new Map<number, (errors: SpellError[]) => void>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || workerFailed) return null;
  if (worker) return worker;

  try {
    worker = new Worker(
      new URL("../workers/spellcheck.worker.ts", import.meta.url)
    );
    worker.onmessage = (e: MessageEvent) => {
      const { id, errors } = e.data as { id: number; errors: SpellError[] };
      pending.get(id)?.(errors);
      pending.delete(id);
    };
    worker.onerror = () => {
      workerFailed = true;
      worker = null;
      // Reject all pending requests
      for (const resolve of pending.values()) resolve([]);
      pending.clear();
    };
  } catch {
    workerFailed = true;
    worker = null;
  }

  return worker;
}

export function spellCheckViaWorker(
  html: string,
  lang: string,
  ignored: Set<string>
): Promise<SpellError[]> | null {
  const w = getWorker();
  if (!w) return null;

  return new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    w.postMessage({ id, html, lang, ignored: Array.from(ignored) });
  });
}
