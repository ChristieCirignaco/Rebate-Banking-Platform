# Rebate Banking Platform — Design Specification

- **Status:** Draft for review (v2 — hardened after adversarial review)
- **Date:** 2026-07-13
- **Author:** Engineering (with client brief)
- **Working title:** Rebate Banking (`trbrebate_banking`)

> **v2 note.** This revision fixes issues found by an adversarial review of v1: the ledger
> atomicity mechanism (now a single CTE), the DB driver strategy, an honest Cloudflare
> Workers tier, several security gaps (adjustment permissions, key management, fail-closed
> flags, webhook verification, IDOR/ownership, 2FA on the money surface), and the missing
> timezone requirement.

---

## 1. Purpose & one-paragraph summary

A web platform where users submit ("upload") products they have purchased to claim a
cashback/rebate. Each submission becomes a **claim** that an admin manually reviews.
Approved claims **credit the user's in-app wallet**. Users then request a **manual
withdrawal** of their wallet balance. Optional, admin-gated **deposits** let users fund a
wallet through real payment providers. The product is a legitimate, original rebate app —
**not** an affiliate/link-tracking model and **not** a task-to-earn scheme.

This document is the master specification. It is intentionally comprehensive so it can be
split into per-phase implementation plans. Each phase in the [roadmap](#16-phased-roadmap)
is independently buildable and demoable.

---

## 2. Product model (the rebate mechanic)

**Direct-submission rebate.** Not affiliate, no browser extension, no merchant-link
tracking, no affiliate networks. The value flow:

1. User registers (country, timezone, international phone, currency chosen at signup); a
   wallet is created in the same transaction.
2. User submits one or more products via a repeatable line-item form
   (product name, unit price, quantity, image/receipt proof).
3. Each submission becomes a **claim** in an admin review queue.
4. An admin manually **approves or rejects** the claim (with notes).
5. An approved claim writes a **credit** to the user's wallet ledger and updates the
   wallet balance. Claims are never paid out individually — value accrues to the wallet.
6. The user requests a **withdrawal** from the wallet balance; an admin fulfills it
   manually. Funds leave the spendable balance when the request is made
   (see [§7 money-safety](#7-money-model--ledger-the-critical-subsystem)).

### 2.1 Legitimacy guardrails (non-negotiable)

Enforced in copy, data model, and flows:

- **Every credit is tied to a real, reviewed event** (an approved claim, a signature-
  verified deposit, or an explicit permissioned admin adjustment). Never to signups,
  "tasks," clicks, or recruitment.
- **No pay-to-withdraw.** No activation fees. Withdrawals depend only on approved claims
  and available balance. A user never pays to receive money.
- **No guaranteed returns.** Deposits are stored value, never an "investment."
- **No fabricated affiliations.** No implied government, bank, or celebrity endorsement in
  copy or branding.
- **Deposits fail closed.** The deposit capability is gated behind a feature flag +
  provider toggle + permission and rejects requests server-side when off.
- **Referral bonuses are deferred and constrained** (see §16). If ever built, they credit
  only on a referee's *first approved claim*, exclude self/same-device/same-KYC referrals,
  and are capped — so they never become a recruitment-driven payout.

> These guardrails keep the app clear of the FTC-flagged "task-based rebate/cashback" scam
> category, where fake earnings accumulate to lure deposits.

---

## 3. Users, roles & permissions

| Role | Description |
|------|-------------|
| **user** | Submits claims, holds a wallet, requests withdrawals, manages payout methods and KYC. |
| **admin** | Reviews claims/KYC, processes withdrawals, manages settings — scoped by granular permissions. |
| **superadmin** | An admin whose role includes all permissions, including `manage_admins`. |

Admin capability is **granular**. Permission keys:

`review_claims`, `reverse_claims`, `process_withdrawals`, `manage_wallet_adjustments`,
`manage_payment_settings`, `manage_feature_flags`, `manage_users`, `manage_kyc`,
`manage_admins`.

A **role** is a named set of permission keys. Every admin action is guarded by the
*specific* permission it requires — never by "is admin" alone.

**Authorization rules (defense against privilege escalation):**
- Assigning an admin role, or editing `roles.permissions`, requires **`manage_admins`** —
  not `manage_users`. `manage_users` is limited to non-privilege attributes (status, KYC
  trigger, notes).
- An actor may never grant a permission they do not themselves hold (no self-escalation).
- **Maker-checker (dual control):** a manual wallet credit/adjustment above a configurable
  threshold requires a second admin with `manage_wallet_adjustments` to approve before it
  posts. Every adjustment carries a reason code + memo and a dedicated audit entry.

**Permission vs ownership.** A *permission* check answers "can this role do X"; an
*ownership* check answers "is this MY claim/withdrawal/payout-method/document." These are
**distinct guards**. Every user-scoped read/mutation asserts `row.user_id == session.user.id`
in addition to any permission check (see §12 IDOR).

**Role seeds & bootstrap.** System roles `user` (no admin perms) and `admin`/`superadmin`
(seeded permission sets, `is_system = true`) are created by a seed migration. The first
`superadmin` is provisioned via an env-gated one-time setup route or seed script, never a
public path.

**Session invalidation.** Suspending a user, or downgrading a role/permission, invalidates
that subject's active sessions (a per-user `session_epoch` checked on each request), so a
suspended user or demoted admin cannot keep operating on a stale session.

---

## 4. Architecture & stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 15 (App Router) + TypeScript** | Runs on Vercel Hobby (native), Cloudflare Workers (via OpenNext, Paid tier), and any VPS/Docker. |
| DB provider | **Neon serverless Postgres** (default) | Scale-to-zero with a cold start on first query after idle; **no 7-day pause** (unlike Supabase free). Portable; a VPS may run local Postgres instead (see driver row). |
| ORM | **Drizzle ORM** | Edge-native, lightweight, zero-dep, typed, and driver-flexible (works over both the Neon serverless driver and node-postgres with one schema). |
| DB driver | **`@neondatabase/serverless` WebSocket Pool** on Vercel + Workers; **`node-postgres`** adapter for a local-Postgres VPS | Better Auth and any interactive path require the WS Pool driver (Drizzle's `neon-http` cannot run `.transaction()` and Better Auth fails on it). The money ops are a single standard-SQL statement (below), so they run identically on either driver. |
| Money operations | **One standard-SQL CTE statement** (conditional balance update + ledger insert in a single query) + **idempotency keys** | Atomic and race-safe under READ COMMITTED with no interactive session; portable across Neon and node-postgres. |
| Auth | **Better Auth** (WS Pool driver) | Email/password, email verification, email-OTP, TOTP 2FA, RBAC. |
| Password hashing | **scrypt** (Better Auth's pure-JS `@noble/hashes` scrypt), cost params tuned to the Workers CPU budget | argon2/bcrypt native bindings don't run on Workers; scrypt is the portable, strong KDF. *(Documented deviation from the brief's argon2/bcrypt.)* |
| Rate limiting | **Shared-store limiter** (Better Auth DB/`secondaryStorage`), backed per target: Workers KV / Upstash on Vercel / Redis or DB on VPS | The in-memory default does not enforce across serverless isolates and must not be used. |
| UI | **Tailwind CSS + shadcn/ui (Radix)** | shadcn admin; a shared reusable component library serves user, admin, and marketing. |
| Forms & validation | **React Hook Form + Zod** (shared schemas) | One Zod schema validates on client and server. |
| File uploads | **Cloudflare R2 (S3-compatible)**, presigned via a lean signer (**`aws4fetch`**) — not the full S3 SDK on the request path | Server generates every object key under a per-user prefix; presigned PUT constrained by content-type, max size, short expiry. |
| Images | **`next/image` with `unoptimized` or a Cloudflare image loader on the Workers build** | The default loader uses `sharp`, which doesn't run on Workers. |
| PII / secrets at rest | **AES-256-GCM via Web Crypto** — key in a secret manager (never the DB), fresh 96-bit nonce per record, AAD bound to `user_id + column`, `key_version` for rotation | Encrypts payout details and provider keys; portable to all runtimes. |
| Payments | **`PaymentProvider` interface** — `SimulatedProvider` shipped; Paystack/Stripe/PayPal drop-in — with **signature-verified webhooks** | Deposit surface fail-closed behind flag + provider toggle + permission. |
| Email | **Mailer abstraction — Resend (HTTP) on edge**; SMTP via a runtime-gated **dynamic import** only in the VPS build | Raw SMTP can't run on Workers and must be tree-shaken out of the edge bundle. |
| Scheduled work | **Single job entrypoint** invoked per target (Vercel Cron / Cloudflare Cron Trigger / VPS cron) | For retention purges, token cleanup, and ledger reconciliation. v1 keeps request-path work event-driven. |
| Testing | **Vitest** (unit) + integration tests against **real Postgres** for money paths; Playwright optional later | Concurrency, idempotency, and CTE atomicity can't be validated against a mock. |
| Tooling | **ESLint + Prettier + TS strict**, Husky pre-commit | Clean, consistent, review-friendly code. |

### 4.1 Deployment portability (honest matrix)

| Target | Cost | Notes |
|--------|------|-------|
| **Vercel Hobby** | Free | **Primary submission host.** Native Node runtime; git-push deploy + CI. |
| **VPS (Docker)** | Cheap | Next.js + Postgres in Docker; node-postgres driver; SMTP available. |
| **Cloudflare Workers** | **~$5/mo (Paid)** | Via OpenNext. A real Next.js app of this scope exceeds the **3 MB Free** compressed limit (a bare OpenNext bundle is already ~3–3.5 MB), so the **Paid 10 MB** plan is required. Not a free target. |

Portability rules that constrain every choice:
- No Node-only native binaries on the request path (rules out argon2/bcrypt, `sharp`, raw
  SMTP on Workers).
- All I/O (DB **driver**, storage, email, payments, rate-limit store, scheduler) sits
  behind an interface so a target swap is an adapter/config change, not a rewrite. Swapping
  the DB is a **driver-adapter** swap (Neon WS ↔ node-postgres), not literally connection-
  string-only — the schema and the money SQL stay identical.

### 4.2 Project structure (high level)

```
app/                    # Next.js App Router (marketing, auth, dashboard, admin)
components/             # Reusable UI (ui/ = shadcn primitives, shared/ = composed)
lib/
  auth/                 # Better Auth config, session, RBAC + ownership guards
  db/                   # Drizzle schema, driver adapters, migrations, seeds
  money/                # Ledger service (CTE ops), Money value object, idempotency, reconcile
  flags/                # Feature-flag service + fail-closed guards
  payments/             # PaymentProvider interface, providers, webhook verification
  storage/              # R2 presign (aws4fetch), per-user key policy
  crypto/               # AES-GCM encrypt/decrypt (nonce, AAD, key_version)
  kyc/                  # KYC service + level/limit gating
  ratelimit/            # Shared-store limiter adapter
  scheduler/            # Single job entrypoint (retention, cleanup, reconcile)
  validation/           # Shared Zod schemas
server/                 # Server actions / route handlers grouped by domain
tests/                  # Vitest unit + integration (money paths first, real Postgres)
```

Each module has one responsibility and a small public interface. Money, flags, payments,
and KYC are UI-free services, unit-testable in isolation.

---

## 5. Money representation

- **Integer minor units only.** Every amount is a count of the currency's minor unit
  (cents, kobo) as a **`bigint`**. No floating-point money anywhere.
- **bigint end-to-end.** The pg/Neon `int8` parser and Drizzle column mode return `bigint`
  (not JS `number`, which loses precision above 2^53). The `Money` value object operates
  on `bigint`, and API responses serialize amounts as **strings** at an explicit boundary
  (bigint is not JSON-serializable).
- **Currency code** (`char(3)`, ISO 4217) travels with every amount and is **enforced at
  the DB level** (see §6.2) — not just in app code.
- **Single currency per user** (chosen at registration). Wallet, claims, and transactions
  share it. **No FX conversion** in v1.
- **Locale** is derived from the user's country (or an explicit locale field) and drives
  number/currency and date/time formatting.
- **All timestamps are `timestamptz` stored in UTC** and rendered in the viewer's timezone
  (see §6.1, §13).

---

## 6. Data model

Postgres + Drizzle. All tables have `id` (uuid), `created_at timestamptz`, and (where
mutable) `updated_at timestamptz`, all UTC. Money columns are `*_minor bigint` + `currency
char(3)`.

### 6.1 Identity & access

- **users**: `id`, `first_name`, `last_name`, `email` (unique, citext), `phone`,
  `phone_country`, `country`, `timezone` (IANA, e.g. `Africa/Lagos`), `locale`,
  `currency`, `password_hash`, `email_verified_at`, `role_id`, `status`
  (`pending` | `active` | `suspended`), `kyc_level` (`none` | `basic` | `full`),
  `two_factor_enabled`, `session_epoch int`, `created_at`, `updated_at`.
- **roles**: `id`, `name` (unique), `permissions text[]`, `is_system`.
- **sessions / accounts / verification**: Better Auth's schema.
- **audit_logs** *(append-only; no app-level update/delete)*: `id`, `actor_id`, `action`,
  `entity_type`, `entity_id`, `before jsonb`, `after jsonb`, `ip_address`, `user_agent`,
  `created_at`. Written for every money mutation, config change (settings, flags, roles,
  providers, account status), **denied authorization**, and **failed 2FA**. No plaintext
  PII/secrets ever land in `before`/`after`.

### 6.2 Wallet & ledger

- **wallets**: `id`, `user_id` (unique), `balance_minor bigint`, `currency`, `updated_at`.
  A **unique key on (`id`, `currency`)** backs the composite FK below. Balance is a
  materialized cache of the ledger; it may go **negative only via `adjustment` /
  `*_reversal` sources** (a receivable), never via a user withdrawal.
- **wallet_transactions** *(append-only ledger; never updated or deleted)*:
  `id`, `user_id`, `wallet_id`, `currency`, `direction` (`credit` | `debit`),
  `amount_minor`, `source` (`claim` | `claim_reversal` | `withdrawal` |
  `withdrawal_reversal` | `deposit` | `adjustment`), `reference_type`, `reference_id`,
  `idempotency_key` (**globally unique**), `balance_after_minor`, `reason_code`, `memo`,
  `created_at`.
  - **Currency integrity:** composite FK `(wallet_id, currency) REFERENCES wallets(id,
    currency)` rejects any ledger row whose currency differs from its wallet — silent
    currency-mixing is impossible at the DB level.
  - `balance_after_minor` is always taken from the atomic statement's `RETURNING`, never
    from a prior app-side read.

### 6.3 Claims

- **claims**: `id`, `user_id`, `program_id` (nullable), `status`
  (`draft` | `submitted` | `under_review` | `approved` | `rejected` | `credited` |
  `reversed`), `reviewer_id`, `review_notes`, `currency`, `total_minor`,
  `submitted_at`, `reviewed_at`, `credited_at`.
- **claim_items**: `id`, `claim_id`, `product_name`, `unit_price_minor`, `quantity`,
  `line_total_minor`, `proof_file_key` (server-generated R2 key), `created_at`.

### 6.4 Withdrawals & payouts

- **payout_methods**: `id`, `user_id`, `type` (`bank` | `paypal` | `mobile_money` | …),
  `encrypted_details`, `nonce`, `key_version`, `masked_label` (e.g. `•••• 4321`),
  `is_default`, `status` (`active` | `removed`), `created_at`. Raw details are never
  returned to the client; admins see them only when fulfilling a withdrawal, and each view
  is audited.
- **withdrawals**: `id`, `user_id`, `amount_minor`, `currency`, `payout_method_id`,
  `status` (`requested` | `processing` | `completed` | `failed` | `cancelled`),
  `admin_id`, `admin_notes`, `requested_at`, `processed_at`.

### 6.5 Deposits & providers (gated)

- **payment_providers**: `id`, `provider` (`paystack` | `stripe` | `paypal` |
  `simulated`), `enabled bool`, `encrypted_config`, `nonce`, `key_version`, `updated_by`,
  `updated_at`.
- **deposits**: `id`, `user_id`, `provider`, `amount_minor`, `currency`,
  `provider_reference`, `status` (`initiated` | `pending` | `succeeded` | `failed`),
  `created_at`. **Unique `(provider, provider_reference)`.**

### 6.6 KYC

- **kyc_verifications**: `id`, `user_id`, `requested_level` (`basic` | `full`),
  `status` (`pending` | `approved` | `rejected`), `document_key`, `selfie_key`,
  `document_type`, `reviewer_id`, `review_notes`, `submitted_at`, `reviewed_at`,
  `purge_after` (retention deadline). Documents live in a private R2 bucket, accessible to
  admins only via short-lived presigned GETs; every admin view is audited.

### 6.7 Programs, config & notifications

- **rebate_programs** *(optional, Phase 8)*: `id`, `name`, `description`, `rate_bps`,
  `category`, `max_rebate_minor`, `starts_at`, `ends_at`, `active`.
- **feature_flags**: `id`, `key` (unique, from a compile-time allowlist), `enabled bool`,
  `description`, `updated_by`, `updated_at`.
- **app_settings**: `id`, `key` (unique), `value jsonb`, `updated_by`, `updated_at`
  (min withdrawal threshold, min KYC level for withdrawal, per-tier withdrawal limits,
  per-claim caps, adjustment maker-checker threshold, etc.).
- **notifications**: `id`, `user_id`, `type`, `title`, `body`, `read_at`, `created_at`.

---

## 7. Money model & ledger (the critical subsystem)

The ledger is the heart of the app. Correctness rules:

1. **Append-only.** `wallet_transactions` rows are never updated or deleted. A reversal is
   a new compensating row.
2. **Cached balance is a materialization.** `wallets.balance_minor` always equals the
   signed sum of the ledger; a reconciliation job asserts this and alerts on drift.
3. **One atomic statement per money op.** Each operation is a **single CTE** so the ledger
   insert is *gated by* the balance update — there is no two-statement window. This is
   correct on Neon's non-interactive HTTP path *and* on node-postgres, under READ
   COMMITTED, with **no SELECT-then-write** anywhere.

   ```sql
   -- User debit (withdrawal): insert happens only if funds suffice
   WITH upd AS (
     UPDATE wallets
        SET balance_minor = balance_minor - $amt, updated_at = now()
      WHERE id = $wallet_id AND balance_minor >= $amt
      RETURNING balance_minor
   )
   INSERT INTO wallet_transactions
     (wallet_id, user_id, currency, direction, amount_minor, source,
      reference_type, reference_id, idempotency_key, balance_after_minor)
   SELECT $wallet_id, $user_id, $currency, 'debit', $amt, 'withdrawal',
          'withdrawal', $withdrawal_id, $idem_key, balance_minor
   FROM upd
   RETURNING id;
   ```
   Zero inserted rows ⇒ **insufficient funds** (the handler raises it). Credits use the
   symmetric CTE (`balance_minor + $amt`, no predicate). Admin **reversal/adjustment**
   debits omit the `>= $amt` predicate so a clawback can drive the balance negative.

4. **No overdraw for users.** User-initiated debits always carry the `>= $amt` predicate.
   There is no hard `CHECK (balance_minor >= 0)` (it would block legitimate clawbacks);
   the predicate + the reconciliation job are the guarantees.
5. **Idempotency.** Every ledger write carries a **globally unique** `idempotency_key`
   derived from its source event. A duplicate insert violates the unique constraint and
   rolls back the whole statement (including the balance change), so retries never
   double-post:

   | Event | Key |
   |-------|-----|
   | Claim credit | `claim:<id>:credit` |
   | Claim clawback | `claim:<id>:reversal` |
   | Withdrawal debit | `withdrawal:<id>:debit` |
   | Withdrawal reversal | `withdrawal:<id>:reversal` |
   | Deposit credit | `deposit:<provider>:<provider_reference>` |
   | Admin adjustment | `adjustment:<adjustment_id>` |

### 7.1 Operation flows

- **Claim approval → credit.** One CTE inserts a `credit` (`source=claim`) and increments
  the balance. Claim → `credited`.
- **Withdrawal request → debit-on-request.** Creating a withdrawal debits spendable balance
  via the predicated CTE (funds leave immediately so they can't be requested twice).
  Ownership is asserted first: `payout_method.user_id == session.user.id` and `active`.
  Withdrawal → `requested`.
  - **Completion:** `requested → (processing) → completed`; no balance change.
  - **Failure/cancel:** insert a compensating `credit` (`source=withdrawal_reversal`,
    idempotent) to restore balance; status → `failed`/`cancelled`.
  - **Post-completion bounce:** handled via the permissioned adjustment path (idempotent
    `adjustment:<id>`), which may drive the balance negative.

  > *Documented refinement of the brief.* The brief says "debit on completion." We debit on
  > **request** and reverse on failure, because debit-on-completion allows concurrent
  > requests against the same balance. Reserve-on-request keeps the spendable balance
  > accurate at all times.

- **Deposit confirmation → credit.** Only on a **signature-verified** provider webhook that
  also **re-asserts `deposits_enabled` + provider `enabled`** server-side. One CTE credits
  the wallet (`source=deposit`, idempotent on `deposit:<provider>:<provider_reference>`).
- **Reversal / adjustment.** Requires `reverse_claims` (clawbacks) or
  `manage_wallet_adjustments` (adjustments), a reason code + memo, maker-checker above the
  configured threshold, and an audit entry. May take the balance negative (a receivable);
  future withdrawals are blocked while balance < 0.

### 7.2 Reconciliation
A scheduled job recomputes `SUM(signed ledger)` per wallet and compares to
`balance_minor`, recording and alerting on any drift. Property-based tests assert the
invariant holds after randomized interleaved credit/debit/reversal sequences.

---

## 8. Feature flags & permission guards (first-class, fail-closed)

- **DB-backed flags** from a **compile-time allowlist** of known keys, editable in admin
  settings.
- **Default-deny semantics.** For safety-critical flags (`deposits_enabled`,
  `withdrawals_enabled`): an **unknown/missing key**, a **cache miss that can't resolve**,
  or a **DB read error** ⇒ treated as **OFF**. A gated-off feature returns **403/404**
  server-side; UI hiding is cosmetic only.
- **Immediate kill-switch.** Cache is write-through/invalidated on flag change (or a very
  short TTL) so disabling a flag during an incident takes effect at once.
- **Shipped flags:** `deposits_enabled`, `withdrawals_enabled`, `registration_enabled`,
  `claim_submission_enabled`.
- **Provider toggle is separate.** A provider's on/off lives in `payment_providers.enabled`
  (not `feature_flags`). **Deposit access requires `deposits_enabled` AND the provider's
  `enabled` AND `manage_payment_settings`** (for the admin config side). Webhooks re-assert
  these too.
- **Guards compose with permissions and ownership** (§3): every admin mutation checks its
  specific permission; every user-scoped resource checks ownership.

---

## 9. Auth, account lifecycle & KYC

### 9.1 Auth
- Email/password with **email verification**, password reset, and **shared-store rate
  limiting** on all sensitive endpoints (login, register, password-reset/verify resend,
  withdrawal create, payout-method add/edit, KYC submit, presigned-URL minting), plus a
  **failed-attempt lockout/backoff on TOTP verification**.
- **2FA on the money surface (mandatory where it matters).** TOTP enrollment is a
  **server-enforced precondition** for the first withdrawal request and the first payout-
  method add; each such action then requires a fresh TOTP challenge. Away from the money
  surface, 2FA is optional. Non-enrolled users hitting a money action are routed to
  enrollment.
- **Step-up + notify + cooldown** on account-takeover surfaces: email change, password
  change, disabling/resetting 2FA, and setting/changing the default payout method each
  require re-auth, send a notification email, and impose a short withdrawal cooldown after
  a payout-method or email change.
- Registration collects: name, email, **country**, **timezone**, **international phone with
  dial code**, and **currency**. Region-neutral copy. A **wallet is created in the same
  transaction** as the user, so every user always has exactly one wallet.

### 9.2 Account lifecycle
- New users may be `pending` and can **log in to a limited dashboard** ("verification in
  progress") rather than being locked out. `active` unlocks full functionality;
  `suspended` blocks money actions **and invalidates active sessions** (§3).

### 9.3 KYC (tiered, admin-reviewed)
- Levels: `none` → `basic` → `full`. Higher levels raise withdrawal limits.
- Flow mirrors claims: upload ID (+ selfie for `full`) → KYC review queue → admin
  approve/reject with notes → `users.kyc_level` updated.
- **Gating:** withdrawals require a minimum KYC level (from `app_settings`). Limits are
  **cumulative over a rolling window** (daily/monthly) per tier — not per-transaction — so
  they can't be bypassed by splitting withdrawals.
- **Documents:** private R2, server-generated keys under a per-user prefix, encrypted
  metadata, admin-only short-lived presigned GETs, **every view audited**, and an automatic
  **retention purge** (and deletion on account closure) via the scheduler.

---

## 10. Route map

- **Marketing (public):** `/`, `/how-it-works`, `/programs`, `/faq`, `/about`, `/contact`
- **Auth:** `/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`
- **User dashboard:** `/dashboard`, `/claims/new`, `/claims/:id`, `/wallet`,
  `/wallet/deposit` *(gated: hidden + server-rejected when deposits off)*, `/withdrawals`,
  `/payout-methods`, `/kyc`, `/settings`
- **Admin (shadcn):** `/admin`, `/admin/claims`, `/admin/claims/:id`, `/admin/kyc`,
  `/admin/users`, `/admin/withdrawals`, `/admin/deposits`, `/admin/payment-settings`,
  `/admin/feature-flags`, `/admin/settings`

---

## 11. State machines

- **Claim:** `draft → submitted → under_review → (approved → credited) | rejected`;
  `credited → reversed` (requires `reverse_claims`; emits an idempotent `claim_reversal`
  debit that may go negative).
- **Withdrawal:** `requested → completed` directly, or `requested → processing → completed`;
  and `requested|processing → failed | cancelled`. A user may cancel only from `requested`
  (before an admin picks it up). `failed`/`cancelled` emit an idempotent
  `withdrawal_reversal` credit. A post-`completed` bounce is recovered via the adjustment
  path.
- **Deposit:** `initiated → pending → succeeded | failed` (credit on `succeeded`).
- **KYC:** `pending → approved | rejected`.
- **Account:** `pending → active → suspended` (and back to `active`).

Every transition records actor + timestamp (and before/after for sensitive ones) in
`audit_logs`. Disallowed transitions are rejected by the service layer, not just the UI.

---

## 12. Security & compliance

- **Money-path safety:** single-statement CTE atomicity, append-only ledger, idempotency
  keys, integer bigint minor units, DB-level currency integrity, and reconciliation (§7).
- **AuthZ everywhere:** permission checks **and** ownership checks on every mutation;
  fail-closed flags; no-self-escalation; maker-checker on large adjustments.
- **IDOR defenses:** server generates all R2 object keys under per-user prefixes and never
  trusts a client-supplied key; downloads resolve a key from an owned resource before
  presigning; every `:id` route asserts ownership. Integration tests cover IDOR on claims,
  withdrawals, payout methods, deposits, and documents.
- **Secrets & PII:** AES-256-GCM with a secret-manager key (never in the DB), per-record
  nonce, AAD binding, `key_version` rotation; masked display; admin-only, audited access;
  no raw card numbers (provider tokenization/checkout only); no plaintext in logs or audit
  metadata.
- **Webhooks:** signature/HMAC verification, replay protection (timestamp window + the
  provider-namespaced idempotency key), and flag re-assertion inside the handler.
- **Abuse controls:** shared-store rate limits (§9.1), TOTP lockout, duplicate-proof and
  per-user claim caps, and withdrawal velocity checks — all in `app_settings`.
- **Audit trail:** append-only `audit_logs` with IP/user-agent and before/after for every
  money and config change, plus denied-authz and failed-2FA events.

### 12.1 Compliance caveats to surface to the client
> This is a demo/portfolio application, **not** a licensed bank or money-services business.
> Before handling real customer funds, the client must address: money-transmitter/EMI
> licensing in the target jurisdiction, an AML/CTF program, a real KYC vendor, ID-document
> retention/privacy (GDPR/NDPR — the app defines a retention window and auto-purge as a
> baseline), and terms/privacy disclosures. The simulated-money default and gated deposits
> keep the submission safe to host without these in place.

---

## 13. UI/UX principles

- **Mobile-first, responsive** across user, admin, and marketing.
- **One design system:** shadcn/ui primitives in `components/ui`, composed reusable
  components in `components/shared`. Admin uses shadcn data tables, dialogs, and forms.
- **Accessible:** semantic HTML, labeled inputs, focus states, contrast, keyboard nav.
- **Money & time are legible:** amounts show currency symbol + code; **timestamps render in
  the viewer's timezone**; states use consistent badges.
- **Clean copy:** region-neutral, no hype, no fabricated claims.

---

## 14. Testing strategy

- **Unit (Vitest):** `Money` (bigint) value object, ledger service (credit/debit/reverse/
  idempotency/overdraw), state-machine guards, flag/permission/ownership guards, crypto
  helpers.
- **Integration against real Postgres:** claim approval → credit; withdrawal request →
  debit → complete/fail → reverse; deposit webhook → credit; and specifically:
  1. currency-mismatch ledger insert is **rejected** by the composite FK;
  2. double-reversal / double-fail is idempotent (**no double-credit**);
  3. clawback-exceeds-balance drives a controlled negative (receivable), not a silent
     no-op;
  4. concurrent-request safety (no overdraw, no double-spend) via the real Neon/pg path;
  5. a **property-based reconciliation** test: `balance == signed ledger sum` after N
     interleaved ops.
- **Security:** gated-feature-off returns 403/404 (missing row + simulated DB error both
  fail closed); IDOR tests on every `:id` route; privilege-escalation attempts rejected.
- Optional Playwright E2E for the core happy path before submission.

---

## 15. Bigint, currency & timezone conventions (quick reference)

- Money in code: `bigint` minor units; format via `Money` using the user's locale.
- Money over the wire: strings; parse/serialize at the API boundary.
- Timestamps: `timestamptz` UTC in DB; render in `users.timezone`.
- Currency: one per user; DB composite FK enforces ledger↔wallet currency equality.

---

## 16. Phased roadmap

Each phase ends in a demoable, deployed increment. Money paths get tests as they land.

### Phase 0 — Foundation
Repo, tooling (TS strict, ESLint, Prettier, Husky), Tailwind + shadcn init, base layout &
tokens, Drizzle + driver adapters (Neon WS / node-postgres), **role seeds + first-admin
bootstrap**, CI, and a "hello" deploy verified on **Vercel** (primary) plus documented
Workers (Paid) + VPS builds.
**Done when:** the skeleton deploys on Vercel and builds for Workers and Docker; seeds and
bootstrap run.

### Phase 1 — Auth + RBAC + Feature flags
Registration (country, timezone, intl phone, currency) with **wallet created in the same
transaction**, email verification, login, password reset, account status + limited pending
dashboard, roles/permissions with the escalation rules, session invalidation, and the
fail-closed feature-flag system with server + client guards.
**Done when:** register→verify→login works; a wallet exists for every user; an admin
toggles a flag and sees it fail closed; permission + ownership guards enforced; suspend
invalidates sessions.

### Phase 2 — Claims
Repeatable line-item claim form with R2 presigned proof uploads (server-generated keys,
constrained PUT), draft/submit lifecycle, claim list/detail, user dashboard shell.
**Done when:** a user submits a multi-item claim with image proofs and sees it `submitted`.

### Phase 3 — Admin review + wallet crediting (ledger core)
Admin claims queue, approve/reject with notes, the append-only ledger, **CTE crediting**,
currency-integrity FK, and the wallet view with transaction history. **The money core** —
ledger unit + real-Postgres integration/reconciliation tests land here.
**Done when:** approving a claim credits the wallet exactly once, the ledger sums to the
balance, and concurrency/idempotency/reconciliation tests pass.

### Phase 4 — Withdrawals + payout methods
Encrypted payout methods (nonce/AAD/key_version, masked display, ownership-checked),
withdrawal request (debit-on-request), admin fulfillment queue, status lifecycle with
reversal-on-fail, KYC/threshold gating, **2FA step-up**.
**Done when:** an end-to-end claim → credit → withdraw → complete works; a failed
withdrawal restores balance; a non-2FA user is forced to enroll before withdrawing.

### Phase 5 — KYC
Tiered verification (basic/full), ID + selfie upload to private R2, admin KYC queue,
rolling-window limit gating, retention purge, audited document views.
**Done when:** withdrawals are blocked below the configured KYC level, cumulative limits
hold, and document access is audited.

### Phase 6 — Deposits + payment providers (gated)
Admin payment-settings (encrypted keys), `PaymentProvider` interface + `SimulatedProvider`,
the `/wallet/deposit` + `/admin/deposits` routes, and **signature-verified webhooks**,
fully behind `deposits_enabled` + provider `enabled` + `manage_payment_settings` — fail
closed when off.
**Done when:** deposits work when enabled; every deposit route/API/webhook returns 403/404
(or rejects) when disabled; forged webhooks are rejected.

### Phase 7 — Marketing, polish & hardening *(required)*
Marketing pages, in-app notifications, statement/CSV export, accessibility + responsive
polish, full test pass, security review, and deployment hardening across targets.
**Done when:** the app is submission-ready — responsive, tested, documented, deployed on
Vercel (and building for Workers/VPS).

### Phase 8 — Rebate extensions *(optional backlog; each its own increment)*
Pick per client demand; each ships independently with its own acceptance criteria:
- **Rebate programs:** admin-defined programs with category rates, caps, and windows;
  claims optionally reference a program.
- **Referral bonuses (constrained):** credit only on a referee's *first approved claim*,
  with self/same-device/same-KYC exclusion and hard caps.
- **Loyalty tiers:** Bronze/Silver/Gold from lifetime approved rebates → higher limits or
  faster review (never "deposit to rank up").
- **Campaigns:** time-boxed boosted-rate programs.

---

## 17. Decisions locked & assumptions

**Locked (this session):**
- ORM **Drizzle**; DB **Neon**; **driver adapters** (Neon WS on Vercel/Workers,
  node-postgres on a local-Postgres VPS) — a driver swap, not connection-string-only.
- **No P2P transfer** in v1 (ledger stays transfer-ready).
- **Single currency per user, no FX**; currency integrity enforced at the DB level.
- Primary **free** host **Vercel Hobby**; VPS cheap; **Cloudflare Workers requires the Paid
  (~$5/mo) plan** — not free at this app's size.
- Password hashing **scrypt** (pure-JS `@noble`, tuned) — portable substitute for
  argon2/bcrypt.
- Money ops are a **single CTE statement** (not two statements); overdraw guarded by the
  predicate; reversals/adjustments may go negative (receivable).
- Withdrawals **debit-on-request**, reverse on failure.
- **2FA mandatory** to reach the money surface; step-up + notify + cooldown on ATO
  surfaces.
- **All timestamps `timestamptz` UTC**, rendered in the user's timezone; timezone captured
  at registration.

**Assumptions (flag if wrong):**
- Deposits ship **off by default**; the client enables providers when ready.
- Email uses Resend on hosted targets, SMTP on a VPS (dynamic-imported).
- KYC in v1 is **manual admin review** (no third-party vendor); a vendor can slot behind
  the same interface later.
- Rate-limit shared store is provisioned per target (KV / Upstash / Redis).

---

## 18. Out of scope (v1)

Real fund custody/licensing, FX/multi-currency conversion, P2P transfers, third-party KYC
vendors, native mobile apps, and any affiliate/link-tracking mechanics.
