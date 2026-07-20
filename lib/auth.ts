import { randomUUID } from "node:crypto";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin, twoFactor } from "better-auth/plugins";

import { afterResponse } from "@/lib/after-response";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { APIError, createAuthMiddleware } from "better-auth/api";

import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email/template";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { MAX_WALLETS } from "@/lib/wallets";
import { ac, roles } from "@/lib/permissions";
import { hashPassword, verifyPassword } from "@/lib/password";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Generate UUID ids for all Better Auth models (user/session/account/verification).
  advanced: { database: { generateId: () => randomUUID() } },

  // Give every new user a wallet for each active auto-wallet currency (the default
  // currency backs their default wallet). Falls back to a USD wallet so signup never
  // depends on currency config existing yet.
  databaseHooks: {
    user: {
      create: {
        // Self-registration must land as `pending` ATOMICALLY, in the same insert as the
        // account — not via a follow-up update that could be lost to a crash and leave an
        // unapproved user `active` (the column defaults to "active"). Keyed on the public
        // sign-up endpoint, so admin-created users (auth.api.createUser, a different path)
        // keep the default active/approved.
        before: async (user, context) => {
          if (context?.path === "/sign-up/email") {
            return { data: { ...user, status: "pending" } };
          }
        },
        after: async (user) => {
          const [defaultCurrency, autoCurrencies] = await Promise.all([
            prisma.currency.findFirst({
              where: { isDefault: true },
              select: { code: true },
            }),
            prisma.currency.findMany({
              where: { isActive: true, autoWallet: true },
              select: { code: true },
              orderBy: { code: "asc" },
            }),
          ]);

          // The configured default currency always backs the primary wallet (even if it isn't
          // itself auto-wallet). Falls back to USD so signup never depends on config.
          const defaultCode = defaultCurrency?.code ?? "USD";
          // Primary first, then any auto-wallet currencies the admin configured — capped at
          // MAX_WALLETS, since a user may hold at most that many (lib/wallets.ts). The primary
          // is always index 0, so the cap can only ever drop auto-wallet extras, never it.
          const codes = Array.from(
            new Set([defaultCode, ...autoCurrencies.map((currency) => currency.code)]),
          ).slice(0, MAX_WALLETS);

          await prisma.wallet.createMany({
            data: codes.map((code) => ({
              userId: user.id,
              currency: code,
              isDefault: code === defaultCode,
            })),
            skipDuplicates: true,
          });
        },
      },
    },
    session: {
      create: {
        // Stamp the user's last login on every session creation, so the "online" dot and the
        // "Last Login" column reflect reality (previously lastLoginAt was only ever seeded and
        // never updated on an actual sign-in). Keyed on userId — NOT the session id — so it is
        // immune to the throwaway-session race described below (that concern is specifically
        // about child rows keyed on the session). Best-effort: never block a sign-in over it.
        after: async (session) => {
          try {
            await prisma.user.update({
              where: { id: session.userId },
              data: { lastLoginAt: new Date() },
            });
          } catch {
            // ignore — a last-login timestamp must never fail the login itself
          }
        },
      },
    },
    // Note: the "email OTP on login" gate is intentionally NOT wired as a session-create
    // hook. Better Auth's 2FA sign-in creates a throwaway session and immediately deletes
    // it to start the challenge, which races any hook that writes a child row keyed on the
    // session id. Instead the gate is lazy + fail-closed: see lib/login-otp.ts — a session
    // needs verification until it carries a `verifiedAt` marker, and the code is minted when
    // the user reaches /verify-otp (where the session is guaranteed to exist).
  },

  emailAndPassword: {
    enabled: true,
    // Use argon2id instead of Better Auth's default scrypt (design spec §4).
    password: { hash: hashPassword, verify: verifyPassword },
    // Login is never blocked on email verification: an already-approved (active) user reaches
    // the dashboard even if their email is unverified (we only show an indicator). Email
    // verification is enforced only as a registration step — see the account lifecycle in
    // lib/auth-guards.ts (requireActiveUser) and app/register.
    requireEmailVerification: false,
    // Registration must NOT create a session: a self-registered user is `pending` and has to
    // verify their email and then be approved by an admin before they can sign in. Login
    // (sign-in/email) still creates a session normally; the status guard gates access.
    autoSignIn: false,
    // Enables /forgot-password + /reset-password. Fire-and-forget like the verify email.
    sendResetPassword: async ({ user, url }) => {
      // Rendered through the shared template like every other mail: it also picks up the
      // admin-configured brand name, which the old hardcoded "Rebate Bank" string ignored.
      afterResponse(async () => {
        const mail = await renderEmail({
          audience: "user",
          heading: "Reset your password",
          paragraphs: [
            "We received a request to reset your password. Use the button below to choose a new one.",
          ],
          cta: { label: "Reset password", url },
          note: "If you didn't request this, you can safely ignore this email — your password won't change.",
        });
        await sendEmail({
          to: user.email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        });
      });
    },
  },

  // Built-in rate limiting (memory store). The global cap covers the whole /api/auth
  // surface; the custom rule throttles credential sign-in to 5 tries / 15 min per IP so a
  // failed-login flood is stopped before it reaches argon2 verification.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 900, max: 5 },
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // Verifying the email must NOT sign the user in — after registration they stay signed
    // out and their account waits for manual admin approval. Better Auth then just redirects
    // to the callbackURL (see app/register: /verify-email?registered=1) with no session.
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      // Fire-and-forget: never await (timing + serverless timeout risk).
      afterResponse(async () => {
        const mail = await renderEmail({
          audience: "user",
          heading: "Verify your email address",
          paragraphs: [
            "Confirm this address to finish setting up your account.",
            "Your account is reviewed and approved by our team after verification, so you'll hear from us again once it's ready.",
          ],
          cta: { label: "Verify email", url },
          note: "If you didn't create an account, you can ignore this email.",
        });
        await sendEmail({
          to: user.email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        });
      });
    },
  },

  plugins: [
    adminPlugin({
      ac,
      roles,
      defaultRole: "user",
      adminRoles: ["admin", "super_admin"],
      // "Login as User" impersonation: a 1-hour session, and never allow impersonating another
      // admin-tier account (no role here holds `impersonate-admins`, so this is belt-and-braces).
      impersonationSessionDuration: 60 * 60,
      allowImpersonatingAdmins: false,
    }),
    // TOTP authenticator + 10 encrypted backup codes. The row is created unverified and
    // only flips twoFactorEnabled once the user confirms a code during enrollment.
    twoFactor({ issuer: "Rebate Bank", skipVerificationOnEnable: false }),
    nextCookies(), // keep last so server actions can set cookies
  ],

  // Captcha enforcement for the auth endpoints the forms hit directly.
  //
  // Why a hook and not better-auth's own `captcha` plugin: that plugin takes a STATIC
  // `secretKey` at construction, but ours lives in admin Settings → Plugins (encrypted at rest,
  // editable at runtime). A plugin would have to read the database at module init and would go
  // stale the moment an admin rotated the key. A before-hook runs per request, so it reads the
  // current settings every time and reuses lib/recaptcha's verifier — the same one /register
  // already uses, including its fail-open rules for "not configured" and "Google unreachable".
  //
  // Endpoints are deliberately NOT better-auth's defaults. `/sign-up/email` is excluded because
  // registration goes through our own server action, which already verifies the token and then
  // calls auth.api.signUpEmail server-side — that internal call carries no captcha header, so
  // guarding it here would break registration outright.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Every endpoint an unauthenticated (or half-authenticated) visitor can hammer. The
      // second-factor ones matter most: a 6-digit TOTP or an emailed OTP is brute-forceable in
      // a way a password isn't, and they sit BEHIND a correct password — so whoever is knocking
      // already has one valid credential. The value is the v3 action name.
      const GUARDED: Record<string, string> = {
        "/sign-in/email": "login",
        "/request-password-reset": "forgot-password",
        "/reset-password": "reset-password",
        "/two-factor/verify-totp": "two-factor",
        "/two-factor/verify-backup-code": "two-factor",
        "/two-factor/verify-otp": "two-factor",
        // Resending a verification email is an email-bomb vector aimed at someone else's inbox.
        "/send-verification-email": "verify-email",
      };
      const action = GUARDED[ctx.path];
      if (!action) return;

      // Same header the official plugin uses, so the client contract is the conventional one.
      const token = ctx.headers?.get("x-captcha-response") ?? undefined;
      const result = await verifyRecaptcha(token, action);
      if (!result.ok) {
        throw new APIError("BAD_REQUEST", { message: result.error });
      }
    }),
  },
});
