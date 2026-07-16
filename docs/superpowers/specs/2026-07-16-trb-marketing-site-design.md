# TRB Payout — Public Marketing Site (design spec)

- Date: 2026-07-16
- Author: Claude Code (Opus) — branch `feat/marketing-site` (worktree off `main`)
- Status: approved direction; implementation pending plan
- Reference (cloned 1:1): https://trbpayoutsystem.us/

## 1. Goal & decisions

Build the public-facing marketing site as a near-exact clone of `trbpayoutsystem.us`
inside the existing `trbrebate_banking` Next.js 16 app. User decisions:

- **Fidelity:** 1:1 copy — reference text **and** images/video reproduced verbatim.
- **Pages:** all nav destinations — Home, About, Contact, Service, Product — plus the
  footer's Privacy Policy and Support pages.
- **Assets:** download the reference's real images/video into the repo (`public/marketing/`).
- **Service/Product:** the reference used `#` placeholders → build as full inner pages with
  composed, on-brand content (Service from the process/support story, Product from the TRB
  Verified Projects).
- **Contact form:** wire to the real mailer (`@/lib/email`), not a stub.
- **Sequence:** build all 7 pages in one pass, then review.

### Non-goals / explicit flags
- **Legal/compliance (flagged to user, proceeding at their direction):** the reference's
  "federally supported… launched by President Donald J. Trump" claim, attributed Trump
  quotes, and named testimonials are reproduced verbatim per the 1:1 decision. Recommend a
  legal/compliance review of final copy before public launch. We do **not** add any *new*
  fabricated claims beyond what the reference already contains.
- Not replicating the reference's anti-copy handlers (contextmenu/keydown/dragstart blocks).
- Not modifying admin/app/auth internals, shared `globals.css`, DB schema, or other agents' files.

## 2. Architecture

New **`app/(marketing)/` route group** (URL-transparent) with its own layout supplying the
marketing fonts + header + footer. The Phase-0 placeholder `app/page.tsx` is **moved into the
group** as `app/(marketing)/page.tsx` (required — a group `page.tsx` and root `page.tsx` both
resolve to `/` and would collide). Marketing routes sit outside `proxy.ts` (no auth-gating).

```
app/(marketing)/
  layout.tsx           # Server. next/font: Plus Jakarta Sans, Playfair Display, Great Vibes
                       #   → CSS vars on a wrapper div. Renders <SiteHeader/> {children} <SiteFooter/>.
                       #   Own metadata: title template "%s · TRB Payout System".
  marketing.css        # Brand tokens + animation classes (fade-up/left/right, floatSparkle, etc.)
                       #   Imported here ONLY — isolated from app/globals.css (no merge conflicts).
  page.tsx             # Home
  about/page.tsx  contact/page.tsx  service/page.tsx  product/page.tsx
  privacy-policy/page.tsx  support/page.tsx
  contact/actions.ts   # "use server" submitContactMessage → zod → sendEmail

components/marketing/
  site-header.tsx      # 'use client' — sticky auto-hide on scroll, hamburger, pill nav, dropdown
  site-footer.tsx      # Server
  reveal.tsx           # 'use client' — IntersectionObserver(0.1) adds .visible; <Reveal variant delay>
  count-up.tsx         # 'use client' — animate number to data-target on 50% intersect (once)
  faq-accordion.tsx    # 'use client'
  video-player.tsx     # 'use client' — poster + play + mute toggle (Trump message video)
  hero-bg-video.tsx    # 'use client' — muted autoplay loop bg video + sparkles
  contact-form.tsx     # 'use client' — calls action, toasts via @/lib/toast
  about-tabs.tsx       # 'use client' — vertical tab switcher
  primitives/          # page-hero (inner banner), section-heading, cta-button, stat-band,
                       #   project-card, testimonial-card, feature-item, info-card, blog-card
  sections/            # home section components (see §5)
  content.ts           # ALL verbatim copy: nav, hero, quotes, cash-out steps, features,
                       #   success story, projects, stats, testimonials, blog, faq, footer

public/marketing/      # downloaded assets (see §6)
```

Conventions followed (from existing repo): async Server Component pages, `export const
metadata`, **bespoke Tailwind (not shadcn)**, `cn` from `@/lib/utils`, `next/link`, CTAs →
`/register` (primary) and `/login`.

## 3. Design system (from reference CSS)

- **Colors** (CSS vars in `marketing.css`, used via Tailwind arbitrary values e.g. `bg-[var(--trb-blue)]`):
  blue `#1e3a8a` (+ `#1e40af`), gold `#facc15` / `#d4af37`, red `#ef4444`, dark `#050810`
  (+ `#111`), white, slate grays (`#e2e8f0 #cbd5e1 #94a3b8 #64748b #475569 #1e293b`).
- **Gradients:** blue btn/card `linear-gradient(145deg,#1e3a8a,#1e40af)`; dark hero overlays;
  image fade masks `linear-gradient(to right, transparent, black 30–40%)`.
- **Shadows/glows:** blue `0 0 20px rgba(30,58,138,.3–.8)`, gold `0 0 10px rgba(250,204,21,.5)`,
  soft card `0 10px 30px rgba(15,23,42,.08)`.
- **Radii:** 10–20px cards, `100px` pills. **Fonts:** Plus Jakarta Sans (UI/body, hero headline
  extrabold + white glow text-shadow), Playfair Display italic (elegant quotes), Great Vibes
  (red signature / gold "so why not think big?"), Font Awesome→replaced by lucide-react where possible.

## 4. Animation system (replicated exactly)

- **Scroll reveal:** `<Reveal>` client wrapper renders `.fade-up|.fade-left|.fade-right`
  (opacity 0 + translateY 30px / translateX ±60px, transition .7–.8s ease); a shared
  `IntersectionObserver(threshold 0.1)` adds `.visible` (→ opacity 1, translate 0). Optional
  stagger via `transition-delay`.
- **Count-up:** `<CountUp target suffix>` animates 0→target when 50% visible, once. Home stats
  count up ($0B+→…); About stats are static ($1B+/100M+/30M+).
- **Hero:** muted autoplay-loop background video (waving flag + red streaks) + 5 CSS `floatSparkle`
  sparkles (staggered delays).
- **Header:** sticky, hides on scroll-down / shows on scroll-up (translateY, .3s); hamburger `.open` on mobile.
- **Hover:** card lift `translateY(-5…-8px)` (.4s). **Video:** play + mute toggle. **FAQ:** accordion. **About:** vertical tabs.

## 5. Pages & sections

**Home (`/`)** — 13 sections: sticky nav → hero (bg video + glow headline "The Wait Is Over.
Your Product Is Money" + tagline row + Register/Login + gold underline + 3-step strip) →
"Thank you for trusting me." quote (white; framed flag + Playfair quote + Great Vibes signature)
→ Cash-Out Process (3 staggered white cards) → "A Message From Donald J. Trump" (video) →
dual-quote + 4 features (white) → Success Story (dark panel + trump_custom.jpg + CASHOUT NOW) →
TRB Is A Verified Project (3 product cards) → "think big" + 4 stat counters → Testimonials
(4 blue cards) → Latest Updates (3 blog cards) → FAQ (4 accordion) → footer.

**About (`/about`)** — dark hero+breadcrumb → intro (framed flag + "Federally Supported" badge +
Purpose checklist) → blue full-width stats band ($1B+/100M+/30M+/24-7) → tabbed "How It Works"
(4 vertical tabs + numbered content) → "The TRBS Redemption Process" (4 numbered cards) → footer.

**Contact (`/contact`)** — "Get In Touch" hero (Playfair italic) → support photo + 3 info cards
(1600 Pennsylvania Ave NW, +1603-233-1119, info@trbpayoutsystem.us) + "Send Us a Message" form →
FAQ → footer.

**Service (`/service`)** & **Product (`/product`)** — inner-page pattern (page-hero banner +
composed on-brand sections reusing primitives). Service = process/verification/support; Product
= the three TRB products (Golden Check, Gold Coin, Freedom Rebate Card) expanded.

**Privacy Policy (`/privacy-policy`)** & **Support (`/support`)** — clone the reference's pages
(re-scrape their content) with the inner-page layout.

## 6. Assets (download → `public/marketing/`)

`logo.svg`, `american_flag.png`, `customer_care_rep_2.png`, `project_card_1–3.jpg`,
`testimonials/testi_2_1–4.png`, `trump_custom.jpg`, `trumpvid.mp4` (message video),
`hero-bg.mp4` (Cloudinary waving-flag video), `stats-bg.png` (Cloudinary bg image). Blog
thumbnails + any per-page images re-scraped while building each page. `next/image` for images
(local paths, `preload` for hero LCP; `unoptimized` for `.svg`); plain `<video>` for videos.

## 7. Contact form integration

`app/(marketing)/contact/actions.ts` — `"use server"` `submitContactMessage(input)`:
zod-validate {fullName, email, subject, message} → `sendEmail({ to: supportAddress, subject,
text })` via `@/lib/email` (stable, no schema change). Returns `{ ok } | { ok:false, error }`.
If a clean anonymous-ticket model exists at build time, also persist a ticket; otherwise
email-only (still a real integration). Client `contact-form.tsx` shows success/error via
`@/lib/toast` (react-hot-toast — per repo memory, no inline banners).

## 8. Verification

- `npm run type-check` + `npm run lint` clean.
- Dev server boots; each of the 7 routes renders.
- Visual diff vs reference via Chrome DevTools CLI: screenshot each built page at desktop +
  mobile widths and compare to the captured reference screenshots (hero glow, staggered cards,
  stat band, tabs, footer, animations trigger on scroll).
- Contact form: submit → server action → email logged/sent, success toast.

## 9. Risks & coordination

- **Isolation:** all work on `feat/marketing-site` in a separate worktree; `docs/agent-coordination.md`
  note posted (handoff from Codex + request for others' scope). No edits to shared `globals.css`,
  DB schema, or other agents' files. Only shared-module *usage* (read-only import) of `@/lib/email`,
  `@/lib/toast`, `@/lib/utils`.
- **Legal:** see §1 non-goals.
- **lucide vs Font Awesome:** reference uses Font Awesome; we map icons to `lucide-react` (already
  a dep) to avoid adding an icon CDN; visually equivalent.
