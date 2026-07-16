import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";

import { Reveal } from "@/components/home/reveal";
import { PageHero } from "@/components/home/primitives/page-hero";
import { PROJECTS } from "@/components/home/content";

export const metadata: Metadata = { title: "Product" };

// 1–2 sentence, on-brand description per verified product, keyed by title.
const PRODUCT_COPY: Record<string, string> = {
  "Golden TRB Check":
    "A verified golden certificate redeemable for its full rebate value once your holding is confirmed.",
  "Gold TRB Coin":
    "A collectible gold-finish coin recognized as a verified TRB asset that is eligible for payout.",
  "Freedom Rebate Card":
    "The membership card that unlocks your rebate credits and grants priority verification.",
};

export default async function ProductPage() {
  return (
    <main>
      {/* ================= HERO ================= */}
      <PageHero title="Product" breadcrumb="Product" variant="dark" />

      {/* ================= INTRO ================= */}
      <section className="bg-[var(--trb-dark)]">
        <div className="mx-auto max-w-3xl px-6 pb-16 text-center sm:px-8">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-gold)]">
              The Collection
            </span>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
              TRB Verified Products
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/70">
              Every item in the TRB collection is more than memorabilia — it is a verified asset that
              carries real rebate value. Explore the products below, confirm your holding, and grab
              the opportunity to cash out.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ================= PRODUCTS GRID ================= */}
      <section className="bg-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 pb-24 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((p, i) => (
              <Reveal
                key={p.title}
                delay={i * 100}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-transform duration-300 hover:-translate-y-1.5"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width:768px) 100vw, 380px"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-white">{p.title}</h3>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <BadgeCheck className="h-4 w-4" /> Verified
                    </span>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65">
                    {PRODUCT_COPY[p.title]}
                  </p>
                  <Link
                    href="/register"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[var(--trb-blue)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--trb-blue-2)]"
                  >
                    Grab The Opportunity
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA BAND ================= */}
      <section className="bg-[var(--trb-blue)]">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:px-8">
          <Reveal>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Turn Your Product Into Value
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/80">
              Register now to verify your TRB products and unlock your rebate — every item you hold is
              ready to be claimed.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:bg-[#e2e8f0]"
              >
                Grab The Opportunity <ArrowRight className="h-4 w-4" />
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
