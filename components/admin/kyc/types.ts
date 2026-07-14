// Shared KYC types — no server/client-only imports so both the data layer and the client
// components can pull from here.

export type KycFieldType = "text" | "file" | "number";
export type KycTemplateStatus = "active" | "inactive";
export type KycSubmissionStatus = "pending" | "approved" | "rejected";

// A row in the template's dynamic field builder.
export interface KycTemplateFieldRow {
  label: string;
  type: KycFieldType;
  required: boolean;
}

export interface KycTemplateSummary {
  id: string;
  title: string;
  description: string | null;
  applicableTo: string; // always "user" (merchants unsupported)
  status: KycTemplateStatus;
  fieldCount: number;
  submissionCount: number;
  fields: KycTemplateFieldRow[];
  createdAt: string;
}

export interface KycUserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// A single submitted field, view-ready. File fields carry an access-controlled serving
// url plus flags the modal uses to decide inline-image vs. download.
export interface KycFieldValueView {
  label: string;
  type: KycFieldType;
  value: string; // text/number value; for file, the display filename
  url?: string; // file: /api/kyc-documents/<key>
  name?: string; // file: original filename
  contentType?: string; // file: mime
  isImage?: boolean; // file: render inline (image) vs. download (pdf/other)
}

export interface KycSubmissionView {
  id: string;
  user: KycUserSummary;
  templateTitle: string;
  status: KycSubmissionStatus;
  note: string | null;
  remarks: string | null;
  manual: boolean; // admin-created / manually approved (may have no fields/note)
  fields: KycFieldValueView[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface KycSubmissionsResult {
  rows: KycSubmissionView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface KycSubmissionsParams {
  status?: KycSubmissionStatus | "all";
  page?: number;
  pageSize?: number;
  search?: string;
  from?: string;
  to?: string;
}

// Template create/update payload (applicableTo is fixed to "user" server-side).
export interface KycTemplatePayload {
  title: string;
  description?: string;
  status: KycTemplateStatus;
  fields: KycTemplateFieldRow[];
}
