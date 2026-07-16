"use client";

import { useState } from "react";
import { Coins, Landmark, Shield, Flag, ChevronRight, type LucideIcon } from "lucide-react";

type Tab = {
  label: string;
  Icon: LucideIcon;
  accent: string;
  heading: string;
  items: string[];
};

const TABS: Tab[] = [
  {
    label: "How It Works",
    Icon: Coins,
    accent: "text-[var(--trb-gold)]",
    heading: "How It Works",
    items: [
      "Citizens enroll in the TRBS program through government portals or authorized banks.",
      "Participants accumulate “Patriot Points” or direct TRBS credits through specific actions (e.g., buying American-made products, military service, continuous employment).",
      "These credits are stored in a designated TRBS account linked to their SSN or a dedicated federal ID.",
      "Credits can be redeemed for cash, tax deductions, or used as collateral for federally backed loans.",
    ],
  },
  {
    label: "Institutional Support",
    Icon: Landmark,
    accent: "text-sky-400",
    heading: "Institutional Support",
    items: [
      "TRBS operates alongside participating banks and authorized financial partners.",
      "Verification is handled by an authorized compliance team before any payout is approved.",
      "Payouts are processed through bank-grade, encrypted transfers straight to your account.",
    ],
  },
  {
    label: "Goals & Safeguards",
    Icon: Shield,
    accent: "text-emerald-400",
    heading: "Goals & Safeguards",
    items: [
      "Reward the patriotism, service, and loyalty of everyday Americans.",
      "Protect participants with strict, fraud-resistant verification on every account.",
      "Confirm each submission through trusted channels before a single credit is released.",
    ],
  },
  {
    label: "Narrative & Branding",
    Icon: Flag,
    accent: "text-[var(--trb-red)]",
    heading: "Narrative & Branding",
    items: [
      "Honor the belief that holding a TRB product represents something bigger.",
      "Recognize the commitment and sacrifice of proud supporters across the country.",
      "Celebrate the patriotism that unites the TRBS community as one movement.",
    ],
  },
];

export function AboutTabs() {
  const [active, setActive] = useState(0);
  const current = TABS[active];
  const HeadingIcon = current.Icon;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Vertical tab list */}
      <div role="tablist" aria-label="How TRBS works" className="flex flex-col gap-2 lg:col-span-1">
        {TABS.map((t, i) => {
          const Icon = t.Icon;
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
              <Icon className={`h-5 w-5 shrink-0 ${t.accent}`} />
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
          <HeadingIcon className={`h-7 w-7 shrink-0 ${current.accent}`} />
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
