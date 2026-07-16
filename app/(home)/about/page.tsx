import type { Metadata } from "next";
import Image from "next/image";
import {
  Search,
  CheckCircle2,
  UserPlus,
  Upload,
  BadgeCheck,
  Banknote,
  Flag,
  type LucideIcon,
} from "lucide-react";

import { Reveal } from "@/components/home/reveal";
import { CountUp } from "@/components/home/count-up";
import { PageHero } from "@/components/home/primitives/page-hero";
import { AboutTabs } from "@/components/home/about-tabs";
import { STATS_ABOUT } from "@/components/home/content";

export const metadata: Metadata = { title: "About Us" };

const PURPOSE = [
  "To reward eligible Americans for their contributions to the economy, military service, or loyalty.",
  "To return value to citizens in the form of rebate credits, redeemable through participating banks.",
  "To create a parallel incentive system encouraging the purchase of American goods and services.",
];

const REDEMPTION: {
  icon: LucideIcon;
  title: string;
  text: string;
  ring: string;
}[] = [
  {
    icon: UserPlus,
    title: "Register",
    text: "Create your secure account and verify your identity on our platform.",
    ring: "bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]",
  },
  {
    icon: Upload,
    title: "Upload Product",
    text: "Securely upload details of your eligible TRB products or actions.",
    ring: "bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]",
  },
  {
    icon: BadgeCheck,
    title: "Product Gets Verified",
    text: "Our team validates your submission through federal channels.",
    ring: "bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]",
  },
  {
    icon: Banknote,
    title: "Get Paid",
    text: "Receive your TRBS credits or direct payout to your connected bank.",
    ring: "bg-emerald-100 text-emerald-600",
  },
];

export default async function AboutPage() {
  return (
    <main>
      {/* ================= HERO ================= */}
      <PageHero title="About Us" breadcrumb="About Us" variant="dark" />

      {/* ================= INTRO ================= */}
      <section className="bg-white text-[var(--trb-dark)]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:px-8 md:grid-cols-2">
          <Reveal variant="left">
            <div className="relative mx-auto w-full max-w-md">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-50 shadow-xl ring-1 ring-black/5">
                <Image
                  src="/marketing/american_flag.png"
                  alt="Framed American flag"
                  fill
                  className="object-contain"
                  sizes="(max-width:768px) 90vw, 440px"
                />
              </div>
              <div className="absolute -bottom-6 right-4 rounded-2xl bg-[var(--trb-blue)] px-8 py-5 text-center text-white shadow-lg sm:right-0">
                <div className="text-xl font-bold leading-tight">Federally</div>
                <div className="mt-0.5 text-sm text-white/80">Supported</div>
              </div>
            </div>
          </Reveal>

          <Reveal variant="right">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
              Trump Rebate Banking System
            </span>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--trb-dark)] sm:text-4xl">
              The Trump Rebate Banking System (TRBS)
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              A federally supported economic initiative launched by President Donald J. Trump to
              stimulate consumer spending, reward patriotism, and promote financial sovereignty among
              American citizens.
            </p>

            <h3 className="mt-8 flex items-center gap-2 text-lg font-bold text-[var(--trb-dark)]">
              <Search className="h-5 w-5 text-[var(--trb-blue)]" />
              Purpose
            </h3>
            <ul className="mt-4 space-y-4">
              {PURPOSE.map((p) => (
                <li key={p} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <span className="text-sm leading-relaxed text-slate-600">{p}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ================= STATS BAND ================= */}
      <section className="bg-[var(--trb-blue)]">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8">
          <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            {STATS_ABOUT.map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <CountUp
                  target={s.target}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  decimals={s.decimals}
                  className="block text-4xl font-extrabold text-white sm:text-5xl"
                />
                <div className="mt-1 text-sm text-white/70">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS (TABS) ================= */}
      <section className="bg-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-24">
          <AboutTabs />
        </div>
      </section>

      {/* ================= REDEMPTION PROCESS ================= */}
      <section className="bg-white text-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
              <Flag className="h-4 w-4" />
              Final Thought
            </span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">The TRBS Redemption Process</h2>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {REDEMPTION.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={i * 100} className="h-full">
                  <div className="relative h-full overflow-hidden rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm">
                    <span className="pointer-events-none absolute right-3 top-0 select-none text-7xl font-black text-slate-100">
                      {i + 1}
                    </span>
                    <div
                      className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-full ${step.ring}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="relative mt-5 text-lg font-bold text-[var(--trb-dark)]">
                      {step.title}
                    </h3>
                    <p className="relative mt-2 text-sm leading-relaxed text-slate-600">
                      {step.text}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
