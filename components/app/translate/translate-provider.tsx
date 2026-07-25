"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SOURCE_LANG, TRANSLATE_COOKIE } from "@/lib/translate/config";
import { useTranslatorEnabled } from "@/components/translator-enabled";
import {
  setLanguage as engineSetLanguage,
  startTranslation,
  stopTranslation,
} from "@/lib/translate/engine";

type TranslateContextValue = { lang: string; setLang: (lang: string) => void };

const TranslateContext = createContext<TranslateContextValue>({
  lang: SOURCE_LANG,
  setLang: () => {},
});

export function useTranslate(): TranslateContextValue {
  return useContext(TranslateContext);
}

// Drives the client translation engine while the signed-in app is mounted. `initialLang` comes
// from the cookie, read server-side in the layout, so a returning user's page translates on first
// paint (after hydration — a brief flash of the source language is unavoidable with client-side
// translation).
//
// Roots the engine at document.body rather than a wrapper element: Radix dialogs, drawers,
// popovers and toasts portal to the body, outside the React subtree, and they need translating
// too. The engine only ever runs while this provider is mounted (i.e. on app pages), and stops
// on unmount, so marketing/auth pages are never touched.
export function TranslateProvider({
  initialLang,
  children,
}: {
  initialLang: string;
  children: ReactNode;
}) {
  // Admin kill-switch (Settings → Plugins → Translator). Off means the engine never starts, so
  // a user whose ui_lang cookie still says "fr" sees the app in its source language — the cookie
  // is kept, not cleared, so their choice returns intact if the switch goes back on.
  const enabled = useTranslatorEnabled();
  const [lang, setLangState] = useState(initialLang);
  const langRef = useRef(initialLang);
  const pathname = usePathname();

  // (Re)start on mount and every navigation — a new page swaps the content to translate. The
  // engine's MutationObserver catches later React re-renders; this kicks the fresh route now.
  // `enabled` is a dep so flipping the switch off mid-session runs the cleanup, and
  // stopTranslation() puts the source text back rather than leaving the page half-translated.
  useEffect(() => {
    if (!enabled) return;
    startTranslation(document.body, langRef.current);
    return () => stopTranslation();
  }, [pathname, enabled]);

  function setLang(next: string) {
    if (!enabled) return;
    langRef.current = next;
    setLangState(next);
    document.cookie = `${TRANSLATE_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    engineSetLanguage(next);
  }

  return (
    <TranslateContext.Provider value={{ lang: enabled ? lang : SOURCE_LANG, setLang }}>
      {children}
    </TranslateContext.Provider>
  );
}
