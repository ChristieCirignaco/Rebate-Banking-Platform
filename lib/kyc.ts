import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import {
  contentTypeForKey,
  isImageContentType,
  keyBasename,
  kycDocumentUrl,
} from "@/lib/kyc/files";
import type {
  KycFieldType,
  KycFieldValueView,
  KycSubmissionStatus,
} from "@/components/admin/kyc/types";

// The user-facing read layer for identity verification (/kyc). The admin side lives in
// lib/admin/kyc.ts; this one only ever reads the caller's OWN template + submission.

export type KycStatus = "not_submitted" | "pending" | "approved" | "rejected";

// One field of the active template, ready for the dynamic form.
export interface KycFormFieldView {
  id: string;
  label: string;
  type: KycFieldType;
  required: boolean;
}

export interface KycTemplateFormView {
  id: string;
  title: string;
  description: string | null;
  fields: KycFormFieldView[];
}

// The user's own latest submission, view-ready. Dates are pre-formatted strings — no Date or
// BigInt crosses the RSC boundary.
export interface KycOwnSubmissionView {
  id: string;
  status: KycSubmissionStatus;
  templateTitle: string;
  note: string | null;
  remarks: string | null;
  fields: KycFieldValueView[];
  submittedAt: string; // formatted label
  reviewedAt: string | null; // formatted label
}

export interface KycData {
  template: KycTemplateFormView | null;
  submission: KycOwnSubmissionView | null;
  kycStatus: KycStatus;
  canSubmit: boolean;
}

function normalizeFieldType(value: string): KycFieldType {
  return value === "file" || value === "number" ? value : "text";
}

function normalizeStatus(value: string): KycStatus {
  return value === "pending" || value === "approved" || value === "rejected"
    ? value
    : "not_submitted";
}

function normalizeSubmissionStatus(value: string): KycSubmissionStatus {
  return value === "approved" || value === "rejected" ? value : "pending";
}

// Coerce the stored fieldValues JSON into view models. File fields resolve to an
// access-controlled serving URL + an isImage flag; text/number keep their raw value.
// Mirrors toFieldViews in lib/admin/kyc.ts (duplicated per-side by convention).
function toFieldViews(raw: Prisma.JsonValue | null): KycFieldValueView[] {
  if (!Array.isArray(raw)) return [];
  const views: KycFieldValueView[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const entry = item as Record<string, unknown>;
    const label = typeof entry.label === "string" ? entry.label : "";
    const type = normalizeFieldType(typeof entry.type === "string" ? entry.type : "text");
    const value = typeof entry.value === "string" ? entry.value : "";

    if (type === "file") {
      if (!value) {
        views.push({ label, type, value: "" });
        continue;
      }
      const contentType =
        typeof entry.contentType === "string"
          ? entry.contentType
          : (contentTypeForKey(value) ?? undefined);
      const name = typeof entry.name === "string" ? entry.name : keyBasename(value);
      views.push({
        label,
        type,
        value: name,
        url: kycDocumentUrl(value),
        name,
        contentType,
        isImage: isImageContentType(contentType),
      });
    } else {
      views.push({ label, type, value });
    }
  }
  return views;
}

// The template users submit against: the most recent ACTIVE one applicable to users.
export async function getActiveKycTemplate(): Promise<KycTemplateFormView | null> {
  const template = await prisma.kycTemplate.findFirst({
    where: { status: "active", applicableTo: "user" },
    orderBy: { createdAt: "desc" }, // most recent wins if several are active
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return null;

  return {
    id: template.id,
    title: template.title,
    description: template.description,
    fields: template.fields.map((field) => ({
      id: field.id,
      label: field.label,
      type: normalizeFieldType(field.type),
      required: field.required,
    })),
  };
}

// Everything /kyc needs for one user: the active template, their latest submission, their
// account KYC status, and whether the form should be open.
export async function getKycData(userId: string): Promise<KycData> {
  const [user, template, latest] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } }),
    getActiveKycTemplate(),
    prisma.kycSubmission.findFirst({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], // id tiebreaker keeps this deterministic
    }),
  ]);

  const kycStatus = normalizeStatus(user?.kycStatus ?? "not_submitted");

  const submission: KycOwnSubmissionView | null = latest
    ? {
        id: latest.id,
        status: normalizeSubmissionStatus(latest.status),
        templateTitle: latest.templateTitle ?? "KYC Verification",
        note: latest.note,
        remarks: latest.remarks,
        fields: toFieldViews(latest.fieldValues),
        submittedAt: formatDateTime(latest.createdAt.toISOString()),
        reviewedAt: latest.reviewedAt ? formatDateTime(latest.reviewedAt.toISOString()) : null,
      }
    : null;

  return {
    template,
    submission,
    kycStatus,
    // A review in flight or already passed closes the form; a rejected user MUST be able to
    // resubmit, and a never-submitted one starts fresh.
    canSubmit: kycStatus !== "pending" && kycStatus !== "approved",
  };
}

// True if the user has a submission referencing the given document key/basename. Used by the
// serving route to let an owner view the documents in their OWN submission.
export async function userOwnsKycDocument(userId: string, key: string): Promise<boolean> {
  const rows = await prisma.kycSubmission.findMany({
    where: { userId, fieldValues: { not: Prisma.DbNull } },
    select: { fieldValues: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  for (const row of rows) {
    if (!Array.isArray(row.fieldValues)) continue;
    for (const item of row.fieldValues) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const entry = item as Record<string, unknown>;
      if (entry.type !== "file" || typeof entry.value !== "string" || !entry.value) continue;
      if (keyBasename(entry.value) === key) return true;
    }
  }
  return false;
}
