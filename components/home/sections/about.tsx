// CMS renderers for the about-page sections (1:1 extraction of the previous
// hardcoded app/(home)/about/page.tsx markup).
import Image from "next/image";
import { Search, CheckCircle2 } from "lucide-react";

import { Reveal } from "@/components/home/reveal";
import { CountUp } from "@/components/home/count-up";
import { AboutTabs, type AboutTab } from "@/components/home/about-tabs";
import { CmsIcon } from "@/lib/cms/icons";
import { cmsLines, cmsNum, cmsText } from "@/lib/cms/types";
import type { SectionProps } from "./section-props";

export function AboutIntroSection({ data }: SectionProps) {
  const c = data.content;
  const purpose = data.collections.purpose ?? [];
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:px-8 md:grid-cols-2">
        <Reveal variant="left">
          <div className="relative mx-auto w-full max-w-md">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-50 shadow-xl ring-1 ring-black/5">
              <Image
                src={cmsText(c, "image", "/marketing/american_flag.png")}
                alt={cmsText(c, "imageAlt")}
                fill
                className="object-contain"
                sizes="(max-width:768px) 90vw, 440px"
              />
            </div>
            {cmsText(c, "badgeTop") && (
              <div className="absolute -bottom-6 right-4 rounded-2xl bg-[var(--trb-blue)] px-8 py-5 text-center text-white shadow-lg sm:right-0">
                <div className="text-xl font-bold leading-tight">{cmsText(c, "badgeTop")}</div>
                <div className="mt-0.5 text-sm text-white/80">{cmsText(c, "badgeBottom")}</div>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal variant="right">
          {cmsText(c, "eyebrow") && (
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
              {cmsText(c, "eyebrow")}
            </span>
          )}
          <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--trb-dark)] sm:text-4xl">
            {cmsText(c, "heading")}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600">{cmsText(c, "body")}</p>

          {purpose.length > 0 && (
            <>
              <h3 className="mt-8 flex items-center gap-2 text-lg font-bold text-[var(--trb-dark)]">
                <Search className="h-5 w-5 text-[var(--trb-blue)]" />
                {cmsText(c, "purposeHeading", "Purpose")}
              </h3>
              <ul className="mt-4 space-y-4">
                {purpose.map((p) => (
                  <li key={p.id} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <span className="text-sm leading-relaxed text-slate-600">{cmsText(p.data, "text")}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}

// About variant of the shared stats component: just the counters on a blue band.
export function StatsBandSection({ data }: SectionProps) {
  const stats = data.collections.stats ?? [];
  return (
    <section className="bg-[var(--trb-blue)]">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8">
        <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.id} delay={i * 80}>
              <CountUp
                target={cmsNum(s.data, "value")}
                prefix={cmsText(s.data, "prefix")}
                suffix={cmsText(s.data, "suffix")}
                decimals={cmsNum(s.data, "decimals")}
                className="block text-4xl font-extrabold text-white sm:text-5xl"
              />
              <div className="mt-1 text-sm text-white/70">{cmsText(s.data, "label")}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TabsSection({ data }: SectionProps) {
  const tabs: AboutTab[] = (data.collections.tabs ?? []).map((t) => ({
    label: cmsText(t.data, "label"),
    icon: cmsText(t.data, "icon"),
    accent: cmsText(t.data, "accent", "gold"),
    heading: cmsText(t.data, "heading"),
    items: cmsLines(t.data, "items"),
  }));
  if (tabs.length === 0) return null;
  return (
    <section className="bg-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-24">
        <AboutTabs tabs={tabs} />
      </div>
    </section>
  );
}

const STEP_RINGS: Record<string, string> = {
  blue: "bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]",
  emerald: "bg-emerald-100 text-emerald-600",
};

// Numbered redemption cards (about page).
export function RedemptionSection({ data }: SectionProps) {
  const c = data.content;
  const steps = data.collections.steps ?? [];
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
        <Reveal className="text-center">
          {cmsText(c, "eyebrow") && (
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
              {cmsText(c, "eyebrowIcon") && <CmsIcon name={cmsText(c, "eyebrowIcon")} className="h-4 w-4" />}
              {cmsText(c, "eyebrow")}
            </span>
          )}
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{cmsText(c, "heading")}</h2>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal key={step.id} delay={i * 100} className="h-full">
              <div className="relative h-full overflow-hidden rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm">
                <span className="pointer-events-none absolute right-3 top-0 select-none text-7xl font-black text-slate-100">
                  {i + 1}
                </span>
                <div
                  className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                    STEP_RINGS[cmsText(step.data, "accent", "blue")] ?? STEP_RINGS.blue
                  }`}
                >
                  <CmsIcon name={cmsText(step.data, "icon")} className="h-6 w-6" />
                </div>
                <h3 className="relative mt-5 text-lg font-bold text-[var(--trb-dark)]">
                  {cmsText(step.data, "title")}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-600">
                  {cmsText(step.data, "text")}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
