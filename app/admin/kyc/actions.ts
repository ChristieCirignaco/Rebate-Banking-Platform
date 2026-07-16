"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { getKycSubmissions } from "@/lib/admin/kyc";
import { notifyUser } from "@/app/admin/users/[id]/actions";
import type {
  KycFieldType,
  KycSubmissionsParams,
  KycSubmissionsResult,
  KycTemplatePayload,
} from "@/components/admin/kyc/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORIZED: ActionResult = { ok: false, error: "Not authorized." };

const EMPTY_SUBMISSIONS: KycSubmissionsResult = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

function revalidate() {
  revalidatePath("/admin/kyc");
  revalidatePath("/admin/kyc/pending");
  revalidatePath("/admin/kyc/template");
}

function normalizeType(value: KycFieldType): KycFieldType {
  return value === "file" || value === "number" ? value : "text";
}

// Shared validation for create/update. Returns an error message or null.
function validateTemplate(payload: KycTemplatePayload): string | null {
  if (!payload.title?.trim()) return "Template title is required.";
  if (!Array.isArray(payload.fields) || payload.fields.length === 0) {
    return "Add at least one field to the template.";
  }
  for (const field of payload.fields) {
    if (!field.label?.trim()) return "Every field needs a name.";
    if (!["text", "file", "number"].includes(field.type)) {
      return "Every field needs a valid type.";
    }
  }
  return null;
}

export async function createKycTemplate(payload: KycTemplatePayload): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const error = validateTemplate(payload);
  if (error) return { ok: false, error };

  await prisma.kycTemplate.create({
    data: {
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      applicableTo: "user",
      status: payload.status === "inactive" ? "inactive" : "active",
      fields: {
        create: payload.fields.map((field, index) => ({
          label: field.label.trim(),
          type: normalizeType(field.type),
          required: field.required,
          sortOrder: index,
        })),
      },
    },
  });

  revalidate();
  return { ok: true };
}

export async function updateKycTemplate(
  id: string,
  payload: KycTemplatePayload,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  const error = validateTemplate(payload);
  if (error) return { ok: false, error };

  const existing = await prisma.kycTemplate.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "Template not found." };

  // Replace the field set wholesale, like the deposit/withdraw method updates.
  await prisma.$transaction(async (tx) => {
    await tx.kycTemplate.update({
      where: { id },
      data: {
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        status: payload.status === "inactive" ? "inactive" : "active",
      },
    });
    await tx.kycTemplateField.deleteMany({ where: { templateId: id } });
    await tx.kycTemplateField.createMany({
      data: payload.fields.map((field, index) => ({
        templateId: id,
        label: field.label.trim(),
        type: normalizeType(field.type),
        required: field.required,
        sortOrder: index,
      })),
    });
  });

  revalidate();
  return { ok: true };
}

export async function deleteKycTemplate(id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  // Fields cascade; existing submissions keep their templateTitle snapshot (templateId
  // becomes null via SetNull), so history stays readable.
  try {
    await prisma.kycTemplate.delete({ where: { id } });
  } catch (error) {
    // Already gone → idempotent success. Any other error is real and must surface.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      revalidate();
      return { ok: true };
    }
    return { ok: false, error: "Could not delete the template. Please try again." };
  }
  revalidate();
  return { ok: true };
}

// Approve/reject atomically claim a pending submission (compare-and-set) and, in the same
// transaction, sync the denormalized User.kycStatus the users list reads. The user notice
// reuses the existing notify pipeline (best-effort, after commit).
async function reviewSubmission(
  id: string,
  decision: "approved" | "rejected",
  remarks: string,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;
  const note = remarks.trim() || null;

  let userId: string;
  try {
    userId = await prisma.$transaction(async (tx) => {
      const claim = await tx.kycSubmission.updateMany({
        where: { id, status: "pending" },
        data: {
          status: decision,
          remarks: note,
          reviewedById: session.user.id,
          reviewedByName: session.user.name,
          reviewedAt: new Date(),
        },
      });
      if (claim.count === 0) throw new Error("ALREADY");

      const sub = await tx.kycSubmission.findUnique({ where: { id }, select: { userId: true } });
      if (!sub) throw new Error("MISSING");

      await tx.user.update({ where: { id: sub.userId }, data: { kycStatus: decision } });
      return sub.userId;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY") {
      return { ok: false, error: "This submission has already been reviewed." };
    }
    return { ok: false, error: "Could not update the submission. Please try again." };
  }

  // Notify the user through the shared pipeline; the review already committed, so a notify
  // failure must not fail the action.
  try {
    await notifyUser(userId, {
      // "email" = bell row AND mail. A verification decision is exactly the kind of thing a
      // user should not have to be in the app to discover.
      type: "email",
      title: decision === "approved" ? "KYC approved" : "KYC rejected",
      message:
        decision === "approved"
          ? `Your identity verification has been approved.${note ? ` Note: ${note}` : ""}`
          : `Your identity verification was rejected.${note ? ` Reason: ${note}` : ""}`,
    });
  } catch {
    // best-effort
  }

  revalidate();
  // The review also flips User.kycStatus, which the /admin/users list surfaces.
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function approveKycSubmission(id: string, remarks: string): Promise<ActionResult> {
  return reviewSubmission(id, "approved", remarks);
}

export async function rejectKycSubmission(id: string, remarks: string): Promise<ActionResult> {
  return reviewSubmission(id, "rejected", remarks);
}

// Read action powering client-side pagination on both KYC list pages.
export async function listKycSubmissions(
  params: KycSubmissionsParams,
): Promise<KycSubmissionsResult> {
  if (!(await getAdminSession())) return EMPTY_SUBMISSIONS;
  return getKycSubmissions(params);
}
