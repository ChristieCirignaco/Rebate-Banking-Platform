import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  IdCard,
  Upload,
  Banknote,
  ShieldCheck,
  DollarSign,
  BadgeCheck,
  Headphones,
  Zap,
  Quote,
  Star,
} from "lucide-react";

import { Reveal } from "@/components/home/reveal";
import { VideoPlayer } from "@/components/home/video-player";
import { FaqAccordion } from "@/components/home/faq-accordion";
import {
  CASHOUT_STEPS,
  FEATURES,
  TRUMP_MESSAGE_QUOTES,
  PROJECTS,
  STATS_HOME,
  TESTIMONIALS,
  BLOG,
  FAQ,
} from "@/components/home/content";
import { getLatestNews, type NewsItem } from "@/lib/home/news";

const HERO_STEPS = [
  { icon: IdCard, title: "Register Account", text: "Create your portal access and set up your secure profile" },
  { icon: Upload, title: "Upload & Verify", text: "Submit your physical or digital products for system review" },
  { icon: Banknote, title: "Cash Out & Get Paid", text: "Withdraw your verified funds directly to your preferred account" },
];

const CASHOUT_ICONS = [DollarSign, Upload, Banknote];
const FEATURE_ICONS = [ShieldCheck, BadgeCheck, Headphones, Zap];
const CASHOUT_OFFSET = ["md:mr-auto", "md:mx-auto", "md:ml-auto"];

export default async function Home() {
  // Real Trump/markets/investing headlines, merged from several feeds and cached 5 min.
  // Falls back to the static cards if every source is unreachable.
  const news = await getLatestNews(6);
  const updates: NewsItem[] = news.length
    ? news
    : BLOG.map((b) => ({
        title: b.title,
        excerpt: b.excerpt,
        category: b.category,
        url: "",
        source: "TRB Payout System",
        publishedAt: 0,
        publishedLabel: "",
      }));
  return (
    <main>
      {/* ================= HERO ================= */}
      <section className="relative isolate overflow-hidden bg-[var(--trb-dark)]">
        <video
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
          autoPlay
          muted
          loop
          playsInline
          poster="/marketing/american_flag.png"
        >
          <source src="/marketing/hero-bg.mp4" type="video/mp4" />
        </video>
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
              The Wait Is Over. Your Product Is Money
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              You didn&apos;t just collect a mere memorabilia. You claimed a symbol of value.
              Every TRB product you hold represents patriotism, legacy, and potential wealth.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium tracking-wide text-white/70">
              <span><span className="font-bold text-white">SECURE</span> payout</span>
              <span><span className="font-bold text-white">TRB</span> SYSTEM</span>
              <span><span className="font-bold text-white">USA</span> TREASURY</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[var(--trb-gold)]" /> PATRIOT
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[var(--trb-dark)] transition-colors hover:bg-[#e2e8f0]"
              >
                Register Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Login Now
              </Link>
            </div>
          </div>

          <div className="mt-16 border-t border-[var(--trb-gold)]/60 pt-8">
            <div className="grid gap-8 sm:grid-cols-3">
              {HERO_STEPS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex flex-col gap-2">
                  <Icon className="h-7 w-7 text-[var(--trb-gold)]" />
                  <h3 className="text-base font-semibold text-white">{title}</h3>
                  <p className="text-sm text-white/65">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= THANK YOU QUOTE ================= */}
      <section className="bg-white text-[var(--trb-dark)]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:px-8 md:grid-cols-2">
          <Reveal variant="left" className="mx-auto w-full max-w-sm">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-100 shadow-xl">
              <Image src="/marketing/american_flag.png" alt="Framed American flag" fill className="object-contain" sizes="(max-width:768px) 90vw, 380px" />
            </div>
          </Reveal>
          <Reveal variant="right">
            <h2 style={{ fontFamily: "var(--font-playfair)" }} className="text-4xl italic leading-tight sm:text-5xl">
              Thank you for trusting me.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-slate-600">
              The Trump Rebate Banking System (TRBS) is a federally supported economic initiative
              launched by President Donald J. Trump to stimulate consumer spending, reward
              patriotism, and promote financial sovereignty among American citizens.
            </p>
            <p style={{ fontFamily: "var(--font-greatvibes)" }} className="mt-6 text-5xl text-[var(--trb-red)]">
              Donald J. Trump
            </p>
          </Reveal>
        </div>
      </section>

      {/* ================= CASH-OUT PROCESS ================= */}
      <section className="bg-[var(--trb-dark)]">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:px-8">
          <Reveal>
            <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">The Cash-Out Process</h2>
          </Reveal>
          <div className="mt-14 space-y-6">
            {CASHOUT_STEPS.map((s, i) => {
              const Icon = CASHOUT_ICONS[i];
              return (
                <Reveal key={s.title} delay={i * 100} className={`md:max-w-xl ${CASHOUT_OFFSET[i]}`}>
                  <div className="flex gap-5 rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--trb-blue)]/10 text-[var(--trb-blue)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--trb-dark)]">{s.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= VIDEO MESSAGE ================= */}
      <section className="bg-[var(--trb-dark)]">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-8">
          <Reveal>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              A Message From <span className="text-[var(--trb-gold)]">Donald J. Trump</span>
            </h2>
            <p className="mt-3 text-sm text-white/60">Click the video to watch the full clip</p>
          </Reveal>
          <Reveal className="mt-10">
            <VideoPlayer src="/marketing/trumpvid.mp4" />
          </Reveal>
        </div>
      </section>

      {/* ================= DUAL QUOTE + FEATURES ================= */}
      <section className="bg-white text-[var(--trb-dark)]">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:px-8">
          <Reveal className="mx-auto max-w-3xl rounded-3xl border border-black/5 bg-slate-50 p-8 shadow-sm sm:p-10">
            <div className="space-y-6">
              {TRUMP_MESSAGE_QUOTES.map((q, i) => (
                <div key={i} className="flex gap-4">
                  <Quote className="h-6 w-6 shrink-0 fill-[var(--trb-red)] text-[var(--trb-red)]" />
                  <p className="text-base italic leading-relaxed text-slate-700">{q}</p>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-greatvibes)" }} className="mt-6 text-right text-4xl text-[var(--trb-red)]">
              Donald J. Trump
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <Reveal key={f} delay={i * 80} className="flex items-center gap-3 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
                  <Icon className="h-6 w-6 shrink-0 text-[var(--trb-blue)]" />
                  <span className="font-semibold text-[var(--trb-dark)]">{f}</span>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= SUCCESS STORY ================= */}
      <section className="bg-[var(--trb-dark)] px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1024] to-[#0d1530]">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <Reveal variant="left" className="p-8 sm:p-12">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-gold)]">Success Story</span>
              <h2 className="mt-4 text-3xl font-bold leading-snug text-white sm:text-4xl">
                Our platform exists to honor the{" "}
                <span className="text-[var(--trb-gold)]">belief, commitment,</span> and{" "}
                <span className="text-[var(--trb-gold)]">patriotism</span> shown by Trump supporters.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-white/70">
                While TRB products are not linked to any bank or government institution, they carry
                deep symbolic value. By redeeming yours here, you take part in an exclusive
                verification and recognition program.
              </p>
              <Link
                href="/register"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--trb-gold)] px-7 py-3 text-sm font-bold text-[var(--trb-dark)] transition-colors hover:bg-[var(--trb-gold-2)]"
              >
                CASHOUT NOW <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
            <Reveal variant="right" className="relative h-72 md:h-full md:min-h-[440px]">
              <Image src="/marketing/trump_custom.jpg" alt="Donald J. Trump" fill className="object-cover" sizes="(max-width:768px) 100vw, 600px" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= VERIFIED PROJECTS ================= */}
      <section className="bg-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
          <Reveal className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
              TRB Is A Verified Project <BadgeCheck className="h-6 w-6 text-[var(--trb-gold)]" />
            </h2>
            <Link href="/product" className="shrink-0 text-sm text-white/60 transition-colors hover:text-white">
              See all
            </Link>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((p, i) => (
              <Reveal
                key={p.title}
                delay={i * 100}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-transform duration-300 hover:-translate-y-1.5"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image src={p.image} alt={p.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width:768px) 100vw, 380px" />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{p.title}</h3>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <BadgeCheck className="h-4 w-4" /> Verified
                    </span>
                  </div>
                  <Link
                    href="/register"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[var(--trb-blue)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--trb-blue-2)]"
                  >
                    Grab The Opportunity
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= THINK BIG + STATS ================= */}
      <section className="relative overflow-hidden bg-[var(--trb-dark)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/2 opacity-10">
          <Image src="/marketing/american_flag.png" alt="" fill className="object-cover" sizes="50vw" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:px-8">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
              You have to think anyway,{" "}
              <span style={{ fontFamily: "var(--font-greatvibes)" }} className="text-5xl text-[var(--trb-gold)]">
                so why not think big?
              </span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/70">
              Holding a TRB product means you believed in something bigger. Cashing it now is the
              bold step forward.
            </p>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-8 lg:grid-cols-4">
            {STATS_HOME.map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <div className="text-4xl font-extrabold text-[var(--trb-gold)]">{s.value}</div>
                <div className="mt-1 text-sm text-white/60">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="bg-slate-50 text-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Testimonials</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 80} className="h-full">
                <div className="flex h-full flex-col rounded-2xl bg-[var(--trb-blue)] p-6 text-white">
                  <div className="flex items-center gap-3">
                    <Image src={t.avatar} alt={t.name} width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="flex gap-0.5 text-[var(--trb-gold)]">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star key={s} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-white/85">{t.quote}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= LATEST UPDATES / BLOG ================= */}
      <section className="bg-white text-[var(--trb-dark)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
          <Reveal className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">Latest Updates</span>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Trump, Investments &amp; Market News</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {updates.map((item, i) => (
              <Reveal key={`${item.title}-${i}`} delay={i * 100} className="h-full">
                <a
                  href={item.url || undefined}
                  target={item.url ? "_blank" : undefined}
                  rel={item.url ? "noopener noreferrer" : undefined}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[var(--trb-blue)] to-[var(--trb-blue-2)] px-4">
                    <span className="text-center text-lg font-bold text-white/80">{item.source}</span>
                  </div>
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
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="bg-slate-50 text-[var(--trb-dark)]">
        <div className="mx-auto max-w-4xl px-6 py-20 sm:px-8">
          <Reveal className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-blue)]">Frequently Asked Questions</span>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Have Any Questions For Us?</h2>
          </Reveal>
          <div className="mt-12">
            <FaqAccordion items={FAQ} />
          </div>
        </div>
      </section>
    </main>
  );
}
