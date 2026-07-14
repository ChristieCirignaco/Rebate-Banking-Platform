import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
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
  KycSubmissionsParams,
  KycSubmissionsResult,
  KycSubmissionView,
  KycTemplateStatus,
  KycTemplateSummary,
} from "@/components/admin/kyc/types";

export const SUBMISSION_PAGE_SIZE = 10;

function normalizeFieldType(value: string): KycFieldType {
  return value === "file" || value === "number" ? value : "text";
}

// Templates with field + submission counts, newest first.
export async function getKycTemplates(): Promise<KycTemplateSummary[]> {
  const templates = await prisma.kycTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
      _count: { select: { submissions: true } },
    },
  });

  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    description: template.description,
    applicableTo: template.applicableTo,
    status: template.status as KycTemplateStatus,
    fieldCount: template.fields.length,
    submissionCount: template._count.submissions,
    fields: template.fields.map((field) => ({
      label: field.label,
      type: normalizeFieldType(field.type),
      required: field.required,
    })),
    createdAt: template.createdAt.toISOString(),
  }));
}

// Coerce the stored fieldValues JSON into view models. File fields resolve to an
// access-controlled serving URL + an isImage flag; text/number keep their raw value.
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

function toSubmissionView(
  row: Prisma.KycSubmissionGetPayload<{
    include: { user: { select: { id: true; name: true; email: true; image: true } } };
  }>,
  reviewerName: string | null,
): KycSubmissionView {
  return {
    id: row.id,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      avatarUrl: row.user.image ?? undefined,
    },
    templateTitle: row.templateTitle ?? "KYC Verification",
    status: row.status as KycSubmissionStatus,
    note: row.note,
    remarks: row.remarks,
    manual: row.manual,
    fields: toFieldViews(row.fieldValues),
    reviewedBy: reviewerName,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// Server-paginated submissions with status + date-range + search filters. Used by both the
// pending queue (status "pending") and the full list (status filter).
export async function getKycSubmissions(
  params: KycSubmissionsParams = {},
): Promise<KycSubmissionsResult> {
  const rawPageSize = params.pageSize ?? SUBMISSION_PAGE_SIZE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.floor(rawPageSize), 100)
      : SUBMISSION_PAGE_SIZE;
  const requestedPage = Math.max(1, params.page ?? 1);
  const status = params.status && params.status !== "all" ? params.status : undefined;
  const search = params.search?.trim();

  const createdAt: Prisma.DateTimeFilter = {};
  if (params.from) createdAt.gte = new Date(`${params.from}T00:00:00.000Z`);
  if (params.to) createdAt.lte = new Date(`${params.to}T23:59:59.999Z`);

  const where: Prisma.KycSubmissionWhereInput = {
    ...(status ? { status } : {}),
    ...(params.from || params.to ? { createdAt } : {}),
    ...(search
      ? {
          OR: [
            { templateTitle: { contains: search, mode: "insensitive" } },
            { user: { is: { name: { contains: search, mode: "insensitive" } } } },
            { user: { is: { email: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const total = await prisma.kycSubmission.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.kycSubmission.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // Batch-resolve reviewer display names (reviewedById is a plain id, not a relation).
  const reviewerIds = [...new Set(rows.map((r) => r.reviewedById).filter(Boolean))] as string[];
  const reviewers = reviewerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, name: true },
      })
    : [];
  const reviewerName = new Map(reviewers.map((r) => [r.id, r.name]));

  return {
    rows: rows.map((row) =>
      toSubmissionView(row, row.reviewedById ? (reviewerName.get(row.reviewedById) ?? null) : null),
    ),
    total,
    page,
    pageSize,
    totalPages,
  };
}
