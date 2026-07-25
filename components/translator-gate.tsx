import type { ReactNode } from "react";

import { getSettings } from "@/lib/settings/store";
import { TranslatorEnabledProvider } from "@/components/translator-enabled";

// Server half of the translator switch: reads Settings → Plugins once and publishes the answer
// to the client tree. Mounted in the root layout so marketing, the auth funnel and the signed-in
// app all get it from the same read — the "one toggle, off everywhere" requirement.
//
// Costs no extra query: getSettings memoizes per request, so this shares the round-trip with
// SitePluginScripts (and with any page that reads "plugins" for reCAPTCHA).
export async function TranslatorGate({ children }: { children: ReactNode }) {
  const plugins = await getSettings("plugins");
  return (
    <TranslatorEnabledProvider enabled={plugins.translatorEnabled}>
      {children}
    </TranslatorEnabledProvider>
  );
}
