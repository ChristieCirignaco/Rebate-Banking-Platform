import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// Relative import (not the @/ alias) so this runs under tsx / `prisma db seed`.
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const minor = (major: number) => BigInt(Math.round(major * 100));
const daysAgo = (n: number) => new Date(Date.now() - n * 86400 * 1000);
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600 * 1000);

const DEMO_DOMAIN = "@example.com";

const DEFAULT_CONTROLS = {
  account_status: true,
  email_verification: true,
  kyc_verification: false,
  deposit: true,
  exchange_money: true,
  send_money: true,
  request_money: false,
  withdraw: true,
};

const NAMES = [
  "Amara Okafor",
  "Liam Brown",
  "Sofia Rossi",
  "Chen Wei",
  "Noah Smith",
  "Fatima Zahra",
  "Diego Martinez",
  "Yuki Tanaka",
  "Olivia Johnson",
  "Mohammed Al-Farsi",
  "Emma Wilson",
  "Raj Patel",
  "Isabella Garcia",
  "Kwame Mensah",
  "Hannah Lee",
  "Lucas Silva",
  "Aisha Bello",
  "Mateo Gonzalez",
  "Grace Nakamura",
  "Omar Haddad",
  "Chloe Dubois",
  "Ivan Petrov",
  "Mia Andersson",
  "Tariq Rahman",
];
const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Nigeria",
  "Germany",
  "Japan",
  "Brazil",
  "Canada",
  "France",
];
const KYC_STATUSES = [
  "approved",
  "pending",
  "not_submitted",
  "approved",
  "rejected",
  "approved",
  "pending",
];
const KYC_DOCS = ["Passport", "National ID", "Driver's License"];
const STATUSES = [
  "active",
  "active",
  "active",
  "suspended",
  "pending",
  "active",
];
const ROLES = ["user", "user", "admin", "user", "user", "user", "user"];
const GENDERS = ["male", "female", "unspecified"];

const username = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "_");

type TxnSpec = {
  major: number;
  direction: "credit" | "debit";
  source: string;
  status?: string;
  provider?: string;
  description: string;
  ageDays: number;
};

async function createWalletWithTxns(
  userId: string,
  currency: string,
  isDefault: boolean,
  specs: TxnSpec[],
) {
  const wallet = await prisma.wallet.create({
    data: { id: randomUUID(), userId, currency, isDefault },
  });
  let balance = 0n;
  for (const spec of [...specs].sort((a, b) => b.ageDays - a.ageDays)) {
    const amount = minor(spec.major);
    balance += spec.direction === "credit" ? amount : -amount;
    await prisma.walletTransaction.create({
      data: {
        id: randomUUID(),
        userId,
        walletId: wallet.id,
        currency,
        direction: spec.direction,
        amountMinor: amount,
        source: spec.source,
        idempotencyKey: `seed:${randomUUID()}`,
        balanceAfterMinor: balance,
        status: spec.status ?? "completed",
        provider: spec.provider,
        description: spec.description,
        createdAt: daysAgo(spec.ageDays),
      },
    });
  }
  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balanceMinor: balance },
  });
}

// A varied but always non-negative set of USD transactions for a demo user.
function usdTxns(seed: number): TxnSpec[] {
  const base: TxnSpec[] = [
    {
      major: 500 + (seed % 5) * 250,
      direction: "credit",
      source: "deposit",
      provider: "Paystack",
      description: "Wallet deposit",
      ageDays: 40 + (seed % 20),
    },
    {
      major: 20 + (seed % 8) * 5,
      direction: "credit",
      source: "rebate",
      provider: "System",
      description: "Rebate credit",
      ageDays: 22 + (seed % 10),
    },
    {
      major: 3 + (seed % 4),
      direction: "debit",
      source: "fee",
      provider: "System",
      description: "Service fee",
      ageDays: 14,
    },
    {
      major: 40 + (seed % 6) * 10,
      direction: "debit",
      source: "withdrawal",
      provider: "Manual",
      description: "Withdrawal to bank",
      status: seed % 4 === 0 ? "pending" : "completed",
      ageDays: 6 + (seed % 5),
    },
  ];
  if (seed % 3 === 0) {
    base.push({
      major: 15,
      direction: "credit",
      source: "reward",
      provider: "System",
      description: "Referral reward",
      ageDays: 2,
    });
  }
  return base;
}

async function main() {
  // ----- Admin bootstrap (env-gated) -----
  const adminEmail = (
    process.env.ADMIN_EMAIL ?? "admin@gmail.com"
  ).toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "12345678";
  const adminName = process.env.ADMIN_NAME ?? "Admin";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "admin", status: "active", emailVerified: true },
    create: {
      id: randomUUID(),
      email: adminEmail,
      name: adminName,
      role: "admin",
      emailVerified: true,
      status: "active",
      kycStatus: "approved",
      kycDocumentType: "Passport",
      username: username(adminName),
      phone: "+1 555 0100",
      country: "United States",
      currency: "USD",
      gender: "unspecified",
      address: "1600 Market Street, San Francisco, CA",
      controls: DEFAULT_CONTROLS,
      transferCodes: { imf: [], tax: [], cot: [] },
      lastLoginAt: hoursAgo(1),
    },
  });

  const passwordHash = await hashPassword(adminPassword);
  const cred = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: "credential" },
  });
  if (cred) {
    await prisma.account.update({
      where: { id: cred.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: admin.id,
        providerId: "credential",
        userId: admin.id,
        password: passwordHash,
      },
    });
  }

  if ((await prisma.wallet.count({ where: { userId: admin.id } })) === 0) {
    await createWalletWithTxns(admin.id, "USD", true, usdTxns(1));
  }

  // ----- Demo users (idempotent: clear and recreate the @example.com set) -----
  await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_DOMAIN } } });

  const createdIds: string[] = [];
  for (let i = 0; i < NAMES.length; i += 1) {
    const name = NAMES[i];
    const kycStatus = KYC_STATUSES[i % KYC_STATUSES.length];
    const referredById =
      i > 2 && i % 3 === 0 ? createdIds[i % createdIds.length] : null;

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name,
        email: `${username(name)}${DEMO_DOMAIN}`,
        emailVerified: i % 3 !== 0,
        role: ROLES[i % ROLES.length],
        status: STATUSES[i % STATUSES.length],
        kycStatus,
        kycDocumentType:
          kycStatus === "not_submitted" ? null : KYC_DOCS[i % KYC_DOCS.length],
        username: username(name),
        phone: `+1 555 0${(100 + i).toString()}`,
        country: COUNTRIES[i % COUNTRIES.length],
        currency: "USD",
        gender: GENDERS[i % GENDERS.length],
        birthday: new Date(1990 + (i % 15), i % 12, (i % 27) + 1),
        address: `${100 + i} Market Street, San Francisco, CA`,
        controls: DEFAULT_CONTROLS,
        transferCodes: { imf: [], tax: [], cot: [] },
        activationCode:
          i % 3 === 0
            ? `RB-${(4096 + i * 137).toString(36).toUpperCase()}`
            : null,
        referredById,
        lastLoginAt: i % 5 === 0 ? null : hoursAgo(1 + i * 3),
        createdAt: daysAgo(2 + i * 3),
      },
    });
    createdIds.push(user.id);

    await createWalletWithTxns(user.id, "USD", true, usdTxns(i + 2));
    if (i % 2 === 0) {
      await createWalletWithTxns(user.id, "EUR", false, [
        {
          major: 120 + (i % 5) * 30,
          direction: "credit",
          source: "deposit",
          provider: "Stripe",
          description: "EUR deposit",
          ageDays: 30,
        },
      ]);
    }
    if (i % 4 === 0) {
      await createWalletWithTxns(user.id, "USDT", false, []);
    }
  }

  const [totalUsers, totalWallets, totalTxns] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.count(),
    prisma.walletTransaction.count(),
  ]);
  console.info(`Seeded admin ${adminEmail}; ${NAMES.length} demo users.`);
  console.info(
    `Totals: ${totalUsers} users, ${totalWallets} wallets, ${totalTxns} transactions.`,
  );
  if (!process.env.ADMIN_PASSWORD) {
    console.info(
      `Admin password: ${adminPassword} — set ADMIN_PASSWORD to override.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
