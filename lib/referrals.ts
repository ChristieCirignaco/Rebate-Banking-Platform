import { randomInt } from "node:crypto";

import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toMajor, toMinor } from "@/lib/money/money";
import type { ReferralTrigger } from "@/lib/settings/defs";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { getSettings } from "@/lib/settings/store";

// The referral program: single-level (each user has one direct referrer). A user shares
// /register?ref=<referralCode>; a signup through that link sets the new user's referredById.
// When the referred user hits the admin-configured trigger (signup or first deposit) the
// referrer earns a ReferralEarning (pending until an admin marks it paid). This module owns the
// share code, the user-facing reads, and the (idempotent) award.

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

export type ReferralStatus = "pending" | "paid" | "rejected";

export type ReferralChild = {
  id: string;
  name: string;
  image: string | null;
  referralCount: number; // their own downline size (the "next level")
  joinedLabel: string;
};

export type ReferralEarningRow = {
  id: string;
  referredName: string;
  amountLabel: string;
  status: ReferralStatus;
  dateLabel: string;
};

export type ReferralData = {
  code: string;
  referralPath: string; // "/register?ref=CODE" — the client prepends its origin
  self: { name: string; username: string; image: string | null };
  joinCount: number; // people who joined via this link
  referrals: ReferralChild[];
  earnings: ReferralEarningRow[];
  totalEarnedLabel: string; // sum of PAID earnings (default currency)
  pendingLabel: string; // sum of PENDING earnings
  allowedRules: string[];
  prohibitedRules: string[];
};

function randomCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

// The user's share code, generated + persisted on first use (avoids backfilling existing rows).
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let i = 0; i < 6; i++) {
    const code = randomCode();
    if ((await prisma.user.count({ where: { referralCode: code } })) > 0) continue;
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // Unique race — re-read whatever won.
      const again = await prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      });
      if (again?.referralCode) return again.referralCode;
    }
  }
  throw new Error("Could not allocate a referral code.");
}

// Resolve a referral code to the referrer's user id (used at signup). Null if unknown.
export async function referrerIdForCode(code: string): Promise<string | null> {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,16}$/.test(clean)) return null;
  const u = await prisma.user.findUnique({ where: { referralCode: clean }, select: { id: true } });
  return u?.id ?? null;
}

function toRules(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function getReferralData(userId: string): Promise<ReferralData> {
  const code = await ensureReferralCode(userId);
  const [self, referrals, earnings, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true, image: true } }),
    prisma.user.findMany({
      where: { referredById: userId },
      select: { id: true, name: true, image: true, createdAt: true, _count: { select: { referrals: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.referralEarning.findMany({
      where: { referrerId: userId },
      include: { referredUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getSettings("referrals"),
  ]);

  // Totals are summed per currency but presented in the default currency label for a headline
  // figure; the per-row list keeps each earning's own currency exact.
  let paidMinor = 0n;
  let pendingMinor = 0n;
  let sumCurrency = settings.rewardCurrency || "USD";
  for (const e of earnings) {
    sumCurrency = e.currency;
    if (e.status === "paid") paidMinor += e.amountMinor;
    else if (e.status === "pending") pendingMinor += e.amountMinor;
  }

  return {
    code,
    referralPath: `/register?ref=${code}`,
    self: { name: self?.name ?? "You", username: self?.username ?? "", image: self?.image ?? null },
    joinCount: referrals.length,
    referrals: referrals.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.image,
      referralCount: r._count.referrals,
      joinedLabel: formatDateTime(r.createdAt.toISOString()),
    })),
    earnings: earnings.map((e) => ({
      id: e.id,
      referredName: e.referredUser.name,
      amountLabel: formatCurrency(toMajor(e.amountMinor), e.currency),
      status: e.status as ReferralStatus,
      dateLabel: formatDateTime(e.createdAt.toISOString()),
    })),
    totalEarnedLabel: formatCurrency(toMajor(paidMinor), sumCurrency),
    pendingLabel: formatCurrency(toMajor(pendingMinor), sumCurrency),
    allowedRules: toRules(settings.allowedRules),
    prohibitedRules: toRules(settings.prohibitedRules),
  };
}

// Award a referral earning to the referrer when a referred user hits the configured trigger.
// Fail-closed on the referrals flag; a no-op unless the settings trigger matches. Idempotent —
// the ReferralEarning unique(referredUserId) means at most one earning per referred user, so
// this is safe to call on every signup / every deposit completion.
export async function awardReferral(opts: {
  referredUserId: string;
  trigger: ReferralTrigger;
  depositAmountMinor?: bigint;
  depositCurrency?: string;
}): Promise<void> {
  try {
    if (!(await isFeatureEnabled("referrals"))) return;
    const settings = await getSettings("referrals");
    if (settings.trigger !== opts.trigger) return;

    const referred = await prisma.user.findUnique({
      where: { id: opts.referredUserId },
      select: { referredById: true },
    });
    if (!referred?.referredById) return;
    if ((await prisma.referralEarning.count({ where: { referredUserId: opts.referredUserId } })) > 0) {
      return; // already awarded
    }

    let amountMinor: bigint;
    let currency: string;
    if (settings.rewardType === "percent") {
      if (!opts.depositAmountMinor || opts.depositAmountMinor <= 0n) return; // percent needs a base
      // percent of the deposit, integer math: amount * (pct*100) / 10000
      amountMinor = (opts.depositAmountMinor * BigInt(Math.round(settings.rewardAmount * 100))) / 10000n;
      currency = opts.depositCurrency ?? settings.rewardCurrency;
    } else {
      amountMinor = toMinor(Math.max(0, settings.rewardAmount));
      currency = settings.rewardCurrency;
    }
    if (amountMinor <= 0n) return;

    await prisma.referralEarning.create({
      data: {
        referrerId: referred.referredById,
        referredUserId: opts.referredUserId,
        amountMinor,
        currency,
        trigger: opts.trigger,
        status: "pending",
      },
    });
  } catch {
    // Never let a referral-award failure break the signup/deposit it hangs off of.
  }
}
