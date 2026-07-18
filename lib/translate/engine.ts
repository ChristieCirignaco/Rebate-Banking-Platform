import { MAX_TEXT_LENGTH, SOURCE_LANG } from "@/lib/translate/config";

// Client-side UI translation engine. Walks visible text under a root, translates it through our
// /api/translate proxy, and re-applies after React re-renders (via a MutationObserver), all
// without touching the DOM structure — it only ever changes a text node's value, never adds or
// removes nodes. That's the deliberate constraint that keeps it from triggering React's
// removeChild crashes the way DOM-wrapping translators (Google Translate) do.
//
// What it will NOT translate, by design:
//   • anything inside translate="no" / .notranslate — how we exclude balances, names, amounts,
//     transaction text (the financial-data-stays-put rule)
//   • text with no letters at all — pure numbers, currency, symbols ("$1,240.00", "→")
//   • script/style/input/textarea/code/pre subtrees

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "CODE",
  "PRE",
]);

const HAS_LETTER = /\p{L}/u;

// (target ⇥ source) → translation. Survives language toggles so re-applying is instant.
const cache = new Map<string, string>();
const ck = (target: string, source: string) => `${target}\t${source}`;

// The original (source-language) text for every node we've touched, so we can re-translate after
// React resets a node to English, and restore when the user switches back to the source.
const originals = new WeakMap<Text, string>();

let currentTarget = SOURCE_LANG;
let observer: MutationObserver | null = null;
let root: HTMLElement | null = null;
let rescanTimer: ReturnType<typeof setTimeout> | null = null;

function eligibleTextNodes(within: HTMLElement): Text[] {
  const walker = document.createTreeWalker(within, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = node.nodeValue ?? "";
      if (!value.trim() || !HAS_LETTER.test(value)) return NodeFilter.FILTER_REJECT;
      if (value.length > MAX_TEXT_LENGTH) return NodeFilter.FILTER_REJECT;
      let el = node.parentElement;
      while (el && el !== within.parentElement) {
        if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
        if (el.getAttribute("translate") === "no" || el.classList.contains("notranslate")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (el.isContentEditable) return NodeFilter.FILTER_REJECT;
        el = el.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  return nodes;
}

// The source (English) text for a node: the value we first recorded, or the current value if new.
function sourceOf(node: Text): string {
  const known = originals.get(node);
  if (known !== undefined) return known;
  const value = node.nodeValue ?? "";
  originals.set(node, value);
  return value;
}

// Write a value without the observer treating it as an external (React) change.
function silentlySet(node: Text, value: string) {
  if (node.nodeValue === value) return;
  node.nodeValue = value;
}

async function fetchTranslations(texts: string[], target: string): Promise<string[]> {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts, target }),
    });
    if (!res.ok) return texts; // 503 (unconfigured) / error → leave as source
    const data = (await res.json()) as { translations?: unknown };
    if (!Array.isArray(data.translations) || data.translations.length !== texts.length) return texts;
    return data.translations.map((t, i) => (typeof t === "string" ? t : texts[i]));
  } catch {
    return texts;
  }
}

// Re-apply cached translations to every node, and return the sources still missing a translation.
function applyFromCache(target: string): string[] {
  if (!root) return [];
  const nodes = eligibleTextNodes(root);
  const missing = new Set<string>();
  for (const node of nodes) {
    const source = sourceOf(node);
    const hit = cache.get(ck(target, source));
    if (hit !== undefined) silentlySet(node, hit);
    else missing.add(source);
  }
  return [...missing];
}

// Set every touched node back to its source text (used when switching to the source language).
function restoreOriginals() {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text;
    const orig = originals.get(node);
    if (orig !== undefined) silentlySet(node, orig);
  }
}

// Apply the current target to the DOM: fill from cache, fetch what's missing, apply again.
async function apply() {
  if (!root) return;
  const target = currentTarget;

  if (target === SOURCE_LANG) {
    withObserverPaused(restoreOriginals);
    return;
  }

  const missing = withObserverPausedReturning(() => applyFromCache(target));
  if (missing.length === 0) return;

  const translations = await fetchTranslations(missing, target);
  // A late language switch mid-fetch: don't apply stale results.
  if (currentTarget !== target) return;
  missing.forEach((source, i) => cache.set(ck(target, source), translations[i]));
  withObserverPaused(() => applyFromCache(target));
}

// Our own writes must not feed back into the observer, or it loops forever.
function withObserverPaused(fn: () => void) {
  observer?.disconnect();
  try {
    fn();
  } finally {
    if (root) observer?.observe(root, { childList: true, subtree: true, characterData: true });
  }
}
function withObserverPausedReturning<T>(fn: () => T): T {
  observer?.disconnect();
  try {
    return fn();
  } finally {
    if (root) observer?.observe(root, { childList: true, subtree: true, characterData: true });
  }
}

function scheduleReapply() {
  if (rescanTimer) clearTimeout(rescanTimer);
  // Debounce: React can fire many mutations in a burst; translate once it settles.
  rescanTimer = setTimeout(() => void apply(), 120);
}

// Point the engine at a root (the app content) and set the active language. Idempotent — safe to
// call on every navigation and language change.
export function startTranslation(rootEl: HTMLElement, target: string) {
  root = rootEl;
  currentTarget = target;

  if (!observer) {
    observer = new MutationObserver(() => scheduleReapply());
  }
  withObserverPaused(() => {}); // ensure observing the (possibly new) root
  void apply();
}

export function setLanguage(target: string) {
  currentTarget = target;
  void apply();
}

export function stopTranslation() {
  observer?.disconnect();
  observer = null;
  root = null;
  if (rescanTimer) clearTimeout(rescanTimer);
}
