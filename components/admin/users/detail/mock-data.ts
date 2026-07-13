import {
  ArrowLeftRight,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Gift,
  HandCoins,
  Package,
  PackageCheck,
  PackageX,
  Send,
  Ticket,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import type {
  ActivityEntry,
  DetailTransaction,
  DetailWallet,
  ReferralUser,
  TransferCodes,
  TxnSummaryPoint,
  UserControl,
  UserDetail,
  UserStat,
} from "./types";

// -----------------------------------------------------------------------------
// Mock data for the inner user page. Replace each getter with a real query to wire
// the API. getUserDetail(id) personalises the name so it matches the list page.
// -----------------------------------------------------------------------------

const iso = (hoursAgo: number) =>
  new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();

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
];

export function getUserDetail(id: string): UserDetail {
  const index = (parseInt(id.replace(/\D/g, ""), 10) || 1) - 1;
  const name = NAMES[index % NAMES.length] ?? "Jane Doe";
  const [firstName, ...rest] = name.split(" ");
  const lastName = rest.join(" ") || "";
  const username = name.toLowerCase().replace(/[^a-z]+/g, "_");
  return {
    id,
    firstName,
    lastName,
    name,
    username,
    email: `${username}@example.com`,
    emailVerified: index % 3 !== 0,
    phone: "+1 555 0100",
    gender: "unspecified",
    birthday: "1994-06-15",
    country: "United States",
    address: "1600 Market Street, Suite 400, San Francisco, CA",
    lastLogin: iso(3),
    browser: "Chrome on macOS",
  };
}

export function getWallets(): DetailWallet[] {
  return [
    { currency: "USD", name: "US Dollar", balance: 1284.5, isDefault: true },
    { currency: "EUR", name: "Euro", balance: 320, isDefault: false },
    { currency: "USDT", name: "Tether", balance: 0, isDefault: false },
  ];
}

export function getControls(): UserControl[] {
  return [
    {
      key: "account_status",
      label: "Account Status",
      description: "Controls user login access.",
      enabled: true,
    },
    {
      key: "email_verification",
      label: "Email Verification",
      description: "Requires email verification to activate the account.",
      enabled: true,
    },
    {
      key: "kyc_verification",
      label: "Kyc Verification",
      description: "Requires KYC verification before transactions.",
      enabled: false,
    },
    {
      key: "deposit",
      label: "Deposit",
      description: "Allows users to add funds to their wallet.",
      enabled: true,
    },
    {
      key: "exchange_money",
      label: "Exchange Money",
      description: "Allows currency conversion within the wallet.",
      enabled: true,
    },
    {
      key: "send_money",
      label: "Send Money",
      description: "Allows sending money to other users.",
      enabled: true,
    },
    {
      key: "request_money",
      label: "Request Money",
      description: "Allows users to request money from others.",
      enabled: false,
    },
    {
      key: "withdraw",
      label: "Withdraw",
      description: "Allows withdrawal to linked bank accounts.",
      enabled: true,
    },
  ];
}

export function getStats(): UserStat[] {
  return [
    { label: "Total Trx", value: 342, icon: ArrowLeftRight },
    { label: "Completed Trx", value: 298, icon: CheckCircle2 },
    { label: "Pending Trx", value: 31, icon: Clock },
    { label: "Failed Trx", value: 13, icon: XCircle },
    { label: "Deposit", value: 18420.5, icon: Banknote, isCurrency: true },
    { label: "Send Money", value: 6240, icon: Send, isCurrency: true },
    { label: "Request Money", value: 1890, icon: HandCoins, isCurrency: true },
    {
      label: "Exchange Money",
      value: 4300,
      icon: ArrowLeftRight,
      isCurrency: true,
    },
    { label: "Payment", value: 3120.75, icon: CreditCard, isCurrency: true },
    { label: "Withdraw", value: 9650, icon: Banknote, isCurrency: true },
    { label: "Voucher", value: 250, icon: Ticket, isCurrency: true },
    { label: "Reward", value: 480, icon: Gift, isCurrency: true },
    { label: "Total Wallets", value: 3, icon: Wallet },
    { label: "Total Balance", value: 1604.5, icon: Wallet, isCurrency: true },
    { label: "Total Products", value: 24, icon: Package },
    { label: "Pending Products", value: 4, icon: Package },
    { label: "Approved Products", value: 18, icon: PackageCheck },
    { label: "Rejected Products", value: 2, icon: PackageX },
    { label: "Support Tickets", value: 5, icon: Ticket },
    { label: "Referrals Made", value: 7, icon: Users },
  ];
}

export function getTxnSummary(days = 30): TxnSummaryPoint[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const points: TxnSummaryPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (days - 1 - i));
    points.push({
      date: date.toISOString().slice(0, 10),
      completed: Math.round(8 + 4 * Math.sin(i / 3) + i / 5),
      pending: Math.round(2 + 2 * Math.sin(i / 4 + 1)),
      failed: Math.round(1 + Math.abs(Math.sin(i / 5))),
    });
  }
  return points;
}

export function getTransactions(): DetailTransaction[] {
  return [
    {
      id: "TRX-9F2A7C",
      description: "Wallet deposit",
      provider: "Paystack",
      amount: 500,
      currency: "USD",
      type: "deposit",
      status: "completed",
      createdAt: iso(2),
    },
    {
      id: "TRX-7C1B04",
      description: "Withdrawal to bank",
      provider: "Manual",
      amount: -220.5,
      currency: "USD",
      type: "withdraw",
      status: "pending",
      createdAt: iso(9),
    },
    {
      id: "TRX-4E88D1",
      description: "Sent to @sofia_rossi",
      provider: "Internal",
      amount: -80,
      currency: "EUR",
      type: "send",
      status: "completed",
      createdAt: iso(26),
    },
    {
      id: "TRX-1A55F9",
      description: "Currency exchange",
      provider: "Internal",
      amount: 130,
      currency: "USD",
      type: "exchange",
      status: "completed",
      createdAt: iso(52),
    },
    {
      id: "TRX-B20C6E",
      description: "Reward payout",
      provider: "System",
      amount: 25,
      currency: "USD",
      type: "reward",
      status: "failed",
      createdAt: iso(70),
    },
  ];
}

export function getReferrals(): ReferralUser[] {
  // Empty by design to demonstrate the referral empty state.
  return [];
}

export function getActivity(): ActivityEntry[] {
  return [
    {
      id: "act_1",
      loginAt: iso(3),
      ip: "102.89.34.12",
      country: "United States",
      browser: "Chrome",
      os: "macOS",
    },
    {
      id: "act_2",
      loginAt: iso(27),
      ip: "102.89.34.12",
      country: "United States",
      browser: "Chrome",
      os: "macOS",
    },
    {
      id: "act_3",
      loginAt: iso(74),
      ip: "197.210.55.8",
      country: "Nigeria",
      browser: "Safari",
      os: "iOS",
    },
    {
      id: "act_4",
      loginAt: iso(120),
      ip: "84.17.53.9",
      country: "United Kingdom",
      browser: "Firefox",
      os: "Windows",
    },
  ];
}

export function getTransferCodes(): TransferCodes {
  return {
    imf: ["IMF-4821", "IMF-9033", "IMF-1157"],
    tax: [],
    cot: ["COT-7781", "COT-2290"],
  };
}
