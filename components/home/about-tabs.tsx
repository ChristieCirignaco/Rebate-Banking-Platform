"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { CMS_ICONS } from "@/lib/cms/icons";

export type AboutTab = {
  label: string;
  icon: string; // CMS icon name
  accent: string; // gold | sky | emerald | red
  heading: string;
  items: string[];
};

const ACCENTS: Record<string, string> = {
  gold: "text-[var(--trb-gold)]",
  sky: "text-sky-400",
  emerald: "text-emerald-400",
  red: "text-[var(--trb-red)]",
};

export function AboutTabs({ tabs }: { tabs: AboutTab[] }) {
  const [active, setActive] = useState(0);
  const current = tabs[Math.min(active, tabs.length - 1)];
  if (!current) return null;
  const HeadingIcon = CMS_ICONS[current.icon];
  const currentAccent = ACCENTS[current.accent] ?? ACCENTS.gold;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Vertical tab list */}
      <div role="tablist" aria-label="How TRBS works" className="flex flex-col gap-2 lg:col-span-1">
        {tabs.map((t, i) => {
          const Icon = CMS_ICONS[t.icon];
          const isActive = active === i;
          return (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-colors ${
                isActive
                  ? "border-white/10 bg-white/[0.06] text-white"
                  : "border-transparent text-white/50 hover:bg-white/[0.03] hover:text-white"
              }`}
            >
              {Icon && <Icon className={`h-5 w-5 shrink-0 ${ACCENTS[t.accent] ?? ACCENTS.gold}`} />}
              <span className="flex-1">{t.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      <div
        role="tabpanel"
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:p-10 lg:col-span-2"
      >
        <h3 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-[28px]">
          {HeadingIcon && <HeadingIcon className={`h-7 w-7 shrink-0 ${currentAccent}`} />}
          {current.heading}
        </h3>
        <ol className="mt-7 list-decimal space-y-5 pl-6 marker:font-bold marker:text-[var(--trb-gold)]">
          {current.items.map((item) => (
            <li key={item} className="pl-1 text-sm leading-relaxed text-white/70">
              {item}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
