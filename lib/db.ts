import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { env } from "@/lib/env";

// Neon WebSocket adapter: supports interactive transactions (prisma.$transaction),
// which the ledger's compound operations depend on (design spec §4, §7).
const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });

// Reuse a single client across hot reloads in development to avoid exhausting
// connections; a fresh instance per invocation is fine in production/serverless.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
