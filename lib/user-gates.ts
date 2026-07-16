import { controlRequires } from "@/lib/controls";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings/store";

// The preconditions a user must satisfy before ANY money action. Two independent sources, and
// either one is enough to block:
//
//   per-user   — the requirement controls an admin sets on one account (Users → detail → User
//                Controls): email_verification, kyc_verification. Off unless switched on.
//   system-wide— Settings → Limits → "Require KYC for transactions": every user must hold an
//                approved KYC. Off by default.
//
// Every money action funnels through here so an operator who requires KYC means it for deposits,
// transfers, exchanges, requests, vouchers and withdrawals alike — rather than each action
// growing its own copy of the rule.
//
// Related but narrower: Settings → Limits → kycRequiredForWithdrawal applies approved-KYC to
// withdrawals only (lib/withdrawals), and stacks with these.

export type RequirementFields = {
  controls: unknown;
  emailVerified: boolean;
  kycStatus: string;
};

// Async because the system-wide setting has to be read; the actions already load `controls` for
// their own capability check, so they pass the user in rather than paying for a second query.
// Returns null when the user may proceed.
export async function requirementBlock(user: RequirementFields): Promise<string | null> {
  if (controlRequires(user.controls, "email_verification") && !user.emailVerified) {
    return "Verify your email address to continue. Check your inbox.";
  }

  // Per-user requirement OR the system-wide one — whichever is on.
  const limits = await getSettings("limits");
  const kycRequired =
    controlRequires(user.controls, "kyc_verification") || limits.kycRequiredForTransactions;

  if (kycRequired && user.kycStatus !== "approved") {
    return user.kycStatus === "pending"
      ? "Your identity verification is still under review."
      : "Complete identity verification to continue. Open Verification to submit your documents.";
  }
  return null;
}

// For callers that don't already have the user loaded.
export async function requirementReason(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { controls: true, emailVerified: true, kycStatus: true },
  });
  if (!user) return "Account not found.";
  return requirementBlock(user);
}
