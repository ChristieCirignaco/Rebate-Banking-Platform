import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/password";

// Production bootstrap. Deliberately NOT `prisma db seed` — that one builds a demo world
// (28 users, fabricated transactions, vouchers, KYC submissions, tickets), which is exactly
// what must never exist in a real banking database. This creates only what a live install
// cannot function without:
//
//   1. one super_admin, from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
//   2. the currencies, because signup derives every user's primary wallet from the default one
//
// Everything else is configured by that admin through /admin once they're in: deposit and
// withdrawal methods, payment gateways, KYC templates, limits, branding. Feature flags and
// settings need no rows at all — both fall back to their compile-time defaults.
//
// Idempotent: safe to re-run. It upserts, never deletes, and it will not touch an existing
// admin's password unless RESET_ADMIN_PASSWORD=1 is set.

const prisma = new PrismaClient();

// Mirrors prisma/seed.ts so a production admin is configured identically to a local one.
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", type: "fiat", rate: 1, isDefault: true, autoWallet: true },
  { code: "EUR", name: "Euro", symbol: "€", type: "fiat", rate: 0.96, isDefault: false, autoWallet: false },
  { code: "GBP", name: "British Pound", symbol: "£", type: "fiat", rate: 0.79, isDefault: false, autoWallet: false },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", type: "fiat", rate: 1580, isDefault: false, autoWallet: false },
  { code: "USDT", name: "Tether", symbol: "₮", type: "crypto", rate: 1, isDefault: false, autoWallet: false },
];
const ROLE_KEYS = ["sender", "voucher", "payment", "withdraw"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(
      `${name} is required. This script writes a real admin to a real database, so it will not invent a default.`,
    );
  }
  return value.trim();
}

async function main() {
  const email = requireEnv("ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME?.trim() || "Admin";

  // The seed's fallbacks ("12345678", "admin@gmail.com") exist for local convenience and would
  // be a published credential here — the template that names them is a public file.
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  if (["12345678", "ChangeMe123!", "password"].includes(password)) {
    throw new Error("ADMIN_PASSWORD is a known default — choose a real one.");
  }

  const host = (process.env.DATABASE_URL ?? "").replace(/^.*@/, "").replace(/\/.*$/, "");
  console.log(`→ database: ${host || "(unknown)"}`);

  // ----- Currencies -----
  for (const spec of CURRENCIES) {
    const currency = await prisma.currency.upsert({
      where: { code: spec.code },
      update: {}, // never clobber rates an admin has since tuned
      create: {
        code: spec.code,
        name: spec.name,
        symbol: spec.symbol,
        type: spec.type,
        rate: spec.rate,
        isDefault: spec.isDefault,
        autoWallet: spec.autoWallet,
        isActive: true,
      },
    });
    for (const role of ROLE_KEYS) {
      await prisma.currencyRole.upsert({
        where: { currencyId_role: { currencyId: currency.id, role } },
        update: {},
        create: {
          currencyId: currency.id,
          role,
          feeType: "percent",
          feeValue: 1.5,
          minAmount: 1,
          maxAmount: 10000,
          enabled: true,
        },
      });
    }
  }
  console.log(`✓ currencies: ${CURRENCIES.map((c) => c.code).join(", ")} (USD default)`);

  // ----- The admin -----
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "super_admin", status: "active", emailVerified: true },
    create: {
      id: randomUUID(),
      email,
      name,
      role: "super_admin",
      emailVerified: true,
      status: "active",
      username: email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase(),
      currency: "USD",
    },
  });

  // Better Auth keeps the password on the credential Account row, not on User — without this
  // the admin exists but cannot sign in.
  const hashed = await hashPassword(password);
  const cred = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: "credential" },
    select: { id: true },
  });
  if (!cred) {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: admin.id,
        providerId: "credential",
        userId: admin.id,
        password: hashed,
      },
    });
    console.log(`✓ admin created: ${email}`);
  } else if (process.env.RESET_ADMIN_PASSWORD === "1") {
    await prisma.account.update({ where: { id: cred.id }, data: { password: hashed } });
    console.log(`✓ admin password reset: ${email}`);
  } else {
    console.log(`• admin already exists: ${email} (password untouched — RESET_ADMIN_PASSWORD=1 to change)`);
  }

  if (!existing) {
    // The admin needs a wallet like anyone else; signup's hook doesn't run for a seeded row.
    await prisma.wallet.upsert({
      where: { userId_currency: { userId: admin.id, currency: "USD" } },
      update: {},
      create: { userId: admin.id, currency: "USD", isDefault: true },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    currencies: await prisma.currency.count(),
    transactions: await prisma.walletTransaction.count(),
  };
  console.log(`\ndone. users=${counts.users} currencies=${counts.currencies} transactions=${counts.transactions}`);
  if (counts.users > 1) {
    console.log("note: more than one user exists — this database is not empty.");
  }
  console.log("\nNext: sign in at /login, then configure deposit/withdraw methods, gateways and");
  console.log("KYC templates from /admin. Feature flags and settings already have safe defaults.");
}

main()
  .catch((error) => {
    console.error("\n✗ bootstrap failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
