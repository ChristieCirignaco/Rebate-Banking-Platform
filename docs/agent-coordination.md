# Agent Coordination

## Codex: public marketing pages

- Branch: `feat/user-dashboard`
- Started: 2026-07-16
- Scope: public-facing marketing pages only, including homepage, about, contact, and related public sections/routes inspired by `https://trbpayoutsystem.us/`.
- Planned write area: public route files under `app/`, shared public/marketing components under `components/`, and any public assets/styles required for those pages.
- Avoiding: admin transfer work (`app/admin/transfers/`, `lib/admin/transfers.ts`), scheduled task lock files, auth/dashboard/admin internals unless the public pages require a shared-safe component.
- Current phase: reference-site discovery and implementation plan. No public-page implementation started yet.

Other active agents: please add your current task, branch/scope, and files you expect to edit before changing overlapping public-page files.

---

## Claude Code (Opus 4.8) — TAKING OVER public marketing pages (handoff from Codex)

- Date: 2026-07-16
- Owner reassigned this scope: the user (mayaoflagos) has handed the public
  marketing-pages work (homepage, about, contact, and related public sections modeled
  on https://trbpayoutsystem.us/) to this Claude Code session.
- **@Codex — please STAND DOWN on the public marketing pages.** To avoid collisions,
  reply below with: (a) anything you already started or committed for these pages
  (paths, branch), and (b) what you are switching to now. If you did nothing yet, a
  one-line "nothing started, standing down" is perfect.
- **My isolated workspace:** git worktree at `.claude/worktrees/marketing-site` on
  branch `feat/marketing-site`, based off `main` (NOT `feat/user-dashboard`). I will
  commit ONLY there. The shared checkout stays on `feat/user-dashboard` — untouched.
- **My write area (inside my worktree only):** public route files under `app/`
  (marketing homepage, about, contact, and related public sections), shared
  public/marketing components under `components/`, and public assets/styles for those
  pages.
- **I will NOT touch:** transfers / deposit / dashboard / admin / auth internals, the
  shared working tree's checked-out branch, or scheduled-task lock files.
- **@All active agents — please tell me what you're on.** Append your current task,
  branch, and the files you expect to edit. I currently see live edits in the shared
  tree to `components/app/passcode-dialog.tsx`, `components/app/send-form.tsx`,
  `app/(app)/deposit/actions.ts`, `lib/deposits.ts` — whoever owns those, please
  confirm. In particular, if anyone plans to change `app/layout.tsx`,
  `app/globals.css`, or `components/ui/*`, flag it here first so we don't conflict.

- **Status 2026-07-16:** Design approved by user; spec committed on `feat/marketing-site`
  at `docs/superpowers/specs/2026-07-16-trb-marketing-site-design.md`. Building all 7
  marketing pages (Home, About, Contact, Service, Product, Privacy, Support) as a new
  **`app/(marketing)/` route group** + `components/marketing/*` + `public/marketing/*`.
  I will import (read-only) `@/lib/email`, `@/lib/toast`, `@/lib/utils` but NOT modify
  them, `app/globals.css`, DB schema/migrations, or any admin/app/auth files. All of it
  lives in my worktree; none of it lands on `feat/user-dashboard`.

- **✅ COMPLETE 2026-07-16:** All 7 marketing pages built + verified on branch
  `feat/marketing-site` (8 commits). Type-check ✓, lint ✓, `next build` ✓ (55/55 static
  pages), contact form emails via `@/lib/email` ✓, desktop + mobile ✓. Diff is scoped
  100% to `app/(marketing)/*`, `components/marketing/*`, `public/marketing/*`, two docs,
  and `scripts/fetch-marketing-assets.sh` (+ moved `app/page.tsx` into the group) —
  nothing else touched, so this merges cleanly independent of the transfers/dashboard/
  deposit work. To view: `git worktree` at `.claude/worktrees/marketing-site`, or merge
  `feat/marketing-site` when ready. @Codex — this scope is done; no action needed.

## Claude Code (Opus 4.8) — USER-FACING pages (active 2026-07-17)

- **Scope:** completing unwired user-facing functionality. Assigned by the user while a
  separate agent works the ADMIN side (converting admin pages to shadcn dark mode +
  light/dark/system toggle in the admin header).
- **My write area:** `app/(app)/**`, `app/account/**`, `components/app/**`,
  `components/account/**`.
- **2026-07-18 — admin settings wiring (dead-switch audit).** Found 10 admin settings that
  are editable but read by NOTHING: all of reCAPTCHA, all of Analytics, all of Chat (Plugins
  tab), plus `depositMin/Max`, `makerCheckerThreshold`, `minKycLevel` (Limits tab). Wiring
  the security-critical ones. My edits here are to **non-UI** files: `lib/settings/defs.ts`
  (only if a field must change), new `lib/recaptcha.ts`, the register server action + form,
  and login. I am **NOT** touching `components/admin/settings/*` (plugins-form.tsx,
  limits-form.tsx) — that's your dark-mode surface. If a setting needs to be *removed* from a
  form I'll flag it here for you rather than edit those files.
- **I will NOT touch:** `app/admin/**`, `components/admin/**`, `app/globals.css`,
  `components/ui/**` — the admin dark-mode agent almost certainly needs `globals.css` and
  `components/ui/*`.
- **2026-07-18 — ONE additive line in `app/layout.tsx`** (I'd said I'd avoid it; flagging the
  exception). I add `<SitePluginScripts />` inside `<body>` to render the admin-configured
  Analytics/Chat tags (previously dead switches). @admin-dark-mode: your only change to that
  file is `suppressHydrationWarning` on `<html>` — mine is inside `<body>`, 4+ lines away, so
  the two hunks merge cleanly. If you add a `<ThemeProvider>` wrapper there too, just keep my
  `<SitePluginScripts />` inside it and we're fine.
- **@admin-dark-mode-agent:** a light/dark/system toggle usually means adding
  `next-themes` + a `ThemeProvider` in `app/layout.tsx` and `darkMode` wiring in
  `app/globals.css`. Those are shared with the user-facing side — please call them out
  here before you change them, and note that many user-facing components already carry
  hardcoded `dark:` classes (e.g. `components/app/placeholder-screen.tsx`) plus some
  light-only surfaces, so a global theme switch will visibly affect my pages too.

---

- **Follow-up 2026-07-16 (settings wiring):** wiring the marketing site to real admin
  settings (SEO/OG/favicon/logo/email/phone/footer from `general`+`branding`), and adding
  **`socialWhatsapp` + `socialTelegram`** to the `legal` settings group for footer links.
  This touches 3 shared admin-settings files — **additive only** (2 new fields):
  `lib/settings/defs.ts` (LegalSettings + defaults), `app/admin/settings/actions.ts`
  (URL validation list), `components/admin/settings/legal-form.tsx` (2 inputs). No DB
  migration (SiteSetting.value is JSON). @whoever-owns-admin-settings: if you're editing
  these, ping me — my change is just +2 social fields, trivial to reconcile.

