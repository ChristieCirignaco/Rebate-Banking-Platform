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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// The UI-language picker: a globe button that opens a list of languages. Marked translate="no"
// throughout so the engine never touches its own labels (translating "French" into French, or
// flickering the current choice). `triggerClassName` lets each header style the button for its
// own background (light surface vs the dark mobile hero).

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Language: ${currentLabel}`}
          translate="no"
          className={cn(
            "notranslate relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
            triggerClassName,
          )}
        >
          <Globe className="size-5" />
          {/* Small badge of the active language code when translated, so it's visible at a glance. */}
          {lang !== SOURCE_LANG ? (
            <span className="absolute -right-0.5 -bottom-0.5 rounded bg-blue-600 px-1 text-[9px] font-bold text-white uppercase">
              {lang.slice(0, 2)}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} translate="no" className="notranslate w-56 p-1">
        <p className="px-2 py-1.5 text-xs font-semibold text-slate-400">Translate this page</p>
        <div className="max-h-[50vh] overflow-y-auto">
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
      </PopoverContent>
    </Popover>
  );
}
