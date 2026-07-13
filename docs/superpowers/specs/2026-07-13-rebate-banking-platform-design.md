# Rebate Banking Platform — Design Specification

- **Status:** Draft for review
- **Date:** 2026-07-13
- **Author:** Engineering (with client brief)
- **Working title:** Rebate Banking (`trbrebate_banking`)

---

## 1. Purpose & one-paragraph summary

A web platform where users submit ("upload") products they have purchased to claim a
cashback/rebate. Each submission becomes a **claim** that an admin manually reviews.
Approved claims **credit the user's in-app wallet**. Users then request a **manual
withdrawal** of their wallet balance. Optional, admin-gated **deposits** let users fund a
wallet through real payment providers. The product is a legitimate, original rebate app —
**not** an affiliate/link-tracking model and **not** a task-to-earn scheme.

This document is the master specification. It is intentionally comprehensive so it can be
split into per-phase implementation plans. Each phase in the [roadmap](#15-phased-roadmap)
is independently buildable and demoable.

---

## 2. Product model (the rebate mechanic)

**Direct-submission rebate.** Not affiliate, no browser extension, no merchant-link
tracking, no affiliate networks. The value flow:

1. User registers an account (country, international phone, currency chosen at signup).
2. User submits one or more products via a repeatable line-item form
   (product name, unit price, quantity, image/receipt proof).
3. Each submission becomes a **claim** in an admin review queue.
4. An admin manually **approves or rejects** the claim (with notes).
5. An approved claim writes a **credit** to the user's wallet ledger and updates the
   wallet balance. Claims are never paid out individually — value accrues to the wallet.
6. The user requests a **withdrawal** from the wallet balance; an admin fulfills it
   manually and updates status. Funds leave the spendable balance when the request is
   made (see [§7 money-safety](#7-money-model--ledger-the-critical-subsystem)).

### 2.1 Legitimacy guardrails (non-negotiable)

These are product principles, enforced in copy, data model, and flows:

- **Every credit is tied to a real, reviewed event** (an approved claim, a confirmed
  deposit, or an explicit admin adjustment). Never to signups, "tasks," clicks, or
  recruitment.
- **No pay-to-withdraw.** No activation fees. Withdrawals depend only on approved claims
  and available balance. A user never has to pay to receive money.
- **No guaranteed returns.** Deposits are stored value, never an "investment" promising a
  yield.
- **No fabricated affiliations.** No implied government, bank, or celebrity endorsement
  anywhere in copy or branding.
- **Deposits fail closed.** The entire deposit capability is gated behind a feature flag +
  permission and rejects requests server-side when off.

> These guardrails also keep the app clear of the FTC-flagged "task-based rebate/cashback"
> scam category, where fake earnings accumulate to lure deposits.

---

## 3. Users, roles & permissions

| Role | Description |
|------|-------------|
| **user** | Submits claims, holds a wallet, requests withdrawals, manages payout methods and KYC. |
| **admin** | Reviews claims/KYC, processes withdrawals, manages payment settings, flags, and users. Capabilities are granular (see below). |
| **superadmin** *(optional)* | An admin whose role includes all permissions, including `manage_admins`. |

Admin capability is **granular**, not a single boolean. Permission keys:

`review_claims`, `process_withdrawals`, `manage_payment_settings`, `manage_feature_flags`,
`manage_users`, `manage_kyc`, `manage_admins`.

A **role** is a named set of permission keys. Every admin action is guarded by the specific
permission it requires — never by "is admin" alone.

---

## 4. Architecture & stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 15 (App Router) + TypeScript** | Runs on Vercel Hobby (native), Cloudflare Workers (via OpenNext), and any VPS/Docker. Familiar from prior work. |
| DB provider | **Neon serverless Postgres** (default) | Portable to all targets; scale-to-zero but never pauses; HTTP `transaction()` helper enables race-safe money ops on the edge. **Swappable** to Supabase or self-hosted Postgres via connection string only. |
| ORM / queries | **Drizzle ORM** | ~7 KB, fits the Workers Free **3 MB** worker limit, first-class edge support, typed SQL-like queries that read clearly for reviewers. |
| Money operations | **Neon HTTP `transaction()` + atomic conditional `UPDATE` + idempotency keys** | Race-safe on every host without persistent DB sessions or `SELECT … FOR UPDATE`. |
| Auth | **Better Auth** | Email/password, email verification, email-OTP, TOTP 2FA, rate limiting, RBAC. Uses `node:crypto` scrypt on Workers. |
| Password hashing | **scrypt** (via Better Auth) | argon2/bcrypt native bindings do not run on Workers; scrypt is the portable, equally-strong KDF. *(Documented deviation from the brief's argon2/bcrypt.)* |
| UI | **Tailwind CSS + shadcn/ui (Radix)** | shadcn for admin as requested; a shared reusable component library serves user, admin, and marketing surfaces. |
| Forms & validation | **React Hook Form + Zod** (shared schemas) | One Zod schema validates on both client and server. |
| File uploads | **Cloudflare R2 (S3-compatible), presigned URLs** | Portable across all hosts; private buckets for proofs and KYC documents. |
| Secrets / PII at rest | **AES-256-GCM via Web Crypto** | Encrypt payout details and provider API keys; portable to all runtimes. |
| Payments | **`PaymentProvider` interface** — `SimulatedProvider` shipped; Paystack/Stripe/PayPal drop-in | Entire deposit surface fail-closed behind flag + permission. |
| Email | **Mailer abstraction** (Resend default; SMTP fallback for VPS) | Verification, password reset, and money-event notifications. |
| Testing | **Vitest** (unit) + money-path integration tests; Playwright optional later | Ledger math and state machines are the highest-value tests. |
| Tooling | **ESLint + Prettier + TS strict**, Husky pre-commit | Clean, consistent, review-friendly code. |

### 4.1 Deployment portability

- **Primary target:** Vercel Hobby (git-push deploy, wired to CI).
- **Verified targets:** Cloudflare Workers (OpenNext + wrangler + R2) and VPS (Docker
  Compose: Next.js + Postgres).
- Portability rules that constrain every choice:
  - No Node-only native binaries on the request path (rules out argon2/bcrypt, sharp on
    Workers, etc.).
  - Keep the Workers bundle under 3 MB compressed (favors Drizzle, lean deps).
  - All I/O (DB, storage, email, payments) sits behind interfaces so a target swap is a
    config change, not a code change.

### 4.2 Project structure (high level)

```
app/                    # Next.js App Router (marketing, auth, dashboard, admin)
components/             # Reusable UI (ui/ = shadcn primitives, shared/ = composed)
lib/
  auth/                 # Better Auth config, session, RBAC guards
  db/                   # Drizzle schema, client, migrations
  money/                # Ledger service, money value object, idempotency
  flags/                # Feature-flag service + guards
  payments/             # PaymentProvider interface + providers
  storage/              # R2 presigned uploads
  crypto/               # AES-GCM encrypt/decrypt for PII
  kyc/                  # KYC service + level gating
  validation/           # Shared Zod schemas
server/                 # Server actions / route handlers grouped by domain
tests/                  # Vitest unit + integration (money paths first)
```

Each module has one responsibility and a small public interface. Money, flags, payments,
and KYC are services with no UI knowledge, so they are unit-testable in isolation.

---

## 5. Money representation

- **Integer minor units only.** Every amount is a `bigint` count of the currency's minor
  unit (e.g. cents, kobo). No floating-point money anywhere.
- **Currency code** (`char(3)`, ISO 4217) travels with every amount.
- **Single currency per user** (chosen at registration). A user's wallet, claims, and
  transactions all share that currency. **No FX conversion** in v1 — this avoids
  fabricated exchange rates in a demo. The currency column exists everywhere so multi-
  currency/FX can be added later without a migration of meaning.
- A small `Money` value object centralizes formatting (locale-aware symbol + grouping) and
  guards against mixing currencies in arithmetic.

---

## 6. Data model

Postgres + Drizzle. All tables have `id` (uuid), `created_at`, and (where mutable)
`updated_at`. Money columns are `*_minor bigint` + a `currency char(3)`.

### 6.1 Identity & access

- **users**: `id`, `first_name`, `last_name`, `email` (unique, citext), `phone`,
  `phone_country`, `country`, `currency`, `password_hash`, `email_verified_at`,
  `role_id`, `status` (`pending` | `active` | `suspended`), `kyc_level`
  (`none` | `basic` | `full`), `two_factor_enabled`, `created_at`, `updated_at`.
- **roles**: `id`, `name` (unique), `permissions text[]`, `is_system`.
- **sessions / accounts / verification**: managed by Better Auth's schema.
- **audit_logs**: `id`, `actor_id`, `action`, `entity_type`, `entity_id`,
  `metadata jsonb`, `created_at`. Every money mutation and admin action writes one.

### 6.2 Wallet & ledger

- **wallets**: `id`, `user_id` (unique), `balance_minor bigint` (spendable, `>= 0`),
  `currency`, `updated_at`. Balance is a materialized cache of the ledger, updated
  atomically with each entry.
- **wallet_transactions** *(append-only ledger; never updated or deleted)*:
  `id`, `user_id`, `wallet_id`, `direction` (`credit` | `debit`), `amount_minor`,
  `currency`, `source` (`claim` | `withdrawal` | `withdrawal_reversal` | `deposit` |
  `adjustment`), `reference_type`, `reference_id`, `idempotency_key` (unique),
  `balance_after_minor`, `memo`, `created_at`.

### 6.3 Claims

- **claims**: `id`, `user_id`, `program_id` (nullable), `status`
  (`draft` | `submitted` | `under_review` | `approved` | `rejected` | `credited` |
  `reversed`), `reviewer_id`, `review_notes`, `currency`, `total_minor`,
  `submitted_at`, `reviewed_at`, `credited_at`.
- **claim_items**: `id`, `claim_id`, `product_name`, `unit_price_minor`, `quantity`,
  `line_total_minor`, `proof_file_key` (R2 object key), `created_at`.

### 6.4 Withdrawals & payouts

- **payout_methods**: `id`, `user_id`, `type` (`bank` | `paypal` | `mobile_money` | …),
  `encrypted_details` (AES-GCM), `masked_label` (e.g. `•••• 4321`), `is_default`,
  `created_at`. Raw details are never returned to the client; admins see them only when
  fulfilling a withdrawal.
- **withdrawals**: `id`, `user_id`, `amount_minor`, `currency`, `payout_method_id`,
  `status` (`requested` | `processing` | `completed` | `failed` | `cancelled`),
  `admin_id`, `admin_notes`, `requested_at`, `processed_at`.

### 6.5 Deposits & providers (gated)

- **payment_providers**: `id`, `provider` (`paystack` | `stripe` | `paypal` |
  `simulated`), `enabled bool`, `encrypted_config` (AES-GCM), `updated_by`,
  `updated_at`.
- **deposits**: `id`, `user_id`, `provider`, `amount_minor`, `currency`,
  `provider_reference` (unique per provider), `status`
  (`initiated` | `pending` | `succeeded` | `failed`), `created_at`.

### 6.6 KYC

- **kyc_verifications**: `id`, `user_id`, `requested_level` (`basic` | `full`),
  `status` (`pending` | `approved` | `rejected`), `document_key`, `selfie_key`,
  `document_type`, `reviewer_id`, `review_notes`, `submitted_at`, `reviewed_at`.
  Document/selfie objects live in a private R2 bucket, accessible to admins only via
  short-lived presigned URLs.

### 6.7 Programs, config & notifications

- **rebate_programs** *(optional, Phase 7)*: `id`, `name`, `description`, `rate_bps`
  (basis points), `category`, `max_rebate_minor`, `starts_at`, `ends_at`, `active`.
- **feature_flags**: `id`, `key` (unique), `enabled bool`, `description`, `updated_by`,
  `updated_at`.
- **app_settings**: `id`, `key` (unique), `value jsonb`, `updated_by`, `updated_at`
  (min withdrawal threshold, min KYC level for withdrawal, per-claim caps, etc.).
- **notifications**: `id`, `user_id`, `type`, `title`, `body`, `read_at`, `created_at`.

---

## 7. Money model & ledger (the critical subsystem)

The ledger is the heart of the app. Correctness rules:

1. **Append-only.** `wallet_transactions` rows are never updated or deleted. A reversal is
   a new compensating row, not an edit.
2. **Cached balance is a materialization.** `wallets.balance_minor` always equals the
   signed sum of the ledger. It is updated in the same atomic transaction as the entry it
   reflects, and `balance_after_minor` is recorded on the entry.
3. **Atomicity via Neon HTTP `transaction()`.** Each money operation runs as one
   non-interactive transaction containing (a) the conditional balance update and (b) the
   ledger insert — portable across Workers, Vercel, and VPS.
4. **No overdraw.** Debits use a conditional update:
   `UPDATE wallets SET balance_minor = balance_minor - :amt WHERE id = :id AND
   balance_minor >= :amt`. Zero rows affected → insufficient funds → the transaction
   aborts and no ledger row is written.
5. **Idempotency.** Every ledger write carries a unique `idempotency_key` derived from its
   source event (e.g. `claim:<id>:credit`, `withdrawal:<id>:debit`,
   `deposit:<provider_reference>`). A duplicate insert violates the unique constraint and
   is treated as a no-op, so retried webhooks/clicks never double-credit or double-debit.

### 7.1 Operation flows

- **Claim approval → credit.** Admin approves a claim → single transaction: insert a
  `credit` row (`source=claim`, `idempotency_key=claim:<id>:credit`) and increment the
  balance. Claim → `credited`.
- **Withdrawal request → debit-on-request.** Creating a withdrawal immediately debits the
  spendable balance via the conditional update (funds leave the balance so they cannot be
  requested twice or spent elsewhere). Withdrawal → `requested`.
  - **On completion:** no balance change; status → `completed`. The debit stands.
  - **On failure/cancel:** insert a compensating `credit` (`source=withdrawal_reversal`)
    to restore the balance; status → `failed`/`cancelled`.

  > *Documented refinement of the brief.* The brief says "debit on completion." We debit
  > on **request** and reverse on failure, because debiting only at completion would let a
  > user request multiple withdrawals against the same balance concurrently. Reserve-on-
  > request is the standard, race-safe approach and preserves an accurate spendable
  > balance at all times.

- **Deposit confirmation → credit.** On a confirmed provider event, one transaction
  credits the wallet (`source=deposit`, idempotency on `provider_reference`). Entire path
  is gated (see §8).
- **Reversal / adjustment.** Admin-only, permissioned, always a new compensating entry
  with a mandatory memo and audit-log record.

---

## 8. Feature flags & permission guards (first-class system)

- **DB-backed flags**, editable in admin settings, cached with a short TTL.
- **Server is the source of truth.** A `assertFlag(key)` guard runs in server actions and
  route handlers; a `useFlag(key)` hook conditionally renders UI. UI hiding is cosmetic —
  the server still rejects.
- **Fail closed.** When a gated feature is off, server-side returns **403/404** and the UI
  hides the entry point. This is not "hidden but reachable"; the endpoint refuses.
- **Shipped flags:** `deposits_enabled`, `withdrawals_enabled`, `registration_enabled`,
  `claim_submission_enabled`, plus a per-provider `enabled` toggle
  (`paystack`/`stripe`/`paypal`/`simulated`).
- **Permission guards** compose with flags: e.g. the admin payment-settings routes require
  both a valid session and `manage_payment_settings`; every admin mutation checks its
  specific permission key.

---

## 9. Auth, account lifecycle & KYC

### 9.1 Auth
- Email/password with **email verification**, password reset, rate limiting on auth
  endpoints, and **optional TOTP 2FA** enforced on money-related actions (withdrawal
  requests, adding payout methods, changing payment settings).
- Registration collects: name, email, **country selector**, **international phone with
  dial code**, and **currency**. Region-neutral copy.

### 9.2 Account lifecycle
- New users may be `pending`. Pending users can **log in to a limited dashboard** that
  shows "verification in progress" rather than being locked out. `active` unlocks full
  functionality; `suspended` blocks money actions.

### 9.3 KYC (tiered, admin-reviewed)
- Levels: `none` → `basic` → `full`. Higher levels unlock higher withdrawal limits.
- Flow mirrors claims: user uploads ID document (+ selfie for `full`) → enters the KYC
  review queue → admin approves/rejects with notes → `users.kyc_level` updated.
- **Gating:** withdrawals require a minimum KYC level (configurable in `app_settings`).
  This is an anti-fraud/compliance control, not a pay-gate.
- KYC documents are private, encrypted-at-rest metadata, admin-only via short-lived
  presigned URLs, with a retention note in the compliance section.

---

## 10. Route map

- **Marketing (public):** `/`, `/how-it-works`, `/programs`, `/faq`, `/about`, `/contact`
- **Auth:** `/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`
- **User dashboard:** `/dashboard`, `/claims/new`, `/claims/:id`, `/wallet`,
  `/withdrawals`, `/payout-methods`, `/kyc`, `/settings`
- **Admin (shadcn):** `/admin`, `/admin/claims`, `/admin/claims/:id`, `/admin/kyc`,
  `/admin/users`, `/admin/withdrawals`, `/admin/payment-settings`, `/admin/feature-flags`,
  `/admin/settings`

---

## 11. State machines

- **Claim:** `draft → submitted → under_review → (approved → credited) | rejected`;
  `credited → reversed` (admin, within a clawback window, compensating debit).
- **Withdrawal:** `requested → processing → completed | failed | cancelled`
  (debit on `requested`, reverse on `failed`/`cancelled`).
- **Deposit:** `initiated → pending → succeeded | failed` (credit on `succeeded`).
- **KYC:** `pending → approved | rejected`.
- **Account:** `pending → active → suspended` (and back to `active`).

Every transition records the actor and timestamp in `audit_logs`, and disallowed
transitions are rejected by the service layer, not just the UI.

---

## 12. Security & compliance

- **Money-path safety:** atomic conditional updates, append-only ledger, idempotency keys,
  and integer minor units (see §7). Integration tests target these paths first.
- **Secrets & PII:** payout details and provider keys are AES-256-GCM encrypted at rest,
  masked on display, and admin-access only. No raw card numbers are ever stored — live
  payments use provider tokenization/checkout.
- **AuthZ everywhere:** server-side permission + flag checks on every mutation; fail
  closed.
- **Abuse controls:** rate limiting on auth and claim submission; duplicate-proof and
  per-user claim caps configurable in `app_settings`; velocity checks on withdrawals.
- **Audit trail:** every money/admin action logged with actor + timestamp.

### 12.1 Compliance caveats to surface to the client
> This is a demo/portfolio application, **not** a licensed bank or money-services
> business. Before handling real customer funds, the client must address: money-
> transmitter/EMI licensing in the target jurisdiction, an AML/CTF program, a real KYC
> vendor, ID-document retention and privacy (GDPR/NDPR as applicable), and terms/privacy
> disclosures. The simulated-money default and gated deposits keep the submission safe to
> host without these in place.

---

## 13. UI/UX principles

- **Mobile-first, responsive** across user, admin, and marketing.
- **One design system:** shadcn/ui primitives in `components/ui`, composed reusable
  components in `components/shared`. Admin uses shadcn data tables, dialogs, and forms.
- **Accessible:** semantic HTML, labeled inputs, focus states, adequate contrast, keyboard
  navigation.
- **Money is legible:** amounts always show currency symbol + code; states use consistent
  badges (pending/approved/rejected/etc.).
- **Clean copy:** region-neutral, no hype, no fabricated claims.

---

## 14. Testing strategy

- **Unit (Vitest):** `Money` value object, ledger service (credit/debit/reverse/
  idempotency/overdraw), state-machine transition guards, flag/permission guards, crypto
  helpers.
- **Integration:** full money paths — claim approval → credit, withdrawal request → debit
  → complete/fail → reverse, deposit confirmation → credit, concurrent-request safety.
- **Guards:** gated-feature-off returns 403/404 server-side; permission checks reject
  unauthorized admins.
- Optional Playwright E2E for the core happy path before submission.

---

## 15. Phased roadmap

Each phase ends in a demoable, deployed increment. "Money paths" get tests as they land.

### Phase 0 — Foundation
Repo, tooling (TS strict, ESLint, Prettier, Husky), Tailwind + shadcn init, base layout &
design tokens, Drizzle + Neon wired, CI, and a "hello" deploy verified on **Vercel**
(primary) plus a documented Workers + VPS build.
**Done when:** the skeleton deploys on Vercel and builds for Workers and Docker.

### Phase 1 — Auth + RBAC + Feature flags
Registration (country, intl phone, currency), email verification, login, password reset,
account status + limited pending dashboard, roles/permissions, and the DB-backed feature-
flag system with server + client guards.
**Done when:** a user can register→verify→login; an admin can toggle a flag and see it
fail closed; permission guards enforced.

### Phase 2 — Claims
Repeatable line-item claim form with R2 presigned proof uploads, draft/submit lifecycle,
claim list/detail, and the user dashboard shell.
**Done when:** a user submits a multi-item claim with image proofs and sees it as
`submitted`.

### Phase 3 — Admin review + wallet crediting (ledger core)
Admin claims queue, approve/reject with notes, the append-only ledger, atomic crediting,
and the wallet view with transaction history. **This is the money core** — ledger unit +
integration tests land here.
**Done when:** approving a claim credits the wallet exactly once, the ledger sums to the
balance, and concurrency/idempotency tests pass.

### Phase 4 — Withdrawals + payout methods
Encrypted payout methods (masked display), withdrawal request (debit-on-request), admin
fulfillment queue, status lifecycle with reversal-on-fail, min-threshold + balance safety.
**Done when:** an end-to-end claim → credit → withdraw → complete works, and a failed
withdrawal correctly restores balance.

### Phase 5 — KYC
Tiered verification (basic/full), ID + selfie upload to private R2, admin KYC queue, and
withdrawal gating by KYC level.
**Done when:** withdrawals are blocked below the configured KYC level and unblock after
admin approval.

### Phase 6 — Deposits + payment providers (gated)
Admin payment-settings with encrypted keys, the `PaymentProvider` interface +
`SimulatedProvider`, and the deposit flow fully behind `deposits_enabled` + provider
`enabled` + `manage_payment_settings` — fail closed when off.
**Done when:** deposits work when enabled and every deposit route/API returns 403/404 when
disabled.

### Phase 7 — Marketing, polish, rebate extensions & hardening
Marketing pages, in-app notifications, statement/CSV export, accessibility + responsive
polish, full test pass, security review, and deployment hardening. Plus a **menu of
optional rebate extensions** (build the subset the client wants):
- **Rebate programs:** admin-defined programs with category-based rates, caps, and
  start/end windows; claims optionally reference a program.
- **Referral bonuses (legitimate):** a referrer earns a bonus only when a referee's
  **first claim is approved** — tied to a real reviewed event, never to signups.
- **Loyalty tiers:** Bronze/Silver/Gold derived from lifetime approved rebates, unlocking
  higher limits or faster review — never a "deposit to rank up" scheme.
- **Campaigns:** time-boxed boosted-rate programs.
- **Notifications & statements:** claim/withdrawal status emails, downloadable history.

**Done when:** the app is submission-ready — responsive, tested, documented, and deployed.

---

## 16. Decisions locked & assumptions

**Locked (this session):**
- ORM: **Drizzle**. DB provider: **Neon** (Supabase/VPS Postgres = connection-string
  swap).
- **No P2P transfer** in v1 (ledger stays transfer-ready for later).
- **Single currency per user, no FX** in v1.
- Primary host: **Vercel Hobby**; Workers + VPS verified portable.
- Password hashing: **scrypt** (portable substitute for argon2/bcrypt).
- Withdrawals: **debit-on-request**, reverse on failure (refinement of the brief).

**Assumptions (flag if wrong):**
- Deposits ship **off by default**; the client enables providers when ready.
- Email delivery uses Resend on hosted targets, SMTP on a VPS.
- KYC in v1 is **manual admin review** (no third-party vendor); a vendor can slot behind
  the same interface later.

---

## 17. Out of scope (v1)

Real fund custody/licensing, FX/multi-currency conversion, P2P transfers, third-party KYC
vendors, native mobile apps, and any affiliate/link-tracking mechanics.
