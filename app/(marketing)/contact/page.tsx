import type { Metadata } from "next";
import Image from "next/image";
import { MapPin, Phone, Mail } from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { ContactForm } from "@/components/marketing/contact-form";
import { FAQ } from "@/components/marketing/content";
import { getMarketingConfig } from "@/lib/marketing/site-config";

export const metadata: Metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const config = await getMarketingConfig();
  return (
    <main>
      {/* ================= HERO ================= */}
      <section className="bg-slate-50 text-[var(--trb-dark)]">
        <div className="mx-auto max-w-3xl px-6 pt-36 pb-16 text-center sm:px-8">
          <Reveal>
            <h1
              style={{ fontFamily: "var(--font-playfair)" }}
              className="text-5xl italic leading-tight text-[var(--trb-blue)] sm:text-6xl"
            >
              Get In Touch
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Have questions about your TRB products or the redemption process?
              We are here to help. Reach out to our dedicated support team today.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ================= CONTACT BLOCK ================= */}
      <section className="bg-slate-50 text-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 pb-24 sm:px-8">
          <Reveal className="grid gap-8 lg:grid-cols-2">
            {/* LEFT — photo + info cards */}
            <div className="space-y-6">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-lg">
                <Image
                  src="/marketing/customer_care_rep_2.png"
                  alt="TRB Payout System customer care representative"
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 560px"
                />
              </div>

              {/* Address */}
              {config.addressLines.length > 0 && (
                <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--trb-dark)]">Address</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {config.addressLines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              )}

              {/* Phone */}
              {config.supportPhone && (
                <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--trb-dark)]">Phone</h3>
                    <a
                      href={config.phoneHref}
                      className="mt-1 inline-block text-sm text-slate-600 transition-colors hover:text-[var(--trb-blue)]"
                    >
                      {config.supportPhone}
                    </a>
                  </div>
                </div>
              )}

              {/* Email */}
              {config.supportEmail && (
                <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--trb-dark)]">Email</h3>
                    <a
                      href={config.emailHref}
                      className="mt-1 inline-block text-sm text-slate-600 transition-colors hover:text-[var(--trb-blue)]"
                    >
                      {config.supportEmail}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — message form */}
            <div className="rounded-2xl bg-white p-8 shadow-sm sm:p-10">
              <h2 className="text-2xl font-bold text-[var(--trb-dark)] sm:text-3xl">
                Send Us a Message
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Fill out the form below and our team will get back to you as soon
                as possible.
              </p>
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="bg-slate-50 text-[var(--trb-dark)]">
        <div className="mx-auto max-w-4xl px-6 py-20 sm:px-8">
          <Reveal className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
              Frequently Asked Questions
            </span>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              Have Any Questions For Us?
            </h2>
          </Reveal>
          <div className="mt-12">
            <FaqAccordion items={FAQ} />
          </div>
        </div>
      </section>
    </main>
  );
}
