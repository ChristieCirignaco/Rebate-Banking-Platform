// CMS renderers for the contact / product / service / help / privacy sections,
// plus standalone generic variants used on admin-created pages. Markup is a 1:1
// extraction of the previously hardcoded pages.
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Phone, Mail, MessageCircle } from "lucide-react";

import { Reveal } from "@/components/home/reveal";
import { ContactForm } from "@/components/home/contact-form";
import { CmsIcon } from "@/lib/cms/icons";
import { cmsText, type CmsItem } from "@/lib/cms/types";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { SectionProps } from "./section-props";

// ------------------------------ contact ------------------------------

export function SimpleHeroSection({ data }: SectionProps) {
  const c = data.content;
  return (
    <section className="bg-[var(--trb-dark)]">
      <div className="mx-auto max-w-3xl px-6 pt-40 pb-20 text-center sm:px-8">
        <Reveal>
          <h1
            style={{ fontFamily: "var(--font-playfair)" }}
            className="text-5xl italic leading-tight text-white sm:text-6xl"
          >
            {cmsText(c, "heading")}
          </h1>
          {cmsText(c, "subtext") && (
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              {cmsText(c, "subtext")}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export function ContactBlockSection({ data, config }: SectionProps) {
  const c = data.content;
  return (
    <section className="bg-slate-50 text-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 pb-24 sm:px-8">
        <Reveal className="grid gap-8 lg:grid-cols-2">
          {/* LEFT — photo + info cards */}
          <div className="space-y-6">
            {cmsText(c, "image") && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-lg">
                <Image
                  src={cmsText(c, "image")}
                  alt={cmsText(c, "imageAlt")}
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 560px"
                />
              </div>
            )}

            {/* Address */}
            {config.addressLines.length > 0 && (
              <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--trb-dark)]">{cmsText(c, "addressLabel", "Address")}</h3>
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
                  <h3 className="font-bold text-[var(--trb-dark)]">{cmsText(c, "phoneLabel", "Phone")}</h3>
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
                  <h3 className="font-bold text-[var(--trb-dark)]">{cmsText(c, "emailLabel", "Email")}</h3>
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
              {cmsText(c, "formHeading", "Send Us a Message")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{cmsText(c, "formSubtext")}</p>
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------ product / service intros ------------------------------

function DarkIntro({ data, paddingBottom }: { data: SectionProps["data"]; paddingBottom: string }) {
  const c = data.content;
  return (
    <section className="bg-[var(--trb-dark)]">
      <div className={`mx-auto max-w-3xl px-6 ${paddingBottom} text-center sm:px-8`}>
        <Reveal>
          {cmsText(c, "eyebrow") && (
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-gold)]">
              {cmsText(c, "eyebrow")}
            </span>
          )}
          <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
            {cmsText(c, "heading")}
          </h2>
          {cmsText(c, "body") && (
            <p className="mt-5 text-base leading-relaxed text-white/70">{cmsText(c, "body")}</p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export function ProductIntroSection({ data }: SectionProps) {
  return <DarkIntro data={data} paddingBottom="pb-16" />;
}

export function ServiceIntroSection({ data }: SectionProps) {
  return <DarkIntro data={data} paddingBottom="pb-20" />;
}

// Generic intro for admin-created pages (needs its own vertical padding).
export function GenericIntroSection({ data }: SectionProps) {
  return <DarkIntro data={data} paddingBottom="py-16" />;
}

// ------------------------------ product grid ------------------------------

export function ProjectsGridSection({ data }: SectionProps) {
  const c = data.content;
  const items = data.collections.items ?? [];
  return (
    <section className="bg-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 pb-24 sm:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <Reveal
              key={p.id}
              delay={i * 100}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-transform duration-300 hover:-translate-y-1.5"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={cmsText(p.data, "image")}
                  alt={cmsText(p.data, "title")}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width:768px) 100vw, 380px"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">{cmsText(p.data, "title")}</h3>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <CmsIcon name="badge-check" className="h-4 w-4" /> {cmsText(c, "verifiedLabel", "Verified")}
                  </span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65">
                  {cmsText(p.data, "description")}
                </p>
                <Link
                  href={cmsText(c, "cardCtaHref", "/register")}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[var(--trb-blue)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--trb-blue-2)]"
                >
                  {cmsText(c, "cardCtaLabel", "Grab The Opportunity")}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------ service ------------------------------

export function StepsCardsSection({ data }: SectionProps) {
  const c = data.content;
  const steps = data.collections.steps ?? [];
  return (
    <section className="bg-slate-50 text-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:px-8">
        <Reveal className="text-center">
          {cmsText(c, "eyebrow") && (
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
              {cmsText(c, "eyebrow")}
            </span>
          )}
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{cmsText(c, "heading")}</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.id} delay={i * 100} className="h-full">
              <div className="flex h-full flex-col rounded-2xl border border-black/5 bg-white p-7 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
                  <CmsIcon name={cmsText(s.data, "icon")} className="h-6 w-6" />
                </div>
                <div className="mt-3 text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
                  Step {i + 1}
                </div>
                <h3 className="mt-1 text-lg font-bold text-[var(--trb-dark)]">{cmsText(s.data, "title")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{cmsText(s.data, "text")}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeatureCardsSection({ data }: SectionProps) {
  const c = data.content;
  const items = data.collections.items ?? [];
  return (
    <section className="bg-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:px-8">
        <Reveal className="text-center">
          {cmsText(c, "eyebrow") && (
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-gold)]">
              {cmsText(c, "eyebrow")}
            </span>
          )}
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{cmsText(c, "heading")}</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((f, i) => (
            <Reveal key={f.id} delay={i * 80} className="h-full">
              <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-7 transition-transform duration-300 hover:-translate-y-1.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--trb-gold)]/10 text-[var(--trb-gold)]">
                  <CmsIcon name={cmsText(f.data, "icon")} className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-white">{cmsText(f.data, "label")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{cmsText(f.data, "blurb")}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBandSection({ data }: SectionProps) {
  const c = data.content;
  return (
    <section className="bg-[var(--trb-blue)]">
      <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">{cmsText(c, "heading")}</h2>
          {cmsText(c, "body") && (
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/80">
              {cmsText(c, "body")}
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {cmsText(c, "primaryCtaLabel") && (
              <Link
                href={cmsText(c, "primaryCtaHref", "/register")}
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:bg-[#e2e8f0]"
              >
                {cmsText(c, "primaryCtaLabel")} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {cmsText(c, "secondaryCtaLabel") && (
              <Link
                href={cmsText(c, "secondaryCtaHref", "/login")}
                className="inline-flex items-center rounded-full border border-white/40 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {cmsText(c, "secondaryCtaLabel")}
              </Link>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------ help (inner blocks) ------------------------------
// The help page renders these inside its own white section container.

export function HelpIntroBlock({ data }: SectionProps) {
  const c = data.content;
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      {cmsText(c, "eyebrow") && (
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
          {cmsText(c, "eyebrow")}
        </span>
      )}
      <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{cmsText(c, "heading")}</h2>
      {cmsText(c, "body") && (
        <p className="mt-4 text-base leading-relaxed text-slate-600">{cmsText(c, "body")}</p>
      )}
    </Reveal>
  );
}

export function SupportCardsBlock({ data, config }: SectionProps) {
  const cards = (data.collections.items ?? [])
    .map((item) => {
      const kind = cmsText(item.data, "kind", "link");
      if (kind === "phone") {
        if (!config.supportPhone) return null;
        return { item, linkLabel: config.supportPhone, href: config.phoneHref };
      }
      if (kind === "email") {
        if (!config.supportEmail) return null;
        return { item, linkLabel: config.supportEmail, href: config.emailHref };
      }
      return { item, linkLabel: cmsText(item.data, "linkLabel"), href: cmsText(item.data, "href", "#") };
    })
    .filter((c2): c2 is { item: CmsItem; linkLabel: string; href: string } => Boolean(c2));
  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ item, linkLabel, href }, i) => (
        <Reveal key={item.id} delay={i * 100} className="h-full">
          <div className="flex h-full flex-col rounded-2xl border border-black/5 bg-white p-8 shadow-sm transition-transform duration-300 hover:-translate-y-1.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
              <CmsIcon name={cmsText(item.data, "icon")} className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-lg font-bold text-[var(--trb-dark)]">{cmsText(item.data, "title")}</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{cmsText(item.data, "text")}</p>
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
  );
}

export function ContactBannerBlock({ data }: SectionProps) {
  const c = data.content;
  return (
    <Reveal className="mt-14">
      <div className="flex flex-col items-center gap-6 rounded-3xl border border-black/5 bg-slate-50 p-10 text-center sm:flex-row sm:text-left">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
          <MessageCircle className="h-7 w-7" />
        </div>
        <div className="sm:mr-auto">
          <h3 className="text-lg font-bold text-[var(--trb-dark)]">{cmsText(c, "heading")}</h3>
          {cmsText(c, "body") && (
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{cmsText(c, "body")}</p>
          )}
        </div>
        <Link
          href={cmsText(c, "ctaHref", "/contact")}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--trb-blue)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--trb-blue-2)]"
        >
          {cmsText(c, "ctaLabel", "Contact Us")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Reveal>
  );
}

export function AccountCtaBlock({ data }: SectionProps) {
  const c = data.content;
  return (
    <Reveal className="mt-8">
      <div className="flex flex-wrap items-center justify-center gap-4 border-t border-black/5 pt-10 text-center">
        <p className="w-full text-sm text-slate-600 sm:w-auto sm:text-left">{cmsText(c, "lead")}</p>
        {cmsText(c, "primaryCtaLabel") && (
          <Link
            href={cmsText(c, "primaryCtaHref", "/register")}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--trb-gold)] px-6 py-3 text-sm font-bold text-[var(--trb-dark)] transition-colors hover:bg-[var(--trb-gold-2)]"
          >
            {cmsText(c, "primaryCtaLabel")} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        {cmsText(c, "secondaryCtaLabel") && (
          <Link
            href={cmsText(c, "secondaryCtaHref", "/login")}
            className="inline-flex items-center rounded-full border border-[var(--trb-blue)]/30 px-6 py-3 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:bg-[var(--trb-blue)]/5"
          >
            {cmsText(c, "secondaryCtaLabel")}
          </Link>
        )}
      </div>
    </Reveal>
  );
}

// ------------------------------ privacy (inner blocks) ------------------------------
// The privacy page renders these inside its own max-w-3xl container.

export function RichTextBlock({ data }: SectionProps) {
  const c = data.content;
  return (
    <Reveal>
      {cmsText(c, "lastUpdated") && (
        <p className="text-sm font-medium text-slate-500">{cmsText(c, "lastUpdated")}</p>
      )}
      <div
        className="cms-prose mt-8"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(cmsText(c, "body")) }}
      />
    </Reveal>
  );
}

export function PolicyContactBlock({ data, config }: SectionProps) {
  const c = data.content;
  return (
    <Reveal className="mt-10 text-[15px] leading-[1.85] text-slate-600">
      <h2 className="text-2xl font-bold text-[var(--trb-blue)]">{cmsText(c, "heading")}</h2>
      {cmsText(c, "body") && <p className="mt-4">{cmsText(c, "body")}</p>}
      <ul className="mt-4 space-y-2">
        {config.supportPhone && (
          <li>
            {cmsText(c, "phonePrefix", "Phone:")}{" "}
            <a href={config.phoneHref} className="font-semibold text-[var(--trb-blue)] hover:underline">
              {config.supportPhone}
            </a>
          </li>
        )}
        {config.supportEmail && (
          <li>
            {cmsText(c, "emailPrefix", "Email:")}{" "}
            <a href={config.emailHref} className="font-semibold text-[var(--trb-blue)] hover:underline">
              {config.supportEmail}
            </a>
          </li>
        )}
        {config.address && (
          <li>
            {cmsText(c, "postPrefix", "Post:")} {config.address}
          </li>
        )}
      </ul>
    </Reveal>
  );
}

export function InlineCtaBlock({ data }: SectionProps) {
  const c = data.content;
  return (
    <Reveal className="mt-14 flex flex-wrap items-center gap-4 rounded-2xl border border-black/5 bg-slate-50 p-8">
      <div className="mr-auto">
        <h3 className="text-lg font-bold text-[var(--trb-dark)]">{cmsText(c, "heading")}</h3>
        {cmsText(c, "body") && <p className="mt-1 text-sm text-slate-600">{cmsText(c, "body")}</p>}
      </div>
      {cmsText(c, "primaryCtaLabel") && (
        <Link
          href={cmsText(c, "primaryCtaHref", "/register")}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--trb-blue)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--trb-blue-2)]"
        >
          {cmsText(c, "primaryCtaLabel")} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
      {cmsText(c, "secondaryCtaLabel") && (
        <Link
          href={cmsText(c, "secondaryCtaHref", "/login")}
          className="inline-flex items-center rounded-full border border-[var(--trb-blue)]/30 px-6 py-3 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:bg-[var(--trb-blue)]/5"
        >
          {cmsText(c, "secondaryCtaLabel")}
        </Link>
      )}
    </Reveal>
  );
}

// ------------------------------ standalone wrappers for custom pages ------------------------------

function WhiteSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">{children}</div>
    </section>
  );
}

export function HelpIntroStandalone(props: SectionProps) {
  return (
    <WhiteSection>
      <HelpIntroBlock {...props} />
    </WhiteSection>
  );
}

export function SupportCardsStandalone(props: SectionProps) {
  return (
    <WhiteSection>
      <SupportCardsBlock {...props} />
    </WhiteSection>
  );
}

export function ContactBannerStandalone(props: SectionProps) {
  return (
    <WhiteSection>
      <ContactBannerBlock {...props} />
    </WhiteSection>
  );
}

export function AccountCtaStandalone(props: SectionProps) {
  return (
    <WhiteSection>
      <AccountCtaBlock {...props} />
    </WhiteSection>
  );
}

export function RichTextStandalone(props: SectionProps) {
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
        <RichTextBlock {...props} />
      </div>
    </section>
  );
}

export function PolicyContactStandalone(props: SectionProps) {
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
        <PolicyContactBlock {...props} />
      </div>
    </section>
  );
}

export function InlineCtaStandalone(props: SectionProps) {
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
        <InlineCtaBlock {...props} />
      </div>
    </section>
  );
}
