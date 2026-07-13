import { z } from "zod";

// Validated environment variables. Import `env` wherever configuration is needed;
// misconfiguration fails fast at startup rather than surfacing as a runtime error.
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // Neon pooled connection used by the app at runtime.
  DATABASE_URL: z.string().min(1),
  // Neon direct connection used by `prisma migrate` / `prisma studio`.
  DIRECT_URL: z.string().min(1),
});

export const env = schema.parse(process.env);
