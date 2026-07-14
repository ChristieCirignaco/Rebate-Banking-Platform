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

  // ----- Deposit methods (reference the shared gateways + currencies) + deposits -------
  // Clear + recreate (methods have no natural key). Deposits go first for the FK.
  await prisma.deposit.deleteMany({});
  await prisma.depositMethod.deleteMany({});

  const currencyId = new Map(
    (await prisma.currency.findMany({ select: { id: true, code: true } })).map((c) => [
      c.code,
      c.id,
    ]),
  );
  const gatewayId = new Map(
    (await prisma.paymentGateway.findMany({ select: { id: true, slug: true } })).map((g) => [
      g.slug,
      g.id,
    ]),
  );

  const autoPaypal = await prisma.depositMethod.create({
    data: { type: "auto", name: "PayPal", symbol: "$", logo: "/gateways/paypal.svg", currencyId: currencyId.get("USD")!, paymentGatewayId: gatewayId.get("paypal"), rate: 1, chargeType: "percent", chargeValue: 2.9, minAmount: 5, maxAmount: 10000, isActive: true },
  });
  const autoStripe = await prisma.depositMethod.create({
    data: { type: "auto", name: "Stripe", symbol: "€", logo: "/gateways/stripe.svg", currencyId: currencyId.get("EUR")!, paymentGatewayId: gatewayId.get("stripe"), rate: 0.96, chargeType: "percent", chargeValue: 3.4, minAmount: 5, maxAmount: 20000, isActive: true },
  });
  const autoPaystack = await prisma.depositMethod.create({
    data: { type: "auto", name: "Paystack", symbol: "₦", logo: "/gateways/paystack.svg", currencyId: currencyId.get("NGN")!, paymentGatewayId: gatewayId.get("paystack"), rate: 1580, chargeType: "percent", chargeValue: 1.5, minAmount: 1000, maxAmount: 5000000, isActive: false },
  });
  const manualBank = await prisma.depositMethod.create({
    data: {
      type: "manual", name: "Bank Transfer (NGN)", symbol: "₦", methodCode: "bank-ngn", currencyId: currencyId.get("NGN")!, rate: 1580, chargeType: "fixed", chargeValue: 0, minAmount: 1000, maxAmount: 5000000, isActive: true,
      instructions: "<p>Transfer to <strong>GTBank 0123456789</strong> (Rebate Bank Ltd), then submit the sender details below. Deposits are credited after review.</p>",
      fields: { create: [
        { label: "Sender Name", type: "input", required: true, sortOrder: 0 },
        { label: "Bank Name", type: "input", required: true, sortOrder: 1 },
        { label: "Payment Proof", type: "file", required: false, sortOrder: 2 },
      ] },
    },
  });
  const manualCrypto = await prisma.depositMethod.create({
    data: {
      type: "manual", name: "USDT (TRC20) Manual", symbol: "₮", methodCode: "usdt-trc20", currencyId: currencyId.get("USDT")!, rate: 1, chargeType: "percent", chargeValue: 1, minAmount: 10, maxAmount: 100000, isActive: true,
      instructions: "<p>Send <strong>USDT (TRC20)</strong> to <code>TVxyz…9kQ</code>, then paste your sender address and transaction hash.</p>",
      fields: { create: [
        { label: "Sender Wallet Address", type: "input", required: true, sortOrder: 0 },
        { label: "Transaction Hash", type: "input", required: true, sortOrder: 1 },
        { label: "Notes", type: "textarea", required: false, sortOrder: 2 },
      ] },
    },
  });

  type DepositSpec = {
    method: { id: string; type: string; name: string; chargeType: string; chargeValue: unknown };
    code: string;
    amount: number;
    status: string;
    ageDays: number;
    fieldValues?: { label: string; value: string }[];
  };
  const feeFor = (spec: DepositSpec) =>
    spec.method.chargeType === "percent"
      ? (spec.amount * Number(spec.method.chargeValue)) / 100
      : Number(spec.method.chargeValue);

  const bankValues = (name: string) => [
    { label: "Sender Name", value: name },
    { label: "Bank Name", value: "GTBank" },
  ];
  const cryptoValues = (seed: number) => [
    { label: "Sender Wallet Address", value: `TRX${(seed * 7919).toString(36).toUpperCase()}kQ9` },
    { label: "Transaction Hash", value: `0x${(seed * 104729).toString(16)}ab` },
  ];

  const depositSpecs: DepositSpec[] = [
    // Pending manual requests (Tab 1)
    { method: manualBank, code: "NGN", amount: 250000, status: "pending", ageDays: 1, fieldValues: bankValues("Amara Okafor") },
    { method: manualCrypto, code: "USDT", amount: 500, status: "pending", ageDays: 1, fieldValues: cryptoValues(3) },
    { method: manualBank, code: "NGN", amount: 80000, status: "pending", ageDays: 2, fieldValues: bankValues("Kwame Mensah") },
    { method: manualCrypto, code: "USDT", amount: 1200, status: "pending", ageDays: 2, fieldValues: cryptoValues(7) },
    { method: manualBank, code: "NGN", amount: 1500000, status: "pending", ageDays: 3, fieldValues: bankValues("Aisha Bello") },
    // History mix (Tab 4)
    { method: autoPaypal, code: "USD", amount: 150, status: "completed", ageDays: 4 },
    { method: autoPaypal, code: "USD", amount: 500, status: "completed", ageDays: 6 },
    { method: autoStripe, code: "EUR", amount: 320, status: "completed", ageDays: 7 },
    { method: autoStripe, code: "EUR", amount: 90, status: "failed", ageDays: 8 },
    { method: manualBank, code: "NGN", amount: 60000, status: "completed", ageDays: 9, fieldValues: bankValues("Liam Brown") },
    { method: manualCrypto, code: "USDT", amount: 2000, status: "completed", ageDays: 10, fieldValues: cryptoValues(11) },
    { method: manualBank, code: "NGN", amount: 45000, status: "canceled", ageDays: 11, fieldValues: bankValues("Sofia Rossi") },
    { method: autoPaypal, code: "USD", amount: 75, status: "pending", ageDays: 12 },
    { method: autoStripe, code: "EUR", amount: 240, status: "completed", ageDays: 14 },
    { method: autoPaystack, code: "NGN", amount: 120000, status: "completed", ageDays: 15 },
    { method: manualCrypto, code: "USDT", amount: 300, status: "canceled", ageDays: 16, fieldValues: cryptoValues(17) },
    { method: autoPaypal, code: "USD", amount: 1000, status: "completed", ageDays: 20 },
  ];

  let d = 0;
  for (const spec of depositSpecs) {
    const userId = createdIds[(d * 3 + 1) % createdIds.length];
    await prisma.deposit.create({
      data: {
        id: randomUUID(),
        txnId: `DEP-${randomUUID().slice(0, 8).toUpperCase()}`,
        userId,
        depositMethodId: spec.method.id,
        type: spec.method.type,
        currency: spec.code,
        amountMinor: minor(spec.amount),
        feeMinor: minor(feeFor(spec)),
        status: spec.status,
        provider: spec.method.name,
        description: `${spec.method.type === "auto" ? "Automatic" : "Manual"} deposit via ${spec.method.name}`,
        fieldValues: spec.fieldValues,
        reviewedAt: spec.status === "pending" ? null : daysAgo(spec.ageDays - 0.5),
        reviewedById: spec.status === "pending" ? null : admin.id,
        createdAt: daysAgo(spec.ageDays),
      },
    });
    d += 1;
  }

  // ----- Withdraw methods + withdrawals (held funds) + weekly schedule -----------------
  await prisma.withdraw.deleteMany({});
  await prisma.withdrawMethod.deleteMany({});

  const wAutoPaypal = await prisma.withdrawMethod.create({
    data: { type: "auto", name: "PayPal", symbol: "$", logo: "/gateways/paypal.svg", currencyId: currencyId.get("USD")!, paymentGatewayId: gatewayId.get("paypal"), rate: 1, chargeType: "percent", chargeValue: 2, minAmount: 10, maxAmount: 5000, isActive: true },
  });
  // Auto methods must use a withdrawal-capable gateway (Stripe's withdrawAvailable is false).
  const wAutoPaystack = await prisma.withdrawMethod.create({
    data: { type: "auto", name: "Paystack Payout", symbol: "₦", logo: "/gateways/paystack.svg", currencyId: currencyId.get("NGN")!, paymentGatewayId: gatewayId.get("paystack"), rate: 1580, chargeType: "percent", chargeValue: 2.5, minAmount: 1000, maxAmount: 5000000, isActive: true },
  });
  const wBank = await prisma.withdrawMethod.create({
    data: {
      type: "manual", name: "Bank Transfer", symbol: "$", methodCode: "bank-usd", currencyId: currencyId.get("USD")!, rate: 1, chargeType: "fixed", chargeValue: 2, minAmount: 20, maxAmount: 10000, processTimeValue: 1, processTimeUnit: "day", isActive: true,
      fields: { create: [
        { label: "Bank Name", type: "input", required: true, sortOrder: 0 },
        { label: "Account Number", type: "input", required: true, sortOrder: 1 },
        { label: "Account Name", type: "input", required: true, sortOrder: 2 },
        { label: "Routing Number", type: "input", required: false, sortOrder: 3 },
        { label: "SWIFT/BIC Code", type: "input", required: false, sortOrder: 4 },
        { label: "Account Type", type: "input", required: false, sortOrder: 5 },
      ] },
    },
  });
  const wCrypto = await prisma.withdrawMethod.create({
    data: {
      type: "manual", name: "USDT (TRC20) Payout", symbol: "₮", methodCode: "usdt-trc20", currencyId: currencyId.get("USDT")!, rate: 1, chargeType: "percent", chargeValue: 1, minAmount: 10, maxAmount: 50000, processTimeValue: 30, processTimeUnit: "minute", isActive: true,
      fields: { create: [
        { label: "Wallet Address", type: "input", required: true, sortOrder: 0 },
        { label: "Network", type: "input", required: true, sortOrder: 1 },
      ] },
    },
  });

  // Debit (hold) a user's wallet, mirroring what a withdrawal request does at submit time.
  async function holdFunds(userId: string, code: string, amountMinor: bigint, ageDays: number) {
    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: code } },
    });
    if (!wallet || wallet.balanceMinor < amountMinor) return null;
    const balance = wallet.balanceMinor - amountMinor;
    const txn = await prisma.walletTransaction.create({
      data: {
        id: randomUUID(), userId, walletId: wallet.id, currency: code, direction: "debit",
        amountMinor, source: "withdrawal", idempotencyKey: `seed:${randomUUID()}`,
        balanceAfterMinor: balance, status: "completed", provider: "Manual",
        description: "Withdrawal hold", createdAt: daysAgo(ageDays),
      },
    });
    await prisma.wallet.update({ where: { id: wallet.id }, data: { balanceMinor: balance } });
    return txn.id;
  }

  const bankFieldValues = (name: string, acct: string) => [
    { label: "Bank Name", value: "Chase Bank" },
    { label: "Account Number", value: acct },
    { label: "Account Name", value: name },
  ];

  type WSpec = {
    method: { id: string; type: string; name: string; chargeType: string; chargeValue: unknown };
    code: string;
    amount: number;
    status: string;
    ageDays: number;
    held: boolean;
    fieldValues?: { label: string; value: string }[];
  };
  const wFee = (spec: WSpec) =>
    spec.method.chargeType === "percent"
      ? (spec.amount * Number(spec.method.chargeValue)) / 100
      : Number(spec.method.chargeValue);

  const withdrawSpecs: WSpec[] = [
    // Pending manual requests (Tab 1) — funds held.
    { method: wBank, code: "USD", amount: 120, status: "pending", ageDays: 1, held: true, fieldValues: bankFieldValues("Amara Okafor", "0123456789") },
    { method: wBank, code: "USD", amount: 250, status: "pending", ageDays: 1, held: true, fieldValues: bankFieldValues("Kwame Mensah", "5551234567") },
    { method: wBank, code: "USD", amount: 60, status: "pending", ageDays: 2, held: true, fieldValues: bankFieldValues("Aisha Bello", "9087654321") },
    { method: wBank, code: "USD", amount: 90, status: "pending", ageDays: 3, held: true, fieldValues: bankFieldValues("Liam Brown", "4445556666") },
    // Completed (held funds left the wallet).
    { method: wAutoPaypal, code: "USD", amount: 200, status: "completed", ageDays: 5, held: true },
    { method: wBank, code: "USD", amount: 75, status: "completed", ageDays: 6, held: true, fieldValues: bankFieldValues("Sofia Rossi", "1112223333") },
    { method: wAutoPaypal, code: "USD", amount: 150, status: "completed", ageDays: 9, held: true },
    { method: wBank, code: "USD", amount: 300, status: "completed", ageDays: 12, held: true, fieldValues: bankFieldValues("Noah Smith", "7778889999") },
    // Rejected/failed (no net ledger impact — seeded standalone).
    { method: wAutoPaystack, code: "NGN", amount: 150000, status: "canceled", ageDays: 8, held: false },
    { method: wCrypto, code: "USDT", amount: 500, status: "failed", ageDays: 10, held: false },
    { method: wCrypto, code: "USDT", amount: 800, status: "canceled", ageDays: 14, held: false },
    { method: wAutoPaystack, code: "NGN", amount: 90000, status: "failed", ageDays: 18, held: false },
  ];

  let w = 0;
  for (const spec of withdrawSpecs) {
    const userId = createdIds[(w * 5 + 2) % createdIds.length];
    const amountMinor = minor(spec.amount);
    const heldId = spec.held ? await holdFunds(userId, spec.code, amountMinor, spec.ageDays) : null;
    await prisma.withdraw.create({
      data: {
        id: randomUUID(),
        txnId: `WDL-${randomUUID().slice(0, 8).toUpperCase()}`,
        userId,
        withdrawMethodId: spec.method.id,
        type: spec.method.type,
        currency: spec.code,
        amountMinor,
        feeMinor: minor(wFee(spec)),
        status: spec.status,
        provider: spec.method.name,
        description: `Withdraw via ${spec.method.name} - ${spec.method.type === "auto" ? "Automatic" : "Manual"}`,
        fieldValues: spec.fieldValues,
        heldTransactionId: heldId,
        reviewedAt: spec.status === "pending" ? null : daysAgo(spec.ageDays - 0.5),
        reviewedById: spec.status === "pending" ? null : admin.id,
        createdAt: daysAgo(spec.ageDays),
      },
    });
    w += 1;
  }

  // Weekly auto-process schedule (Mon/Wed/Fri enabled).
  for (let day = 0; day < 7; day += 1) {
    await prisma.withdrawScheduleDay.upsert({
      where: { day },
      update: {},
      create: { day, enabled: day === 1 || day === 3 || day === 5 },
    });
  }

  const [
    totalUsers,
    totalWallets,
    totalTxns,
    totalProducts,
    totalCurrencies,
    totalGateways,
    totalMethods,
    totalDeposits,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.count(),
    prisma.walletTransaction.count(),
    prisma.product.count(),
    prisma.currency.count(),
    prisma.paymentGateway.count(),
    prisma.depositMethod.count(),
    prisma.deposit.count(),
  ]);
  const [totalWMethods, totalWithdraws] = await Promise.all([
    prisma.withdrawMethod.count(),
    prisma.withdraw.count(),
  ]);
  console.info(`Seeded admin ${adminEmail}; ${NAMES.length} demo users.`);
  console.info(
    `Totals: ${totalUsers} users, ${totalWallets} wallets, ${totalTxns} transactions, ${totalProducts} products, ${totalCurrencies} currencies, ${totalGateways} gateways, ${totalMethods} deposit methods, ${totalDeposits} deposits, ${totalWMethods} withdraw methods, ${totalWithdraws} withdrawals.`,
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
