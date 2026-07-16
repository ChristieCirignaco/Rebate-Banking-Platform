import { controlRequires } from "@/lib/controls";
import { prisma } from "@/lib/db";

// The per-user REQUIREMENT controls an admin switches on from Users → detail → User Controls.
// Unlike the capability controls (each money action checks its own key), these two are
// account-wide preconditions, so every money action runs them through this one helper: an admin
// who requires KYC for a user means it for deposits, transfers, exchanges, requests, vouchers and
// withdrawals alike. Both are off unless explicitly switched on, so this is a no-op for a user no
// admin has touched.
//
// The global equivalents live elsewhere and stack with these: Settings → Limits →
// `kycRequiredForWithdrawal` applies approved-KYC to withdrawals for EVERY user (lib/withdrawals).

export type RequirementFields = {
  controls: unknown;
  emailVerified: boolean;
  kycStatus: string;
};

// Pure: the actions already load `controls` for their capability check, so they select these two
// extra columns rather than pay for a second round-trip. Returns null when the user may proceed.
export function requirementBlock(user: RequirementFields): string | null {
  if (controlRequires(user.controls, "email_verification") && !user.emailVerified) {
    return "Verify your email address to continue. Check your inbox.";
  }
  if (controlRequires(user.controls, "kyc_verification") && user.kycStatus !== "approved") {
    return user.kycStatus === "pending"
      ? "Your identity verification is still under review."
      : "Complete identity verification to continue.";
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
