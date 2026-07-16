import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, HelpCircle, MessageCircle, ArrowRight } from "lucide-react";

import { Reveal } from "@/components/home/reveal";
import { PageHero } from "@/components/home/primitives/page-hero";
import { getMarketingConfig } from "@/lib/home/site-config";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const config = await getMarketingConfig();
  const SUPPORT_CARDS = [
    ...(config.supportPhone
      ? [
          {
            icon: Phone,
            title: "Call Support",
            text: "Speak directly with our verification team. We're available around the clock to help with your account and payouts.",
            linkLabel: config.supportPhone,
            href: config.phoneHref,
          },
        ]
      : []),
    ...(config.supportEmail
      ? [
          {
            icon: Mail,
            title: "Email Us",
            text: "Send us your questions any time and our team will respond promptly with the guidance you need.",
            linkLabel: config.supportEmail,
            href: config.emailHref,
          },
        ]
      : []),
    {
      icon: HelpCircle,
      title: "Visit the FAQ",
      text: "Find quick answers to the most common questions about verifying and redeeming your TRB products.",
      linkLabel: "Browse FAQ",
      href: "/#faq",
    },
  ];
  return (
    <main>
      <PageHero title="Support" breadcrumb="Support" variant="dark" />

      <section className="bg-white text-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
          {/* Intro */}
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
              We&apos;re Here to Help
            </span>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">How can we support you?</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Whether you need help creating your portal access, verifying a TRB product, or checking
              the status of a request, our support team is ready 24/7. Choose the option that works
              best for you.
            </p>
          </Reveal>

          {/* Support cards */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORT_CARDS.map(({ icon: Icon, title, text, linkLabel, href }, i) => (
              <Reveal key={title} delay={i * 100} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-black/5 bg-white p-8 shadow-sm transition-transform duration-300 hover:-translate-y-1.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-[var(--trb-dark)]">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{text}</p>
                  <Link
                    href={href}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:text-[var(--trb-blue-2)]"
                  >
                    {linkLabel} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Still need help / contact form */}
          <Reveal className="mt-14">
            <div className="flex flex-col items-center gap-6 rounded-3xl border border-black/5 bg-slate-50 p-10 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
                <MessageCircle className="h-7 w-7" />
              </div>
              <div className="sm:mr-auto">
                <h3 className="text-lg font-bold text-[var(--trb-dark)]">Prefer to send a message?</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Reach out through our contact form and we&apos;ll get back to you as soon as
                  possible.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--trb-blue)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--trb-blue-2)]"
              >
                Contact Us <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          {/* Account CTAs */}
          <Reveal className="mt-8">
            <div className="flex flex-wrap items-center justify-center gap-4 border-t border-black/5 pt-10 text-center">
              <p className="w-full text-sm text-slate-600 sm:w-auto sm:text-left">
                New here, or ready to pick up where you left off?
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--trb-gold)] px-6 py-3 text-sm font-bold text-[var(--trb-dark)] transition-colors hover:bg-[var(--trb-gold-2)]"
              >
                Register Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-[var(--trb-blue)]/30 px-6 py-3 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:bg-[var(--trb-blue)]/5"
              >
                Login
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
