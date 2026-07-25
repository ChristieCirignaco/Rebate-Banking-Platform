"use client";

import { createContext, useContext, type ReactNode } from "react";

// Carries the admin's Settings → Plugins → Translator switch to every translator surface.
//
// Context rather than props because the translator mounts on surfaces the server can't reach
// directly: components/auth/auth-shell.tsx sits in the CLIENT graph (client login/register/reset
// forms import it for AUTH_FIELD_CLASS), so it can't read settings itself and threading a prop
// there would mean touching all nine auth forms — and every future one. The provider goes in the
// root layout, so anything that renders anywhere inherits the answer.
//
// Defaults to true so a component rendered outside the provider keeps the pre-toggle behavior
// rather than silently losing its translator.
const TranslatorEnabledContext = createContext(true);

export function useTranslatorEnabled(): boolean {
  return useContext(TranslatorEnabledContext);
}

export function TranslatorEnabledProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <TranslatorEnabledContext.Provider value={enabled}>
      {children}
    </TranslatorEnabledContext.Provider>
  );
}
