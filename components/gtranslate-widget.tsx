"use client";

import Script from "next/script";

// GTranslate's floating language picker, bottom-left.
//
// Scoped deliberately: this renders on the MARKETING pages and the AUTH funnel only — the two
// surfaces a visitor can reach before signing in, where they may not read English and have no
// account preference to honour yet. It is NOT on the signed-in app, which has its own
// translation (components/app/translate — provider + dropdown, driven by a stored language
// cookie), nor on /admin. Two translators on one page would fight over the same DOM.
//
// Mounted from exactly two places for that reason: components/auth/auth-shell.tsx (every auth
// screen renders through it) and app/(home)/layout.tsx.

declare global {
  interface Window {
    gtranslateSettings?: Record<string, unknown>;
  }
}

const SETTINGS = {
  default_language: "en",
  native_language_names: true,
  detect_browser_language: true,
  wrapper_selector: ".gtranslate_wrapper",
  horizontal_position: "left",
  vertical_position: "bottom",
  alt_flags: { en: "usa" },
} as const;

// Assigned at MODULE scope, not in an effect or the render body: ps.js reads this global the
// moment it executes, and module evaluation happens on import — before <Script> can mount and
// start the fetch. An effect would race it, and the vendor silently falls back to defaults when
// the object isn't there yet.
if (typeof window !== "undefined") {
  window.gtranslateSettings = { ...SETTINGS };
}

export function GTranslateWidget() {
  return (
    <>
      {/* The vendor injects the picker into this element. */}
      <div className="gtranslate_wrapper" />
      {/* afterInteractive, not beforeInteractive: a translation widget is not needed for first
          paint, and beforeInteractive is only legal in the root layout anyway. */}
      <Script src="https://cdn.gtranslate.net/widgets/latest/ps.js" strategy="afterInteractive" />
    </>
  );
}
