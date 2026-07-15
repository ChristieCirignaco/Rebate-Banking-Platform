# User Dashboard — mobile-first app shell (design)

Date: 2026-07-15
Status: Approved (design), building

## Goal
Build the user-facing dashboard experience from a fintech mockup: two screens —
**Home** and **Transaction History** — inside a reusable mobile-first app shell.
Mobile-first; on desktop the *same* mobile UI is centered as a phone-width column
on a dark backdrop (not a re-laid-out desktop). Faithful to the mockup visual:
dark navy gradient hero → white rounded sheet, blue-gradient accents, rounded tiles.

Reference mockup: two phones — Home (dark hero + white card sheet + bottom tab bar)
and Transaction History (white, back header, filter chips, date-grouped rows).

## Scope (this pass)
- App shell: centered phone frame + backdrop + bottom tab bar; guarded once.
- **Home** (`/dashboard`) wired to real `Wallet` + `WalletTransaction` data.
- **Transaction History** (`/transactions`) wired to the ledger, with filter chips.
- Placeholder "coming soon" tabs: `/statistic`, `/wallet`, `/settings`.
- Dev-only seed so the design can be viewed populated.

### Out of scope (stubbed now, real later)
Statistic / Wallet / Settings real pages; Deposit / Transfer / Add-product flows;
search; notifications feed. All linked to lightweight stubs.

## Routing — route group `app/(app)/`
One shared layout renders the frame + self-hiding bottom tab bar and calls
`requireActiveUser()`.

| Route | Screen | Chrome |
|---|---|---|
| `/dashboard` | Home (mockup screen 1) | dark header + tab bar |
| `/transactions` | Transaction History (screen 2) | back header, **no** tab bar |
| `/statistic` `/wallet` `/settings` | Coming-soon placeholders | tab bar |

Bottom **TabBar**: Home · Statistic · ⊕FAB · Wallet · Settings. Client component,
`usePathname`, self-hides on detail routes (`/transactions`). FAB opens a quick-action
sheet (Deposit / Transfer / Add product → stubs). Existing `/dashboard` placeholder
page is replaced. `/account/profile` & `/account/security` stay put; Settings links
to them.

## Home screen — data mapping
- **Header**: time-based greeting + first name; avatar (image or initials); search
  (stub) + bell with unread `Notification` count (→ stub).
- **Total Balance hero**: the user's **default wallet** balance (no fake cross-currency
  sum). Eye toggle to hide/show (client, persisted). Delta = net credit−debit over the
  last 30 days on that wallet, green/red, with % vs the 30-day-ago baseline.
- **Quick actions**: Deposit (frosted-glass) · Transfer (glossy gradient, vertical ⇅ icon) ·
  grid → stubs. Delta shows light amount + green % (no heavy pill), matching the mockup.
- **Overview stat widgets** (replaced the original "My Cards" wallet tiles per follow-up):
  vibrant gradient cards — **Products** (count + approved/pending) and **Withdrawals**
  (completed amount + pending/total) side-by-side, **Transfers** (amount + in/out counts)
  full-width below. All wired to `Product` / `Withdraw` / `WalletTransaction(source=transfer)`.
- **Upcoming Payment**: latest pending `Deposit`/`Withdraw` (Pay Now → its detail stub);
  hidden when none.
- **Transactions** preview: latest 3–4 ledger rows grouped by day; "See More" →
  `/transactions`.

## Transaction row & History
Ledger-driven, so the row's circular colored icon is chosen by `source`
(deposit ↓, withdrawal ↑, transfer ⇄, rebate/reward %/★, fee, adjustment); green tint
for credit / slate for debit. Amount: green `+` (credit) / red `−` (debit). Subtitle:
`description`/`memo` or humanized source. Right: timestamp. One `TransactionRow`
component powers both the Home preview and the History list.

**Filter chips** (adapted from the mockup — its "Request" has no analog here):
**All · Income** (credit) **· Sent** (debit) **· Transfer** (source=transfer)
**· Rebate** (source rebate/reward). Client-side filter over fetched rows (latest ~100).

## Seed — `scripts/seed-dashboard.ts` (dev only)
Targets an account by email (arg/env), idempotent (fixed idempotency keys; resets its
own seeded rows on re-run), posts through real ledger invariants (`balanceAfterMinor`,
`idempotencyKey`, materialized wallet balance). Creates 2–3 wallets with balances,
~15 transactions across recent days over varied sources, and one pending deposit for
the Upcoming Payment row.

## Files (planned)
- `app/(app)/layout.tsx` — shell + guard
- `app/(app)/dashboard/page.tsx` — Home (replaces old `app/dashboard/page.tsx`)
- `app/(app)/transactions/page.tsx` — History
- `app/(app)/statistic|wallet|settings/page.tsx` — placeholders
- `components/app/bottom-tab-bar.tsx` — self-hiding tab bar + FAB
- `components/app/dashboard-header.tsx`, `balance-hero.tsx` (client), `quick-actions.tsx`,
  `stat-widgets.tsx` (Overview widgets), `upcoming-payment.tsx`, `transactions-list.tsx`,
  `transaction-row.tsx`, `transaction-filters.tsx` (client), `app-frame.tsx` (backdrop/frame),
  `coming-soon-button.tsx`, `placeholder-screen.tsx`
- `lib/dashboard/transactions.ts` — source→icon/label mapping, day grouping, greeting,
  30-day delta helpers
- `scripts/seed-dashboard.ts`

## Responsive desktop view (follow-up)
Desktop is no longer the centered mobile column — it's a genuine desktop layout, chosen by
**CSS breakpoint** (`lg`, 1024px), not a JS device switch (avoids the hydration flash the
`useIsMobile` desktop-first snapshot would cause). Shared content pieces (`BalanceHero`,
`StatWidgets`, `TransactionRow/List`, `TransactionFilters`, `UpcomingPayment`) are consumed by
both views; only the arrangement + chrome differ.
- `(app)/layout.tsx`: responsive shell — `DesktopSidebar` (dark navy rail, nav + user +
  sign-out, `hidden lg:flex`) + `DesktopTopBar` (`hidden lg:flex`) at lg+, `BottomTabBar`
  (`lg:hidden`) below. `children` rendered once.
- Home: page fetches once → `DashboardView` model → renders `MobileHome` (`lg:hidden`) and
  `DesktopHome` (`hidden lg:block`). Desktop = balance card + Overview cluster (2-col) then a
  full-width transactions panel.
- `/transactions`: shared filter list; only the header differs by breakpoint (back-header
  mobile / titled desktop).
- New: `desktop-sidebar.tsx`, `desktop-topbar.tsx`, `balance-card.tsx`, `mobile-home.tsx`,
  `desktop-home.tsx`, `dashboard-view.ts`. Retired: `app-frame.tsx`.

## Desktop rebuild — fixed 3-zone shadcn shell (follow-up 2)
Per a team review, desktop (lg+) was rebuilt into a fixed shadcn-style app frame; the mobile
phone-hero is unchanged.
- `(app)/layout.tsx`: `lg:h-svh lg:overflow-hidden` frame with three color zones — a **detached
  dark-slate sidebar** (~225px, rounded), a **light main container** (#f8fafc) holding a fixed
  **header** (~80px: greeting + search/bell/avatar), and a **dark content panel** (#0b1120,
  rounded/inset) that is the ONLY scroller. Below lg the `lg:` utilities are inert, so the
  mobile flow + bottom tab bar are untouched.
- Dark content: each page's desktop composition is wrapped in a `dark` scope (Tailwind is
  class-based: `@custom-variant dark (&:is(.dark *))`), so the shared components' `dark:`
  styles render light-on-dark automatically. Mobile stays light (not dark-scoped).
- Pages split mobile (light, `lg:hidden`) vs desktop (`dark hidden lg:block`): home
  (`DesktopHome`), transactions, settings, placeholders. Data still fetched once per page.
- New: `desktop-header.tsx`. Restyled: `desktop-sidebar.tsx` (detached, dark slate). Retired:
  `desktop-topbar.tsx`.
- Header search is a real search bar (input-style) at md+; the dark content panel has a subtle
  thin scrollbar.
- Mobile hamburger (`mobile-menu.tsx`): a menu button in the mobile Home hero opens the sidebar
  (full nav + user card + sign-out) as a left slide-out `Sheet` — completes the spec's mobile
  behavior while keeping the phone-hero + bottom tab bar. The hero's stub search icon was
  dropped to make room (desktop keeps the search bar).

## Conventions
- Toasts via `@/lib/toast` (react-hot-toast); no inline alert banners for transient msgs.
- Any navigation after awaiting a Server Action uses `window.location.href` (router wedge).
- Money via `formatCurrency(toMajor(minor), currency)`; never floats.
