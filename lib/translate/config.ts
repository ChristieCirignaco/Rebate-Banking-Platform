// Shared config for the TranslateX-backed UI translation. Client-safe: no secrets, no server
// imports (the API key lives only in the route handler, never here).

// The language the app is authored in. Selecting this is "off" — restore the originals.
export const SOURCE_LANG = "en";

// Cookie holding the user's chosen UI language, so the choice survives navigation and reloads.
export const TRANSLATE_COOKIE = "ui_lang";

export type TranslateLanguage = { language: string; name: string };

// Shown when /supported-languages can't be reached (e.g. no API key configured yet) so the
// dropdown still renders something sensible. The live list from the API supersedes this.
export const FALLBACK_LANGUAGES: TranslateLanguage[] = [
  { language: "en", name: "English" },
  { language: "es", name: "Spanish" },
  { language: "fr", name: "French" },
  { language: "de", name: "German" },
  { language: "pt", name: "Portuguese" },
  { language: "it", name: "Italian" },
  { language: "ar", name: "Arabic" },
  { language: "zh", name: "Chinese" },
  { language: "hi", name: "Hindi" },
  { language: "ru", name: "Russian" },
  { language: "ja", name: "Japanese" },
  { language: "tr", name: "Turkish" },
];

// A single translate call carries at most this many strings, keeping requests well under the
// API's per-minute limit even for a text-heavy page. The engine chunks a page into batches.
export const MAX_TEXTS_PER_REQUEST = 100;

// Cap on a single translatable string. Anything longer is almost certainly not a UI label
// (a pasted blob, encoded data) and isn't worth sending.
export const MAX_TEXT_LENGTH = 5000;
