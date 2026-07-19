"use server";

import { requireActiveUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { getActiveKycTemplate } from "@/lib/kyc";
import { verifyKycDocument } from "@/lib/kyc/attachment-token";
import { contentTypeForKey, keyBasename } from "@/lib/kyc/files";
import { notifyAdmins, notifyUserOf } from "@/lib/notifications";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";

export type SubmitKycInput = {
  // Which active template this submission is against. An admin may run several at once.
  templateId?: string;
  fields: Record<string, string>; // template field id -> text/number value, or a storage key for file
  tokens: Record<string, string>; // template field id -> upload token proving this user uploaded it
  note?: string;
};
export type SubmitKycResult = { ok: true } | { ok: false; error: string };

const MAX_NOTE_LENGTH = 1000;
const MAX_VALUE_LENGTH = 500;

type FieldValue = {
  label: string;
  type: string;
  value: string;
  name?: string;
  contentType?: string;
};

// Submit identity verification against the active template. No PIN — this moves no money.
// Fail-closed on the kyc_submission flag; re-reads kycStatus so a pending/approved user can
// never stack a second submission; every `file` value must carry a valid per-user upload token
// (otherwise a client could submit another user's document key and read it back through the
// owner branch of /api/kyc-documents/[key]). Creates the submission and flips the user to
// "pending" in ONE transaction.
export async function submitKyc(input: SubmitKycInput): Promise<SubmitKycResult> {
  const { session } = await requireActiveUser();
  const userId = session.user.id;

  if (!(await isFeatureEnabled("kyc_submission"))) {
    return { ok: false, error: "Identity verification is currently disabled." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true, name: true, email: true },
  });
  if (!user) return { ok: false, error: "Account not found." };
  if (user.kycStatus === "pending") {
    return { ok: false, error: "Your verification is already under review." };
  }
  if (user.kycStatus === "approved") {
    return { ok: false, error: "Your identity is already verified." };
  }

  // Re-read by id rather than trusting the client: getActiveKycTemplate only returns a template
  // that is still active AND applicable to users, so a posted id for a disabled or admin-only
  // one resolves to nothing. No id (a single-template install) falls back to the first active.
  const template = await getActiveKycTemplate(input.templateId);
  if (!template) {
    return { ok: false, error: "Identity verification is not available right now." };
  }

  const fieldValues: FieldValue[] = [];
  for (const field of template.fields) {
    const raw = (input.fields?.[field.id] ?? "").trim();

    if (!raw) {
      if (field.required) return { ok: false, error: `${field.label} is required.` };
      fieldValues.push({ label: field.label, type: field.type, value: "" });
      continue;
    }

    if (field.type === "file") {
      // The value is an opaque storage key from /api/user/kyc-document. Require the token that
      // route minted for THIS user and THIS key — an unsigned or borrowed key is rejected.
      if (!verifyKycDocument(raw, userId, input.tokens?.[field.id])) {
        return { ok: false, error: `Please re-upload the file for ${field.label}.` };
      }
      const contentType = contentTypeForKey(raw);
      if (!contentType) return { ok: false, error: `Unsupported file for ${field.label}.` };
      fieldValues.push({
        label: field.label,
        type: field.type,
        value: raw,
        name: keyBasename(raw),
        contentType,
      });
      continue;
    }

    if (field.type === "number") {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) {
        return { ok: false, error: `${field.label} must be a number.` };
      }
    }

    fieldValues.push({ label: field.label, type: field.type, value: raw.slice(0, MAX_VALUE_LENGTH) });
  }

  const note = (input.note ?? "").trim().slice(0, MAX_NOTE_LENGTH);

  try {
    await prisma.$transaction(async (tx) => {
      // Claim the transition conditionally so two concurrent submits can't both create a
      // submission — the loser sees count === 0 and aborts.
      const claim = await tx.user.updateMany({
        where: { id: userId, kycStatus: { in: ["not_submitted", "rejected"] } },
        data: { kycStatus: "pending" },
      });
      if (claim.count === 0) throw new Error("DUPLICATE");

      await tx.kycSubmission.create({
        data: {
          userId,
          templateId: template.id,
          templateTitle: template.title, // snapshot; survives template rename/delete
          status: "pending",
          fieldValues,
          note: note || null,
          manual: false,
        },
      });
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "DUPLICATE") {
      return { ok: false, error: "Your verification is already under review." };
    }
    return { ok: false, error: "Could not submit your verification. Please try again." };
  }

  // Best-effort: the submission is already committed, so a notify failure must never surface
  // as a failed submit.
  try {
    await notifyAdmins({
      type: "kyc_submitted",
      title: "New KYC submission",
      message: `${user.name || user.email} submitted "${template.title}" for review.`,
    });
  } catch {
    // ignored — the admin queue still shows the submission.
  }

  // Verification is a review with no visible progress: the user is now locked out of resubmitting
  // (kycStatus is "pending") and would otherwise get no confirmation their documents arrived at
  // all. Best-effort (notifyUserOf swallows its own errors), so it can never fail a committed
  // submission.
  await notifyUserOf(userId, {
    type: "email",
    title: "Documents Received",
    message: `Your "${template.title}" documents are under review. We'll let you know as soon as a decision is made.`,
    greeting: user.name ? `Dear ${user.name},` : undefined,
    rows: [{ label: "Submission", value: template.title }],
    cta: { label: "View verification status", url: "/kyc" },
  });

  return { ok: true };
}
