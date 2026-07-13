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

  emailAndPassword: {
    enabled: true,
    // Use argon2id instead of Better Auth's default scrypt (design spec §4).
    password: { hash: hashPassword, verify: verifyPassword },
    // Turn on once a production mailer is configured (see lib/email.ts).
    requireEmailVerification: false,
    autoSignIn: true,
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
    adminPlugin({ ac, roles, defaultRole: "user", adminRoles: ["admin"] }),
    nextCookies(), // keep last so server actions can set cookies
  ],
});
