# TRB Payout Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a near-1:1 clone of `trbpayoutsystem.us` as the public marketing surface of the `trbrebate_banking` Next.js 16 app — 7 pages, exact reference copy/imagery, scroll animations.

**Architecture:** New `app/(marketing)/` route group with its own layout (marketing fonts + header + footer) and an isolated `marketing.css`. Pages are async Server Components composing section components; interactivity (scroll reveal, counters, header, video, FAQ, tabs, contact form) lives in `'use client'` leaf components under `components/marketing/`. All reference assets downloaded to `public/marketing/`.

**Tech Stack:** Next.js 16.2.10 (App Router, Turbopack), React 19.2, Tailwind v4 (CSS-first, bespoke — no shadcn), `next/font/google`, `next/image`, `next/link`, `lucide-react`, `@/lib/email` (Resend), `@/lib/toast` (react-hot-toast), zod.

## Global Constraints

- Next.js **16.2.10** semantics (verified): route groups `(folder)` strip from URL; `next/image` uses `preload` NOT `priority`; `themeColor` goes in a `viewport` export not `metadata`; `params`/`searchParams` are Promises; interactive components need `'use client'` at top of file; pages exporting `metadata` must be Server Components.
- **Isolation:** all work on branch `feat/marketing-site` in the worktree `.claude/worktrees/marketing-site`. Do NOT modify `app/globals.css`, `app/layout.tsx`, DB schema/migrations, `proxy.ts`, or any admin/app/auth/other-agent files. Only **read-only import** of `@/lib/email`, `@/lib/toast`, `@/lib/utils`.
- **Styling:** bespoke Tailwind (NOT shadcn). Brand tokens live in `app/(marketing)/marketing.css`, imported only by the marketing layout. Never edit `globals.css`.
- **Toasts** via `@/lib/toast` only (react-hot-toast) — no inline alert banners.
- **Colors:** blue `#1e3a8a`/`#1e40af`, gold `#facc15`/`#d4af37`, red `#ef4444`, dark `#050810`, white, slate grays. **Fonts:** Plus Jakarta Sans, Playfair Display (italic 700/800), Great Vibes.
- **CTAs:** "Register Now"/"Join Now"/"Get started" → `/register`; "Login Now"/"Sign in" → `/login`.
- **Copy/images:** reproduce reference verbatim (per user's 1:1 decision). Do not invent new fabricated claims beyond the reference. Reference screenshots for visual diff are in the session temp dir `…/T/trb/` (full2.jpeg = home, about.jpeg, contact.jpeg, hero.jpeg); design notes at scratchpad `trb-design-notes.md`.
- **Per-task verification** (replaces unit tests): `npm run type-check` clean, `npm run lint` clean for touched files, dev server renders the route, and a Chrome DevTools CLI screenshot visually matches the reference section.

## File Structure

```
public/marketing/                      # downloaded assets (Task 1)
app/(marketing)/
  marketing.css                        # tokens + animation classes (Task 2)
  layout.tsx                           # fonts + header + footer + metadata template (Task 2)
  page.tsx                             # Home (Tasks 7–8)
  about/page.tsx                       # (Task 9)
  contact/page.tsx  contact/actions.ts # (Task 10)
  service/page.tsx  product/page.tsx   # (Tasks 11–12)
  privacy-policy/page.tsx support/page.tsx # (Task 13)
components/marketing/
  content.ts                           # all verbatim copy (Task 3)
  reveal.tsx  count-up.tsx             # (Task 4)
  site-header.tsx  site-footer.tsx     # (Task 5)
  primitives/*.tsx                     # page-hero, section-heading, cta-button, stat-band, cards (Task 6)
  hero.tsx  hero-bg-video.tsx  video-player.tsx  faq-accordion.tsx  about-tabs.tsx  contact-form.tsx
  sections/*.tsx                       # home sections (Tasks 7–8)
```

---

### Task 1: Download reference assets

**Files:** Create `public/marketing/*` (+ `public/marketing/testimonials/*`). Create `scripts/fetch-marketing-assets.sh` (repeatable).

- [ ] **Step 1:** Write `scripts/fetch-marketing-assets.sh` that `curl`s each URL to `public/marketing/` with a browser UA:
  - `https://trbpayoutsystem.us/admin/assets/images/logo.svg` → `logo.svg`
  - `…/public/front/assets/img/american_flag.png` → `american_flag.png`
  - `…/customer_care_rep_2.png` → `customer_care_rep_2.png`
  - `…/project_card_1.jpg|2|3` → `project_card_1.jpg|2|3`
  - `…/testimonial/testi_2_1..4.png` → `testimonials/testi_2_1..4.png`
  - `…/trump_custom.jpg` → `trump_custom.jpg`
  - `https://trbpayoutsystem.us/assets/img/trumpvid.MP4` → `trumpvid.mp4`
  - `https://res.cloudinary.com/dy66rqkhi/video/upload/v1780819053/gemini_generated_video_45538E8F_vkgbbe.mp4` → `hero-bg.mp4`
  - `https://res.cloudinary.com/dy66rqkhi/image/upload/v1740927705/1739502621-e01_h4d6i2.png` → `stats-bg.png`
- [ ] **Step 2:** Run it. Verify each file downloaded and non-empty (`ls -la public/marketing`, check videos > 100KB, images valid via `file`).
- [ ] **Step 3:** Re-scrape blog thumbnails / any per-page images from `trb_home.html` blog section markup; add to script + download. If blog uses remote/stock URLs, download those too.
- [ ] **Step 4:** Commit `git add public/marketing scripts/fetch-marketing-assets.sh && git commit -m "feat(marketing): download reference assets"`.

**Verification:** all files present, videos playable, `file public/marketing/*` shows correct types.

---

### Task 2: Route group, marketing.css, fonts, layout

**Files:** Create `app/(marketing)/marketing.css`, `app/(marketing)/layout.tsx`. Move `app/page.tsx` → `app/(marketing)/page.tsx` (git mv; temporary stub body until Task 7).

**Interfaces — Produces:** CSS classes `.fade-up`, `.fade-left`, `.fade-right`, `.visible`, `.sparkle`(+`.s1..s5`), `@keyframes floatSparkle`; CSS vars `--trb-blue --trb-blue-2 --trb-gold --trb-gold-2 --trb-red --trb-dark`; font CSS vars `--font-jakarta --font-playfair --font-greatvibes` on the marketing wrapper.

- [ ] **Step 1:** `git mv app/page.tsx app/(marketing)/page.tsx` (prevents the `/` collision). Trim its body to `export default function Home(){ return <main/> }` temporarily; keep it a Server Component.
- [ ] **Step 2:** Write `marketing.css`:
```css
:root{
  --trb-blue:#1e3a8a; --trb-blue-2:#1e40af; --trb-gold:#facc15; --trb-gold-2:#d4af37;
  --trb-red:#ef4444; --trb-dark:#050810;
}
.fade-up{opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s ease}
.fade-left{opacity:0;transform:translateX(-60px);transition:opacity .8s ease,transform .8s ease}
.fade-right{opacity:0;transform:translateX(60px);transition:opacity .8s ease,transform .8s ease}
.fade-up.visible,.fade-left.visible,.fade-right.visible{opacity:1;transform:none}
.sparkle{position:absolute;width:8px;height:8px;border-radius:9999px;background:radial-gradient(circle,#fff,rgba(255,255,255,0));animation:floatSparkle 4s infinite alternate ease-in-out;opacity:0;pointer-events:none}
.sparkle.s1{top:20%;left:10%;animation-delay:0s}.sparkle.s2{top:60%;left:80%;animation-delay:1s}
.sparkle.s3{top:80%;left:30%;animation-delay:2s}.sparkle.s4{top:15%;left:60%;animation-delay:3s}
.sparkle.s5{top:50%;left:50%;animation-delay:1.5s}
@keyframes floatSparkle{0%{transform:translateY(0) scale(.8);opacity:.2}50%{opacity:.8}100%{transform:translateY(-30px) scale(1.2);opacity:.5}}
.hero-headline{text-shadow:0 0 24px rgba(255,255,255,.35)}
```
- [ ] **Step 2b:** Add `@media (prefers-reduced-motion: reduce)` block neutralizing the transforms/animations (accessibility).
- [ ] **Step 3:** Write `layout.tsx` (Server Component):
```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Great_Vibes } from "next/font/google";
import "./marketing.css";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const jakarta = Plus_Jakarta_Sans({ subsets:["latin"], weight:["300","400","500","600","700","800"], variable:"--font-jakarta", display:"swap" });
const playfair = Playfair_Display({ subsets:["latin"], weight:["700","800"], style:["italic"], variable:"--font-playfair", display:"swap" });
const greatVibes = Great_Vibes({ subsets:["latin"], weight:["400"], variable:"--font-greatvibes", display:"swap" });

export const metadata: Metadata = {
  title: { default: "TRBPAYOUTSYSTEM — Trump Rebate Banking System", template: "%s · TRB Payout System" },
  description: "The verified system where holders of TRB products can register and validate their items.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${jakarta.variable} ${playfair.variable} ${greatVibes.variable} bg-[var(--trb-dark)] text-white`} style={{ fontFamily: "var(--font-jakarta)" }}>
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
```
- [ ] **Step 4:** Temporarily stub `SiteHeader`/`SiteFooter` as empty exports so it compiles; `npm run type-check`.
- [ ] **Step 5:** Commit `feat(marketing): route group, marketing.css, fonts, layout`.

**Verification:** `npm run type-check` clean; `npm run dev` → `/` returns 200 (blank).

---

### Task 3: content.ts (verbatim copy)

**Files:** Create `components/marketing/content.ts`.

**Interfaces — Produces:** typed exports `NAV`, `HERO`, `STEPS`, `TRUST_QUOTE`, `CASHOUT`, `MESSAGE`, `TRUMP_QUOTES`, `FEATURES`, `SUCCESS`, `PROJECTS`, `STATS`, `TESTIMONIALS`, `BLOG`, `FAQ`, `FOOTER`, `CONTACT_INFO`, `ABOUT` (all reference strings verbatim from `trb-design-notes.md` §HOME/ABOUT/CONTACT and the curled HTML in scratchpad).

- [ ] **Step 1:** Populate every constant with the exact reference text (nav labels, hero headline/subcopy/tagline, 3 steps, "Thank you for trusting me." block + TRBS paragraph + "Donald J. Trump", 3 cash-out cards, message quotes, 4 features, success-story copy, 3 projects with titles+"Verified"+"Grab The Opportunity", 4 stats with targets+suffix+label, 4 testimonials name+quote, 3 blog category/title/excerpt, 4 FAQ q/a, footer tagline+links+contact, contact address/phone/email, about purpose bullets + how-it-works tabs + redemption cards). Asset paths point to `/marketing/...`.
- [ ] **Step 2:** `npm run type-check`. Commit `feat(marketing): content module`.

**Verification:** type-check clean; grep confirms key strings ("Thank you for trusting me", "+1603-233-1119", "info@trbpayoutsystem.us") present.

---

### Task 4: Reveal + CountUp primitives

**Files:** Create `components/marketing/reveal.tsx`, `components/marketing/count-up.tsx`.

**Interfaces — Produces:**
- `<Reveal variant?: "up"|"left"|"right" delay?: number className? as?>` — wraps children, adds `.fade-*` and toggles `.visible` on intersect.
- `<CountUp target: number suffix?: string prefix?: string durationMs?: number className?>` — counts up when 50% visible, once.

- [ ] **Step 1:** `reveal.tsx` (`'use client'`): ref + `IntersectionObserver({threshold:0.1})` adds `visible` and unobserves; maps variant→`fade-up|fade-left|fade-right`; applies `transitionDelay` from `delay`. Render as `as` element (default `div`).
- [ ] **Step 2:** `count-up.tsx` (`'use client'`): ref + `IntersectionObserver({threshold:0.5})`; on intersect animate 0→target via `requestAnimationFrame` over `durationMs` (default 1600), format with prefix/suffix, unobserve after.
- [ ] **Step 3:** `npm run type-check` + `npm run lint`. Commit `feat(marketing): reveal + countup animation primitives`.

**Verification:** type-check/lint clean. (Behavior verified visually in Task 7's screenshot check.)

---

### Task 5: SiteHeader + SiteFooter

**Files:** Create `components/marketing/site-header.tsx` (`'use client'`), `components/marketing/site-footer.tsx` (Server).

**Interfaces — Consumes:** `NAV`, `FOOTER`, `CONTACT_INFO` from content.ts. **Produces:** `SiteHeader`, `SiteFooter` (named exports — matches layout import).

- [ ] **Step 1:** `SiteHeader`: fixed/sticky bar, transparent over hero, logo (`/marketing/logo.svg`), centered pill nav (Home active pill, Service dropdown, Product, About Us, Contact Us), right Sign in (→`/login`) + Join Now pill (→`/register`). Scroll handler: hide on scroll-down / show on scroll-up (translateY). Mobile: hamburger toggling a `.open` menu (lucide `Menu`/`X`).
- [ ] **Step 2:** `SiteFooter`: blue `#1e3a8a`, logo + tagline + Join Now, Quick Links (About Us→/about, Privacy policy→/privacy-policy, Contact Us→/contact, Support→/support), Contact (phone tel:, email mailto:), © 2026 line.
- [ ] **Step 3:** type-check/lint. Commit `feat(marketing): site header + footer`.

**Verification:** dev `/` shows header+footer; screenshot header vs `hero.jpeg` top and footer vs `full2.jpeg` bottom.

---

### Task 6: Shared primitives

**Files:** Create `components/marketing/primitives/{page-hero,section-heading,cta-button,stat-band,project-card,testimonial-card,feature-item,info-card,blog-card,step-item}.tsx`.

**Interfaces — Produces:** typed props for each (e.g. `PageHero{title, breadcrumb?, variant:"dark"|"light"}`, `CtaButton{href, children, variant:"white"|"outline"|"gold"|"blue"}`, `StatBand{stats}`, `ProjectCard{image,title,cta}`, `TestimonialCard{avatar,name,quote}`, `FeatureItem{icon,label}`, `InfoCard{icon,title,lines}`, `BlogCard{image,category,title,excerpt}`). Server Components unless they need interactivity.

- [ ] **Step 1:** Implement each to the reference styling (radii, glow shadows, blue/gold tokens). Use `next/image` for images, `next/link` for CTAs, lucide icons.
- [ ] **Step 2:** type-check/lint. Commit `feat(marketing): shared marketing primitives`.

**Verification:** type-check/lint clean; primitives import cleanly.

---

### Task 7: Home — hero + top sections

**Files:** Create `components/marketing/hero.tsx`, `hero-bg-video.tsx` (`'use client'`), `components/marketing/sections/{trust-quote,cash-out-process,message}.tsx`, `video-player.tsx` (`'use client'`). Modify `app/(marketing)/page.tsx` to compose them.

- [ ] **Step 1:** `hero-bg-video.tsx`: muted autoplay loop `<video src="/marketing/hero-bg.mp4">` cover + dark gradient overlays + 5 `.sparkle` spans. `hero.tsx`: bg + glowing headline (HERO), tagline row, Register/Login CTAs, gold underline + 3-step strip (STEPS). Wrap reveal-able bits in `<Reveal>`.
- [ ] **Step 2:** `trust-quote` (white bg, framed flag + Playfair quote + Great Vibes signature), `cash-out-process` (dark, 3 staggered white cards), `message` (dark, `<VideoPlayer src="/marketing/trumpvid.mp4">` with play + mute toggle).
- [ ] **Step 3:** Compose in `page.tsx` (Server Component) with `export const metadata` (home title). type-check/lint.
- [ ] **Step 4:** Dev server; Chrome CLI: navigate to local `/`, scroll-trigger, screenshot; compare top ~4000px to reference `full2.jpeg`. Adjust spacing/colors/fonts to match.
- [ ] **Step 5:** Commit `feat(marketing): home hero + trust/cashout/message sections`.

**Verification:** local hero visually matches `hero.jpeg`; sections reveal on scroll.

---

### Task 8: Home — remaining sections

**Files:** Create `components/marketing/sections/{features,success-story,verified-projects,stats,testimonials,latest-updates,faq}.tsx`, `faq-accordion.tsx` (`'use client'`). Modify `page.tsx`.

- [ ] **Step 1:** Build each section per `trb-design-notes.md` §HOME 6–12 using Task 6 primitives + `<Reveal>`/`<CountUp>`: dual-quote+features; success story (dark panel + `trump_custom.jpg` + CASHOUT NOW gold); verified projects (3 `project_card_*`); "think big" + 4 `<CountUp>` stats over `stats-bg.png`; testimonials (4 blue cards, `testi_2_*`); latest updates (3 blog cards); FAQ (`<FaqAccordion>` with FAQ items).
- [ ] **Step 2:** Append to `page.tsx`. type-check/lint.
- [ ] **Step 3:** Dev; full-page screenshot of local `/` (scroll-triggered) vs reference `full2.jpeg` top-to-bottom; fix diffs.
- [ ] **Step 4:** Commit `feat(marketing): home remaining sections (features…faq)`.

**Verification:** full local home matches reference full2.jpeg; counters animate; FAQ toggles.

---

### Task 9: About page

**Files:** Create `app/(marketing)/about/page.tsx`, `components/marketing/about-tabs.tsx` (`'use client'`).

- [ ] **Step 1:** Compose per notes §ABOUT: dark `<PageHero title="About Us" breadcrumb variant="dark">`; intro (framed flag + blue "Federally Supported" badge + Purpose checklist, green checks); `<StatBand>` (static $1B+/100M+/30M+/24-7); `<AboutTabs>` (4 vertical tabs + numbered content); "TRBS Redemption Process" 4 numbered cards. `export const metadata={title:"About Us"}`.
- [ ] **Step 2:** type-check/lint; dev; screenshot local `/about` vs `about.jpeg`; fix diffs.
- [ ] **Step 3:** Commit `feat(marketing): about page`.

---

### Task 10: Contact page + form + server action

**Files:** Create `app/(marketing)/contact/page.tsx`, `app/(marketing)/contact/actions.ts`, `components/marketing/contact-form.tsx` (`'use client'`).

**Interfaces — Produces:** `submitContactMessage(input: ContactInput): Promise<ContactResult>` where `ContactInput={fullName,email,subject,message}`, `ContactResult={ok:true}|{ok:false,error:string}`.

- [ ] **Step 1:** `actions.ts` (`"use server"`): zod-validate input; resolve support address (General settings `fromEmail` or fallback `info@trbpayoutsystem.us`); `sendEmail({to, subject:`[Contact] ${subject}`, text})` from `@/lib/email`; return `{ok:true}` / `{ok:false,error}`. No auth guard (public). Do NOT touch DB schema.
- [ ] **Step 2:** `contact-form.tsx`: controlled fields (Full Name/Email/Subject/Message), calls action, `toast.success/error` from `@/lib/toast`, resets on success, disabled+pending state.
- [ ] **Step 3:** `page.tsx` (Server): "Get In Touch" Playfair hero (light), support photo (`customer_care_rep_2.png`) + 3 `<InfoCard>` (address/phone/email) + `<ContactForm>`; FAQ. `export const metadata={title:"Contact Us"}`.
- [ ] **Step 4:** type-check/lint; dev; submit form → verify email logged in server console (dev) + success toast; screenshot vs `contact.jpeg`.
- [ ] **Step 5:** Commit `feat(marketing): contact page + working message form`.

---

### Task 11: Service page

**Files:** Create `app/(marketing)/service/page.tsx`.

- [ ] **Step 1:** Inner-page pattern: `<PageHero title="Service" variant="dark">`; compose on-brand sections from the process/verification/support story (reuse cash-out steps, features, a CTA band). Consistent with home styling. `export const metadata={title:"Service"}`.
- [ ] **Step 2:** type-check/lint; dev; screenshot; visual coherence check. Commit `feat(marketing): service page`.

---

### Task 12: Product page

**Files:** Create `app/(marketing)/product/page.tsx`.

- [ ] **Step 1:** `<PageHero title="Product" variant="dark">` + expanded TRB products (the 3 Verified Projects as detailed `<ProjectCard>`s + descriptions + "Grab The Opportunity" CTAs → /register). `export const metadata={title:"Product"}`.
- [ ] **Step 2:** type-check/lint; dev; screenshot; commit `feat(marketing): product page`.

---

### Task 13: Privacy Policy + Support pages

**Files:** Create `app/(marketing)/privacy-policy/page.tsx`, `app/(marketing)/support/page.tsx`.

- [ ] **Step 1:** `curl` reference `/privacy-policy` and `/support`; extract content; render each with `<PageHero>` + prose sections (reference copy verbatim). Metadata titles "Privacy Policy" / "Support".
- [ ] **Step 2:** type-check/lint; dev; screenshot vs reference; commit `feat(marketing): privacy + support pages`.

---

### Task 14: Final verification pass

- [ ] **Step 1:** `npm run type-check` (whole repo touched files) + `npm run lint` — both clean.
- [ ] **Step 2:** `npm run build` (Turbopack) — succeeds (catches RSC/client boundary errors).
- [ ] **Step 3:** Chrome CLI: for each of the 7 routes, screenshot at desktop (1440) AND mobile (390) widths; compare to reference; confirm header hide/show, hamburger, reveals, counters, video, FAQ, tabs all work; fix regressions.
- [ ] **Step 4:** Confirm no changes leaked outside marketing scope (`git diff --stat main..feat/marketing-site` shows only marketing files + moved page.tsx).
- [ ] **Step 5:** Update `docs/agent-coordination.md` status to "complete". Final commit if needed.

**Verification:** all 7 routes render + match reference at desktop & mobile; build passes; diff scoped to marketing only.

## Self-Review notes
- Spec coverage: every §5 page → Tasks 7–13; §4 animations → Tasks 2,4,7,8; §7 contact → Task 10; §6 assets → Task 1; §2 architecture → Task 2. Covered.
- No pytest (repo has none) — verification is type-check/lint/build/visual-diff, stated per task.
- Interfaces (Reveal/CountUp/CtaButton/PageHero/StatBand/submitContactMessage names) are consistent across tasks.
- Non-placeholder: load-bearing code (marketing.css, layout, action signature) given inline; section JSX authored at execution against the reference screenshots (visual clone — exact pixels come from iterating in the browser, which the plan mandates per task).
