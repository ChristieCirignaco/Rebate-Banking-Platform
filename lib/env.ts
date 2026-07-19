import { z } from "zod";

// Validated environment variables. Import `env` wherever configuration is needed;
// misconfiguration fails fast at startup rather than surfacing as a runtime error.
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // Postgres for the app runtime (Docker locally, Neon in production).
  DATABASE_URL: z.string().min(1),
  // Direct connection for `prisma migrate` / `prisma studio`.
  DIRECT_URL: z.string().min(1),
  // Better Auth: signing secret (>= 32 chars) and the app base URL.
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().min(1).default("http://localhost:3000"),
  // Dedicated key for encrypting payment-gateway credentials at rest. Optional: falls
  // back to BETTER_AUTH_SECRET, but set this to decouple payment secrets from the auth
  // signing secret (and rotate them independently).
  PAYMENT_CREDENTIALS_KEY: z.string().min(32).optional(),
  // Resend transactional email. When RESEND_API_KEY is unset, sendEmail() logs to the
  // server console (dev). RESEND_FROM optionally overrides the From identity; otherwise
  // the General-settings From name/email is used, falling back to a resend.dev sender.
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  // Shared secret for /api/cron. Optional so local dev and existing deploys keep booting —
  // but the route REFUSES to run without it, rather than defaulting to open. Vercel Cron sends
  // it as `Authorization: Bearer <CRON_SECRET>`; any other scheduler can do the same.
  CRON_SECRET: z.string().min(16).optional(),
});

export const env = schema.parse(process.env);
