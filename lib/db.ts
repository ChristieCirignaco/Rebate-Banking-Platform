import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

// Default Prisma engine over DATABASE_URL. Local Docker Postgres and production Neon
// differ only by connection string, so environments switch with env vars — no driver
// adapter needed now that we run on Node everywhere (design spec §4).
// Reuse a single client across dev hot reloads to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
