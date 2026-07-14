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

// Rebate product submissions.
const PRODUCT_CATALOG: { name: string; price: number }[] = [
  { name: 'Samsung 55" 4K Smart TV', price: 649.99 },
  { name: "Apple AirPods Pro (2nd Gen)", price: 229.0 },
  { name: "Nike Air Max 270", price: 150.0 },
  { name: "KitchenAid Stand Mixer", price: 429.95 },
  { name: "Dyson V15 Cordless Vacuum", price: 749.99 },
  { name: "Instant Pot Duo 7-in-1", price: 89.99 },
  { name: "Sony WH-1000XM5 Headphones", price: 399.99 },
  { name: "Levi's 501 Original Jeans", price: 69.5 },
  { name: "Ninja Air Fryer XL", price: 129.99 },
  { name: "Logitech MX Master 3S Mouse", price: 99.99 },
  { name: "Fitbit Charge 6", price: 159.95 },
  { name: "Le Creuset Dutch Oven", price: 380.0 },
  { name: "GoPro HERO12 Black", price: 399.0 },
  { name: "Yeti Rambler 20oz Tumbler", price: 35.0 },
  { name: "Anker 737 Power Bank", price: 149.99 },
  { name: "Philips Sonicare Toothbrush", price: 119.95 },
];
const PRODUCT_STATUSES = [
  "pending",
  "approved",
  "approved",
  "rejected",
  "pending",
  "approved",
];
const PRODUCT_NOTES: Record<string, string> = {
  approved: "Receipt verified — rebate approved.",
  rejected: "Receipt unreadable; please resubmit a clearer photo.",
};

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

  // ----- Product submissions (cascade-deleted with their demo users above) -----
  // Concentrated on the first 16 users so the rest have none — exercises empty
  // per-user stats and the list "no submissions" state.
  const productUsers = createdIds.slice(0, 16);
  for (let k = 0; k < 36; k += 1) {
    const item = PRODUCT_CATALOG[k % PRODUCT_CATALOG.length];
    const status = PRODUCT_STATUSES[k % PRODUCT_STATUSES.length];
    const reviewed = status !== "pending";
    await prisma.product.create({
      data: {
        id: randomUUID(),
        userId: productUsers[k % productUsers.length],
        name: item.name,
        priceMinor: minor(item.price),
        currency: "USD",
        quantity: (k % 4) + 1,
        imageUrl:
          k % 5 === 0 ? null : `https://picsum.photos/seed/rebate-${k}/600/400`,
        status,
        adminNote: reviewed ? PRODUCT_NOTES[status] : null,
        reviewedAt: reviewed ? daysAgo(k) : null,
        reviewedBy: reviewed ? admin.id : null,
        createdAt: daysAgo(1 + k),
      },
    });
  }

  // ----- Currencies (idempotent upsert by code) + their per-role fee/limit config -----
  const SEED_CURRENCIES = [
    { code: "USD", name: "US Dollar", symbol: "$", type: "fiat", rate: 1, isDefault: true, autoWallet: true },
    { code: "EUR", name: "Euro", symbol: "€", type: "fiat", rate: 0.96, autoWallet: true },
    { code: "GBP", name: "British Pound", symbol: "£", type: "fiat", rate: 0.79, autoWallet: false },
    { code: "NGN", name: "Nigerian Naira", symbol: "₦", type: "fiat", rate: 1580, autoWallet: false },
    { code: "USDT", name: "Tether", symbol: "₮", type: "crypto", rate: 1, autoWallet: false },
  ];
  const ROLE_KEYS = ["sender", "voucher", "payment", "withdraw"];
  for (const spec of SEED_CURRENCIES) {
    const currency = await prisma.currency.upsert({
      where: { code: spec.code },
      update: {
        name: spec.name,
        symbol: spec.symbol,
        type: spec.type,
        rate: spec.rate,
        isDefault: spec.isDefault ?? false,
        autoWallet: spec.autoWallet ?? false,
        isActive: true,
      },
      create: {
        code: spec.code,
        name: spec.name,
        symbol: spec.symbol,
        type: spec.type,
        rate: spec.rate,
        isDefault: spec.isDefault ?? false,
        autoWallet: spec.autoWallet ?? false,
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

  // ----- Payment gateways (idempotent upsert; preserves admin-set credentials/status) --
  const GATEWAYS = [
    { slug: "paypal", name: "PayPal", logo: "/gateways/paypal.svg", supportedCurrencies: ["USD", "EUR", "GBP", "AUD", "CAD"], withdrawAvailable: true },
    { slug: "stripe", name: "Stripe", logo: "/gateways/stripe.svg", supportedCurrencies: ["USD", "EUR", "GBP", "JPY", "INR", "SGD"], withdrawAvailable: false },
    { slug: "paystack", name: "Paystack", logo: "/gateways/paystack.svg", supportedCurrencies: ["NGN", "GHS", "ZAR", "KES", "USD"], withdrawAvailable: true },
    { slug: "cryptomus", name: "Cryptomus", logo: "/gateways/cryptomus.svg", supportedCurrencies: ["USDT", "BTC", "ETH", "USDC", "TRX"], withdrawAvailable: true },
  ];
  for (const gateway of GATEWAYS) {
    await prisma.paymentGateway.upsert({
      where: { slug: gateway.slug },
      update: {
        name: gateway.name,
        logo: gateway.logo,
        supportedCurrencies: gateway.supportedCurrencies,
        withdrawAvailable: gateway.withdrawAvailable,
      },
      create: { ...gateway, isActive: false },
    });
  }

  const [
    totalUsers,
    totalWallets,
    totalTxns,
    totalProducts,
    totalCurrencies,
    totalGateways,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.count(),
    prisma.walletTransaction.count(),
    prisma.product.count(),
    prisma.currency.count(),
    prisma.paymentGateway.count(),
  ]);
  console.info(`Seeded admin ${adminEmail}; ${NAMES.length} demo users.`);
  console.info(
    `Totals: ${totalUsers} users, ${totalWallets} wallets, ${totalTxns} transactions, ${totalProducts} products, ${totalCurrencies} currencies, ${totalGateways} gateways.`,
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
