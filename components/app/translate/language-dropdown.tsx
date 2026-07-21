"use client";

import { useEffect, useState } from "react";
import { Check, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  FALLBACK_LANGUAGES,
  SOURCE_LANG,
  type TranslateLanguage,
} from "@/lib/translate/config";
import { useTranslate } from "@/components/app/translate/translate-provider";
import { SmoothDropdown } from "@/components/app/smooth-dropdown";

// The UI-language picker: a globe button that morphs open into a list of languages (the
// uselayouts smooth-dropdown). Marked translate="no" throughout so the engine never touches its
// own labels. `triggerClassName` styles the button for each header's background.

// Module-level so the fetched list is shared across every instance and survives remounts.
let languagesCache: TranslateLanguage[] | null = null;

function useLanguages(open: boolean): TranslateLanguage[] {
  const [langs, setLangs] = useState<TranslateLanguage[]>(languagesCache ?? FALLBACK_LANGUAGES);
  useEffect(() => {
    if (!open || languagesCache) return;
    let cancelled = false;
    void fetch("/api/translate/languages")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { languages?: TranslateLanguage[] } | null) => {
        if (cancelled || !data?.languages?.length) return;
        languagesCache = data.languages;
        setLangs(data.languages);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);
  return langs;
}

export function LanguageDropdown({ triggerClassName }: { triggerClassName?: string }) {
  const { lang, setLang } = useTranslate();
  const [open, setOpen] = useState(false);
  const languages = useLanguages(open);

  const current = languages.find((l) => l.language === lang);
  const currentLabel = current?.name ?? (lang === SOURCE_LANG ? "English" : lang.toUpperCase());
  const translating = lang !== SOURCE_LANG;

  return (
    <SmoothDropdown
      open={open}
      onOpenChange={setOpen}
      side="bottom"
      align="end"
      collapsedWidth={40}
      collapsedHeight={40}
      panelWidth={224}
      containerClassName="size-10 shrink-0"
      label={`Language: ${currentLabel}`}
      triggerClassName={cn("notranslate transition-colors", triggerClassName)}
      panelClassName="notranslate p-1"
      trigger={
        <span translate="no" className="notranslate relative flex size-full items-center justify-center">
          <Globe className="size-5" />
          {/* A dot inside the bounds (the morph clips overflow) signals translation is active. */}
          {translating ? (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-blue-500" />
          ) : null}
        </span>
      }
    >
      <div translate="no" className="notranslate">
        <p className="px-2 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">Translate this page</p>
        <div className="max-h-[50dvh] overflow-y-auto">
          {languages.map((l) => {
          const active = l.language === lang;
          return (
            <button
              key={l.language}
              type="button"
              onClick={() => {
                setLang(l.language);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                active
                  ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
              )}
            >
              <span className="truncate">
                {l.name}
                {l.language === SOURCE_LANG ? " (Original)" : ""}
              </span>
              {active ? <Check className="size-4 shrink-0" /> : null}
            </button>
          );
        })}
        </div>
      </div>
    </SmoothDropdown>
  );
}
