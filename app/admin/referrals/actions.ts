"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { postLedgerEntry } from "@/lib/money/ledger";
import type { ReferralSettings } from "@/lib/settings/defs";
import { saveSettings } from "@/lib/settings/store";

export type ActionResult = { ok: true } | { ok: false; error: string };
const NOT_AUTHORIZED: ActionResult = { ok: false, error: "Not authorized." };

function revalidate() {
  revalidatePath("/admin/referrals");
}

// Save the referral reward configuration (trigger, reward type/amount/currency, rules copy).
export async function saveReferralSettings(values: ReferralSettings): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  if (values.trigger !== "signup" && values.trigger !== "first_deposit") {
    return { ok: false, error: "Invalid reward trigger." };
  }
  if (values.rewardType !== "fixed" && values.rewardType !== "percent") {
    return { ok: false, error: "Invalid reward type." };
  }
  if (!Number.isFinite(values.rewardAmount) || values.rewardAmount < 0) {
    return { ok: false, error: "Enter a valid reward amount." };
  }
  if (values.rewardType === "percent" && values.rewardAmount > 100) {
    return { ok: false, error: "Percentage reward cannot exceed 100%." };
  }

  await saveSettings(
    "referrals",
    {
      trigger: values.trigger,
      rewardType: values.rewardType,
      rewardAmount: values.rewardAmount,
      rewardCurrency: (values.rewardCurrency || "USD").trim().toUpperCase(),
      allowedRules: values.allowedRules,
      prohibitedRules: values.prohibitedRules,
    },
    session.user.id,
  );
  revalidate();
  return { ok: true };
}

// Mark a pending earning Paid AND credit the referrer's wallet in one transaction (atomic
// compare-and-set + an idempotent "reward" ledger credit). Mirrors the deposit/request approve.
export async function payReferralEarning(id: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const earning = await prisma.referralEarning.findUnique({ where: { id } });
  if (!earning) return { ok: false, error: "Earning not found." };
  if (earning.status !== "pending") {
    return { ok: false, error: "This earning has already been reviewed." };
  }
  if (earning.amountMinor <= 0n) return { ok: false, error: "Invalid earning amount." };

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.referralEarning.updateMany({
        where: { id, status: "pending" },
        data: {
          status: "paid",
          reviewedById: session.user.id,
          reviewedByName: session.user.name,
          paidAt: new Date(),
        },
      });
      if (claim.count === 0) throw new Error("ALREADY");

      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: earning.referrerId, currency: earning.currency } },
        update: {},
        create: { userId: earning.referrerId, currency: earning.currency, isDefault: false },
      });
      const credit = await postLedgerEntry({
        walletId: wallet.id,
        userId: earning.referrerId,
        currency: earning.currency,
        direction: "credit",
        amountMinor: earning.amountMinor,
        source: "reward",
        idempotencyKey: `referral:${earning.id}`,
        referenceType: "referral",
        referenceId: earning.id,
        description: "Referral reward",
        client: tx,
      });
      if (!credit.ok) throw new Error("LEDGER");
      await tx.referralEarning.update({ where: { id }, data: { rewardTransactionId: credit.id } });
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "ALREADY") {
      return { ok: false, error: "This earning has already been reviewed." };
    }
    return { ok: false, error: "Could not pay the reward. Please try again." };
  }
  revalidate();
  return { ok: true };
}

// Reject a pending earning — compare-and-set, no ledger effect.
export async function rejectReferralEarning(id: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const claim = await prisma.referralEarning.updateMany({
    where: { id, status: "pending" },
    data: { status: "rejected", reviewedById: session.user.id, reviewedByName: session.user.name },
  });
  if (claim.count === 0) {
    const exists = await prisma.referralEarning.count({ where: { id } });
    return { ok: false, error: exists ? "This earning has already been reviewed." : "Not found." };
  }
  revalidate();
  return { ok: true };
}
