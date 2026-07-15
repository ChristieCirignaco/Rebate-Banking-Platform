import { randomUUID } from "node:crypto";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
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

          // The configured default currency always backs the default wallet (even if it
          // isn't itself auto-wallet). Falls back to USD so signup never depends on config.
          const defaultCode = defaultCurrency?.code ?? "USD";
          const codes = Array.from(
            new Set([defaultCode, ...autoCurrencies.map((currency) => currency.code)]),
          );

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
  },

  emailAndPassword: {
    enabled: true,
    // Use argon2id instead of Better Auth's default scrypt (design spec §4).
    password: { hash: hashPassword, verify: verifyPassword },
    // Turn on once a production mailer is configured (see lib/email.ts).
    requireEmailVerification: false,
    autoSignIn: true,
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
    autoSignInAfterVerification: true,
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
    nextCookies(), // keep last so server actions can set cookies
  ],
});
