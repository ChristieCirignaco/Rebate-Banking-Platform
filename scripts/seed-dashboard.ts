import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

// Dev-only preview seed for the user dashboard. Gives a target account a few currency
// wallets, a spread of ledger transactions across the last ~6 weeks, and one pending deposit
// (the Home "Upcoming Payment" row) so the design can be seen fully populated.
//
// Safe to re-run: it deletes only its OWN rows (idempotency keys `dashseed:*`, deposit ids
// `SEED-DASH-*`), recomputes wallet balances from whatever real rows remain, then re-posts.
// The `dashseed:` namespace is distinct from prisma/seed.ts's `seed:<uuid>` keys, so this
// never clobbers the main seed's ledger. Relative imports + its own PrismaClient (tsx).
//
//   pnpm tsx scripts/seed-dashboard.ts [email]      (defaults to $SEED_EMAIL or the owner)

const prisma = new PrismaClient();

const EMAIL = process.argv[2] || process.env.SEED_EMAIL || "mayaoflagos@gmail.com";

type Entry = {
  daysAgo: number;
  hour: number;
  direction: "credit" | "debit";
  source: string;
  amount: number; // major units
  description: string;
  provider?: string;
};

// Per-currency ledger stories. The oldest "Opening balance" sits >30 days back so it forms
// the baseline for the Home 30-day delta; everything else lands inside the window.
const WALLETS: { currency: string; isDefault: boolean; entries: Entry[] }[] = [
  {
    currency: "USD",
    isDefault: true,
    entries: [
      { daysAgo: 45, hour: 9, direction: "credit", source: "deposit", amount: 20000, description: "Opening balance", provider: "Bank Transfer" },
      { daysAgo: 12, hour: 10, direction: "credit", source: "rebate", amount: 48.0, description: "Rebate — Amazon order" },
      { daysAgo: 11, hour: 15, direction: "debit", source: "transfer", amount: 200.0, description: "Transfer to savings" },
      { daysAgo: 10, hour: 14, direction: "debit", source: "withdrawal", amount: 500.0, description: "Withdrawal to bank", provider: "Bank Transfer" },
      { daysAgo: 8, hour: 11, direction: "credit", source: "rebate", amount: 23.5, description: "Rebate — Walmart order" },
      { daysAgo: 7, hour: 9, direction: "credit", source: "transfer", amount: 90.0, description: "Transfer from EUR wallet" },
      { daysAgo: 6, hour: 16, direction: "debit", source: "fee", amount: 2.99, description: "Processing fee" },
      { daysAgo: 5, hour: 8, direction: "credit", source: "reward", amount: 15.0, description: "Referral reward" },
      { daysAgo: 4, hour: 17, direction: "debit", source: "transfer", amount: 60.0, description: "Transfer to GBP wallet" },
      { daysAgo: 3, hour: 13, direction: "credit", source: "deposit", amount: 2000.0, description: "Card deposit", provider: "Visa" },
      { daysAgo: 2, hour: 19, direction: "debit", source: "transfer", amount: 120.0, description: "Transfer to EUR wallet" },
      { daysAgo: 1, hour: 10, direction: "credit", source: "rebate", amount: 32.75, description: "Rebate — Best Buy order" },
      { daysAgo: 0, hour: 9, direction: "credit", source: "rebate", amount: 12.2, description: "Rebate — Target order" },
    ],
  },
  {
    currency: "EUR",
    isDefault: false,
    entries: [
      { daysAgo: 40, hour: 9, direction: "credit", source: "deposit", amount: 8000, description: "Opening balance", provider: "SEPA" },
      { daysAgo: 9, hour: 12, direction: "credit", source: "rebate", amount: 60.0, description: "Rebate — Zalando order" },
      { daysAgo: 4, hour: 15, direction: "debit", source: "withdrawal", amount: 300.0, description: "Withdrawal to bank", provider: "SEPA" },
      { daysAgo: 2, hour: 19, direction: "credit", source: "transfer", amount: 110.0, description: "Transfer from USD wallet" },
    ],
  },
  {
    currency: "GBP",
    isDefault: false,
    entries: [
      { daysAgo: 40, hour: 9, direction: "credit", source: "deposit", amount: 3000, description: "Opening balance", provider: "Faster Payments" },
      { daysAgo: 7, hour: 11, direction: "credit", source: "rebate", amount: 18.4, description: "Rebate — Argos order" },
      { daysAgo: 2, hour: 14, direction: "debit", source: "fee", amount: 1.5, description: "Processing fee" },
    ],
  },
];

// Products feed the "Products" stat widget. adminNote carries a "[dashseed]" marker so re-runs
// delete only these rows.
const SEED_MARK = "[dashseed]";
const PRODUCTS: { name: string; amount: number; status: string; note: string }[] = [
  { name: "Sony WH-1000XM5 Headphones", amount: 349.99, status: "approved", note: `Verified purchase ${SEED_MARK}` },
  { name: "Instant Pot Duo 7-in-1", amount: 89.95, status: "approved", note: `Verified purchase ${SEED_MARK}` },
  { name: "Kindle Paperwhite", amount: 139.99, status: "approved", note: `Verified purchase ${SEED_MARK}` },
  { name: "Logitech MX Master 3S", amount: 99.99, status: "pending", note: SEED_MARK },
  { name: "Anker Power Bank", amount: 45.5, status: "rejected", note: `Duplicate submission ${SEED_MARK}` },
];

// Withdrawals feed the "Withdrawals" stat widget. Namespaced by txnId (SEED-DASH-WD-*).
const WITHDRAWALS: { amount: number; status: string }[] = [
  { amount: 500, status: "completed" },
  { amount: 300, status: "completed" },
  { amount: 250, status: "pending" },
];

function toMinor(major: number): bigint {
  return BigInt(Math.round(major * 100));
}

// A clean UTC timestamp `daysAgo` days back at `hour:00` — matches the app's UTC day grouping.
function backdate(daysAgo: number, hour: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, 0, 0));
}

// The same atomic CTE as lib/money/postLedgerEntry (balance update gates the row insert), but
// with an explicit backdated created_at so the seed's history spreads across real dates while
// keeping balance_after_minor chronologically correct (entries inserted oldest-first).
async function postSeedEntry(args: {
  walletId: string;
  userId: string;
  currency: string;
  direction: "credit" | "debit";
  amountMinor: bigint;
  source: string;
  idempotencyKey: string;
  description: string;
  provider: string | null;
  createdAt: Date;
}): Promise<void> {
  const id = randomUUID();
  const signed = args.direction === "credit" ? args.amountMinor : -args.amountMinor;
  await prisma.$queryRaw`
    WITH upd AS (
      UPDATE wallets
         SET balance_minor = balance_minor + ${signed}::bigint, updated_at = now()
       WHERE id = ${args.walletId}
      RETURNING balance_minor
    )
    INSERT INTO wallet_transactions
      (id, user_id, wallet_id, currency, direction, amount_minor, source,
       reference_type, reference_id, idempotency_key, balance_after_minor, status,
       provider, description, memo, created_at)
    SELECT ${id}, ${args.userId}, ${args.walletId}, ${args.currency}, ${args.direction},
           ${args.amountMinor}::bigint, ${args.source}, null, null,
           ${args.idempotencyKey}, upd.balance_minor, 'completed', ${args.provider},
           ${args.description}, null, ${args.createdAt}
    FROM upd
    RETURNING balance_after_minor
  `;
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true, email: true } });
  if (!user) {
    throw new Error(`No user with email "${EMAIL}". Pass one: pnpm tsx scripts/seed-dashboard.ts you@example.com`);
  }
  const userId = user.id;
  console.log(`Seeding dashboard preview for ${user.email} …`);

  // Ensure the wallets exist. Only one default: clear any existing default first, then set USD.
  await prisma.wallet.updateMany({ where: { userId }, data: { isDefault: false } });
  for (const w of WALLETS) {
    await prisma.wallet.upsert({
      where: { userId_currency: { userId, currency: w.currency } },
      create: { userId, currency: w.currency, isDefault: w.isDefault },
      update: { isDefault: w.isDefault },
    });
  }

  // Remove ONLY prior seed rows, then rebuild each wallet's balance from whatever remains, so
  // re-runs are idempotent and never double-count.
  const removed = await prisma.walletTransaction.deleteMany({
    where: { userId, idempotencyKey: { startsWith: "dashseed:" } },
  });
  await prisma.deposit.deleteMany({ where: { userId, txnId: { startsWith: "SEED-DASH-" } } });
  await prisma.withdraw.deleteMany({ where: { userId, txnId: { startsWith: "SEED-DASH-WD-" } } });
  await prisma.product.deleteMany({ where: { userId, adminNote: { contains: SEED_MARK } } });
  await prisma.$executeRaw`
    UPDATE wallets w
       SET balance_minor = COALESCE((
             SELECT SUM(CASE WHEN t.direction = 'credit' THEN t.amount_minor ELSE -t.amount_minor END)
               FROM wallet_transactions t WHERE t.wallet_id = w.id
           ), 0),
           updated_at = now()
     WHERE w.user_id = ${userId}
  `;
  if (removed.count > 0) console.log(`Cleared ${removed.count} previous seed transactions.`);

  // Post each wallet's entries oldest-first (keeps balance_after_minor monotonic in time).
  let posted = 0;
  for (const w of WALLETS) {
    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: w.currency } },
      select: { id: true },
    });
    if (!wallet) continue;

    const ordered = [...w.entries].sort((a, b) => b.daysAgo - a.daysAgo);
    for (let i = 0; i < ordered.length; i++) {
      const e = ordered[i];
      await postSeedEntry({
        walletId: wallet.id,
        userId,
        currency: w.currency,
        direction: e.direction,
        amountMinor: toMinor(e.amount),
        source: e.source,
        idempotencyKey: `dashseed:${userId}:${w.currency}:${i}`,
        description: e.description,
        provider: e.provider ?? null,
        createdAt: backdate(e.daysAgo, e.hour),
      });
      posted++;
    }
  }

  // One pending deposit → the Home "Upcoming Payment" strip.
  await prisma.deposit.create({
    data: {
      txnId: `SEED-DASH-DEP-${userId}`,
      userId,
      type: "manual",
      currency: "USD",
      amountMinor: toMinor(450),
      status: "pending",
      provider: "Bank Transfer",
      description: "Membership renewal",
    },
  });

  // Products → the "Products" stat widget.
  for (const p of PRODUCTS) {
    await prisma.product.create({
      data: {
        userId,
        name: p.name,
        priceMinor: toMinor(p.amount),
        currency: "USD",
        quantity: 1,
        status: p.status,
        adminNote: p.note,
        ...(p.status === "approved" || p.status === "rejected"
          ? { reviewedAt: new Date(), reviewedByName: "Seed Admin" }
          : {}),
      },
    });
  }

  // Withdrawals → the "Withdrawals" stat widget.
  for (let i = 0; i < WITHDRAWALS.length; i++) {
    const w = WITHDRAWALS[i];
    await prisma.withdraw.create({
      data: {
        txnId: `SEED-DASH-WD-${userId}-${i + 1}`,
        userId,
        type: "manual",
        currency: "USD",
        amountMinor: toMinor(w.amount),
        status: w.status,
        provider: "Bank Transfer",
        description: "Bank withdrawal",
        ...(w.status === "completed" ? { reviewedAt: new Date(), reviewedByName: "Seed Admin" } : {}),
      },
    });
  }

  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { currency: "asc" }],
    select: { currency: true, balanceMinor: true, isDefault: true },
  });
  console.log(
    `Posted ${posted} transactions, ${PRODUCTS.length} products, ${WITHDRAWALS.length} withdrawals, 1 pending deposit. Balances:`,
  );
  for (const w of wallets) {
    console.log(`  ${w.currency}${w.isDefault ? " (default)" : ""}: ${(Number(w.balanceMinor) / 100).toFixed(2)}`);
  }
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
