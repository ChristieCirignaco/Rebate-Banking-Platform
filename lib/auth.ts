import { randomUUID } from "node:crypto";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin, twoFactor } from "better-auth/plugins";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
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
      void sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Reset your Rebate Bank password: ${url}\n\nIf you didn't request this, you can ignore this email.`,
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
      void sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Verify your email: ${url}`,
      });
    },
  },

  plugins: [
    adminPlugin({ ac, roles, defaultRole: "user", adminRoles: ["admin", "super_admin"] }),
    // TOTP authenticator + 10 encrypted backup codes. The row is created unverified and
    // only flips twoFactorEnabled once the user confirms a code during enrollment.
    twoFactor({ issuer: "Rebate Bank", skipVerificationOnEnable: false }),
    nextCookies(), // keep last so server actions can set cookies
  ],
});
