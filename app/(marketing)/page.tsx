import Link from "next/link";
import { ArrowRight, IdCard, Upload, Banknote, ShieldCheck } from "lucide-react";

const STEPS = [
  {
    icon: IdCard,
    title: "Register Account",
    text: "Create your portal access and set up your secure profile",
  },
  {
    icon: Upload,
    title: "Upload & Verify",
    text: "Submit your physical or digital products for system review",
  },
  {
    icon: Banknote,
    title: "Cash Out & Get Paid",
    text: "Withdraw your verified funds directly to your preferred account",
  },
];

export default function Home() {
  return (
    <main>
      {/* ================= HERO ================= */}
      <section className="relative isolate overflow-hidden bg-[var(--trb-dark)]">
        {/* animated waving-flag background video */}
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
        {/* overlays */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[var(--trb-dark)] via-[var(--trb-dark)]/85 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--trb-dark)] via-transparent to-[var(--trb-dark)]/40" />
        {/* sparkles */}
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

          {/* 3-step strip */}
          <div className="mt-16 border-t border-[var(--trb-gold)]/60 pt-8">
            <div className="grid gap-8 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }) => (
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
    </main>
  );
}
