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
});

export const env = schema.parse(process.env);
