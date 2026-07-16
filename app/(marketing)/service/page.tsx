import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  DollarSign,
  Upload,
  Banknote,
  ShieldCheck,
  BadgeCheck,
  Headphones,
  Zap,
} from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";
import { PageHero } from "@/components/marketing/primitives/page-hero";
import { CASHOUT_STEPS, FEATURES } from "@/components/marketing/content";

export const metadata: Metadata = { title: "Service" };

const CASHOUT_ICONS = [DollarSign, Upload, Banknote];
const FEATURE_ICONS = [ShieldCheck, BadgeCheck, Headphones, Zap];

// On-brand supporting copy for each FEATURE — consistent with the site's existing
// tone; adds no new government/endorsement claims beyond what the site already states.
const FEATURE_BLURBS: Record<string, string> = {
  "Backup By Trump":
    "Part of the Trump Rebate Banking initiative that celebrates patriotism and financial confidence.",
  "Your Product Has Value":
    "What you hold is more than memorabilia — it carries real, verifiable rebate value.",
  "Great Support System":
    "Our team guides you through every step, from registration to final payout, around the clock.",
  "Fast Withdrawal":
    "Once your product is verified, funds are released quickly to your preferred bank account.",
};

export default async function ServicePage() {
  return (
    <main>
      {/* ================= HERO ================= */}
      <PageHero title="Service" breadcrumb="Service" variant="dark" />

      {/* ================= INTRO ================= */}
      <section className="bg-[var(--trb-dark)]">
        <div className="mx-auto max-w-3xl px-6 pb-20 text-center sm:px-8">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-gold)]">
              Verification &amp; Payout
            </span>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
              A Trusted Service For Every TRB Holder
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/70">
              Our service exists to verify your TRB products and release their value to you. Register
              your item, let our authorized compliance team confirm your eligibility, and cash out
              directly to your bank with a secure, bank-grade encrypted transfer — all from one
              streamlined portal.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ================= THE CASH-OUT PROCESS ================= */}
      <section className="bg-slate-50 text-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:px-8">
          <Reveal className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
              How It Works
            </span>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">The Cash-Out Process</h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {CASHOUT_STEPS.map((s, i) => {
              const Icon = CASHOUT_ICONS[i];
              return (
                <Reveal key={s.title} delay={i * 100} className="h-full">
                  <div className="flex h-full flex-col rounded-2xl border border-black/5 bg-white p-7 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
                      Step {i + 1}
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-[var(--trb-dark)]">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= WHY CHOOSE US ================= */}
      <section className="bg-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:px-8">
          <Reveal className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-gold)]">
              Why Choose Us
            </span>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Built For Patriots, Trusted For Payouts
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <Reveal key={f} delay={i * 80} className="h-full">
                  <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-7 transition-transform duration-300 hover:-translate-y-1.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--trb-gold)]/10 text-[var(--trb-gold)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-semibold text-white">{f}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">
                      {FEATURE_BLURBS[f]}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= CTA BAND ================= */}
      <section className="bg-[var(--trb-blue)]">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:px-8">
          <Reveal>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready To Claim What&apos;s Yours?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/80">
              Register today and let our team verify your TRB products so you can cash out with
              confidence.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:bg-[#e2e8f0]"
              >
                Register Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-white/40 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Login Now
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
