// CMS renderers for the home-page sections. Markup is a 1:1 extraction of the
// previously hardcoded app/(home)/page.tsx — only the strings/images now come
// from the CMS component data.
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Quote } from "lucide-react";

import { Reveal } from "@/components/home/reveal";
import { CountUp } from "@/components/home/count-up";
import { VideoPlayer } from "@/components/home/video-player";
import { FaqAccordion } from "@/components/home/faq-accordion";
import { TestimonialsCarousel } from "@/components/home/testimonials-carousel";
import { CmsIcon } from "@/lib/cms/icons";
import { cmsNum, cmsText } from "@/lib/cms/types";
import { getLatestNews, type NewsItem } from "@/lib/home/news";
import { AccentText } from "./accent-text";
import type { SectionProps } from "./section-props";

export function HeroSection({ data }: SectionProps) {
  const c = data.content;
  const badges = data.collections.badges ?? [];
  const steps = data.collections.steps ?? [];
  const videoSrc = cmsText(c, "videoSrc");
  return (
    <section className="relative isolate overflow-hidden bg-[var(--trb-dark)]">
      {videoSrc ? (
        <video
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
          autoPlay
          muted
          loop
          playsInline
          poster={cmsText(c, "posterImage") || undefined}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : null}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[var(--trb-dark)] via-[var(--trb-dark)]/85 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--trb-dark)] via-transparent to-[var(--trb-dark)]/40" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <span className="sparkle s1" />
        <span className="sparkle s2" />
        <span className="sparkle s3" />
        <span className="sparkle s4" />
        <span className="sparkle s5" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 pt-28 pb-16 sm:px-8">
        <div className="max-w-2xl">
          <h1 className="hero-headline text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
            {cmsText(c, "headline")}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            {cmsText(c, "subheadline")}
          </p>

          {badges.length > 0 && (
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium tracking-wide text-white/70">
              {badges.map((badge) => {
                const icon = cmsText(badge.data, "icon");
                return (
                  <span key={badge.id} className={icon ? "inline-flex items-center gap-1.5" : undefined}>
                    {icon && <CmsIcon name={icon} className="h-4 w-4 text-[var(--trb-gold)]" />}{" "}
                    <AccentText text={cmsText(badge.data, "text")} accentClassName="font-bold text-white" />
                  </span>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            {cmsText(c, "primaryCtaLabel") && (
              <Link
                href={cmsText(c, "primaryCtaHref", "/register")}
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[var(--trb-dark)] transition-colors hover:bg-[#e2e8f0]"
              >
                {cmsText(c, "primaryCtaLabel")} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {cmsText(c, "secondaryCtaLabel") && (
              <Link
                href={cmsText(c, "secondaryCtaHref", "/login")}
                className="inline-flex items-center rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {cmsText(c, "secondaryCtaLabel")}
              </Link>
            )}
          </div>
        </div>

        {steps.length > 0 && (
          <div className="mt-16 border-t border-[var(--trb-gold)]/60 pt-8">
            <div className="grid gap-8 sm:grid-cols-3">
              {steps.map((step) => (
                <div key={step.id} className="flex flex-col gap-2">
                  <CmsIcon name={cmsText(step.data, "icon")} className="h-7 w-7 text-[var(--trb-gold)]" />
                  <h3 className="text-base font-semibold text-white">{cmsText(step.data, "title")}</h3>
                  <p className="text-sm text-white/65">{cmsText(step.data, "text")}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function ImageMessageSection({ data }: SectionProps) {
  const c = data.content;
  const paragraphs = cmsText(c, "body").split(/\n{2,}/).filter(Boolean);
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:px-8 md:grid-cols-2">
        <Reveal variant="left" className="mx-auto w-full max-w-sm">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-100 shadow-xl">
            <Image
              src={cmsText(c, "image", "/marketing/american_flag.png")}
              alt={cmsText(c, "imageAlt")}
              fill
              className="object-contain"
              sizes="(max-width:768px) 90vw, 380px"
            />
          </div>
        </Reveal>
        <Reveal variant="right">
          <h2 style={{ fontFamily: "var(--font-playfair)" }} className="text-4xl italic leading-tight sm:text-5xl">
            {cmsText(c, "heading")}
          </h2>
          {paragraphs.map((p, i) => (
            <p key={i} className={`${i === 0 ? "mt-6" : "mt-4"} text-base leading-relaxed text-slate-600`}>
              {p}
            </p>
          ))}
          {cmsText(c, "signature") && (
            <p style={{ fontFamily: "var(--font-greatvibes)" }} className="mt-6 text-5xl text-[var(--trb-red)]">
              {cmsText(c, "signature")}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export function CashoutProcessHomeSection({ data }: SectionProps) {
  const steps = data.collections.steps ?? [];
  return (
    <section className="overflow-hidden bg-[var(--trb-dark)]">
      <div className="mx-auto max-w-[800px] px-6 py-24 sm:px-8">
        <Reveal>
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
            {cmsText(data.content, "heading")}
          </h2>
        </Reveal>
        <div className="process-list mt-16 flex flex-col gap-[60px]">
          {steps.map((step, i) => (
            <Reveal
              key={step.id}
              variant={i === 1 ? "right" : "left"}
              delay={i * 120}
              className={`process-card step-${i + 1} w-[85%]`}
            >
              <div className="flex items-center gap-6 rounded-xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)] sm:p-8">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--trb-blue)] text-[var(--trb-blue)]">
                  <CmsIcon name={cmsText(step.data, "icon")} className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--trb-dark)]">{cmsText(step.data, "title")}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{cmsText(step.data, "text")}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VideoMessageSection({ data }: SectionProps) {
  const c = data.content;
  return (
    <section className="bg-[var(--trb-dark)]">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            <AccentText text={cmsText(c, "heading")} accentClassName="text-[var(--trb-gold)]" />
          </h2>
          {cmsText(c, "subtext") && <p className="mt-3 text-sm text-white/60">{cmsText(c, "subtext")}</p>}
        </Reveal>
        <Reveal className="mt-10">
          <VideoPlayer src={cmsText(c, "videoSrc")} />
        </Reveal>
      </div>
    </section>
  );
}

// Home variant: quote card only (the features strip renders as its own section
// right after, so together they reproduce the original combined section).
export function DualQuoteSection({ data }: SectionProps) {
  const quotes = data.collections.quotes ?? [];
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto max-w-5xl px-6 pt-20 sm:px-8">
        <Reveal className="mx-auto max-w-3xl rounded-3xl border border-black/5 bg-slate-50 p-8 shadow-sm sm:p-10">
          <div className="space-y-6">
            {quotes.map((q) => (
              <div key={q.id} className="flex gap-4">
                <Quote className="h-6 w-6 shrink-0 fill-[var(--trb-red)] text-[var(--trb-red)]" />
                <p className="text-base italic leading-relaxed text-slate-700">{cmsText(q.data, "text")}</p>
              </div>
            ))}
          </div>
          {cmsText(data.content, "signature") && (
            <p style={{ fontFamily: "var(--font-greatvibes)" }} className="mt-6 text-right text-4xl text-[var(--trb-red)]">
              {cmsText(data.content, "signature")}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export function FeaturesStripSection({ data }: SectionProps) {
  const items = data.collections.items ?? [];
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto max-w-5xl px-6 pt-12 pb-20 sm:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((f, i) => (
            <Reveal
              key={f.id}
              delay={i * 80}
              className="flex items-center gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm"
            >
              <CmsIcon name={cmsText(f.data, "icon")} className="h-6 w-6 shrink-0 text-[var(--trb-blue)]" />
              <span className="font-semibold text-[var(--trb-dark)]">{cmsText(f.data, "label")}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeatureBannerSection({ data }: SectionProps) {
  const c = data.content;
  return (
    <section className="bg-[var(--trb-dark)] px-6 py-16 sm:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1024] to-[#0d1530]">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <Reveal variant="left" className="p-8 sm:p-12">
            {cmsText(c, "badge") && (
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-gold)]">
                {cmsText(c, "badge")}
              </span>
            )}
            <h2 className="mt-4 text-3xl font-bold leading-snug text-white sm:text-4xl">
              <AccentText text={cmsText(c, "heading")} accentClassName="text-[var(--trb-gold)]" />
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/70">{cmsText(c, "body")}</p>
            {cmsText(c, "ctaLabel") && (
              <Link
                href={cmsText(c, "ctaHref", "/register")}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--trb-gold)] px-7 py-3 text-sm font-bold text-[var(--trb-dark)] transition-colors hover:bg-[var(--trb-gold-2)]"
              >
                {cmsText(c, "ctaLabel")} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </Reveal>
          <Reveal variant="right" className="relative h-72 md:h-full md:min-h-[440px]">
            <Image
              src={cmsText(c, "image", "/marketing/trump_custom.jpg")}
              alt={cmsText(c, "imageAlt")}
              fill
              className="object-cover"
              sizes="(max-width:768px) 100vw, 600px"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function ProjectsHomeSection({ data }: SectionProps) {
  const c = data.content;
  const items = data.collections.items ?? [];
  return (
    <section className="bg-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
        <Reveal className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
            {cmsText(c, "heading")} <BadgeCheck className="h-6 w-6 text-[var(--trb-gold)]" />
          </h2>
          {cmsText(c, "seeAllLabel") && (
            <Link
              href={cmsText(c, "seeAllHref", "/product")}
              className="shrink-0 text-sm text-white/60 transition-colors hover:text-white"
            >
              {cmsText(c, "seeAllLabel")}
            </Link>
          )}
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <Reveal
              key={p.id}
              delay={i * 100}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-transform duration-300 hover:-translate-y-1.5"
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
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{cmsText(p.data, "title")}</h3>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <BadgeCheck className="h-4 w-4" /> {cmsText(c, "verifiedLabel", "Verified")}
                  </span>
                </div>
                <Link
                  href={cmsText(c, "cardCtaHref", "/register")}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[var(--trb-blue)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--trb-blue-2)]"
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

export function StatsBannerSection({ data }: SectionProps) {
  const c = data.content;
  const stats = data.collections.stats ?? [];
  const backgroundImage = cmsText(c, "backgroundImage");
  return (
    <section className="relative overflow-hidden bg-[var(--trb-dark)]">
      {backgroundImage && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/2 opacity-10">
          <Image src={backgroundImage} alt="" fill className="object-cover" sizes="50vw" />
        </div>
      )}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            {cmsText(c, "heading")}{" "}
            {cmsText(c, "headingAccent") && (
              <span style={{ fontFamily: "var(--font-greatvibes)" }} className="text-5xl text-[var(--trb-gold)]">
                {cmsText(c, "headingAccent")}
              </span>
            )}
          </h2>
          {cmsText(c, "body") && (
            <p className="mt-5 text-sm leading-relaxed text-white/70">{cmsText(c, "body")}</p>
          )}
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.id} delay={i * 80}>
              <CountUp
                target={cmsNum(s.data, "value")}
                prefix={cmsText(s.data, "prefix")}
                suffix={cmsText(s.data, "suffix")}
                decimals={cmsNum(s.data, "decimals")}
                className="block text-4xl font-extrabold text-[var(--trb-gold)]"
              />
              <div className="mt-1 text-sm text-white/60">{cmsText(s.data, "label")}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection({ data }: SectionProps) {
  const items = (data.collections.items ?? []).map((t) => ({
    name: cmsText(t.data, "name"),
    avatar: cmsText(t.data, "avatar") || undefined,
    quote: cmsText(t.data, "quote"),
  }));
  return (
    <section className="bg-slate-50 text-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
        <Reveal>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">{cmsText(data.content, "heading")}</h2>
        </Reveal>
        <TestimonialsCarousel items={items} />
      </div>
    </section>
  );
}

export async function BlogTeasersSection({ data }: SectionProps) {
  const c = data.content;
  // Real Trump/markets/investing headlines, merged from several feeds and cached
  // 5 min. Falls back to the CMS fallback cards if every source is unreachable.
  const news = await getLatestNews(3);
  const updates: NewsItem[] = news.length
    ? news
    : (data.collections.fallbacks ?? []).map((f) => ({
        id: "",
        title: cmsText(f.data, "title"),
        excerpt: cmsText(f.data, "excerpt"),
        category: cmsText(f.data, "category"),
        url: "",
        source: cmsText(c, "fallbackSource", "TRB Payout System"),
        image: "",
        publishedAt: 0,
        publishedLabel: "",
      }));
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
        <Reveal className="text-center">
          {cmsText(c, "badge") && (
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
              {cmsText(c, "badge")}
            </span>
          )}
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{cmsText(c, "heading")}</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {updates.map((item, i) => {
            const cardClass =
              "group flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1";
            const inner = (
              <>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/10] w-full bg-slate-100 object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[var(--trb-blue)] to-[var(--trb-blue-2)] px-4">
                    <span className="text-center text-lg font-bold text-white/80">TRB</span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--trb-blue)]">
                    <span>{item.category}</span>
                    {item.publishedLabel && (
                      <span className="font-medium normal-case text-slate-400">· {item.publishedLabel}</span>
                    )}
                  </div>
                  <h3 className="mt-2 font-bold leading-snug text-[var(--trb-dark)] transition-colors group-hover:text-[var(--trb-blue)]">
                    {item.title}
                  </h3>
                  {item.excerpt && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{item.excerpt}</p>
                  )}
                </div>
              </>
            );
            return (
              <Reveal key={item.id || item.title} delay={i * 100} className="h-full">
                {item.id ? (
                  <Link href={`/news/${item.id}`} className={cardClass}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cardClass}>{inner}</div>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ data }: SectionProps) {
  const c = data.content;
  const items = (data.collections.items ?? []).map((f) => ({
    q: cmsText(f.data, "question"),
    a: cmsText(f.data, "answer"),
  }));
  return (
    <section id="faq" className="bg-slate-50 text-[var(--trb-dark)]">
      <div className="mx-auto max-w-4xl px-6 py-20 sm:px-8">
        <Reveal className="text-center">
          {cmsText(c, "badge") && (
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">
              {cmsText(c, "badge")}
            </span>
          )}
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{cmsText(c, "heading")}</h2>
        </Reveal>
        <div className="mt-12">
          <FaqAccordion items={items} />
        </div>
      </div>
    </section>
  );
}
