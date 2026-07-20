// Allowlist + helpers for PUBLIC documents attached to marketing pages (privacy policy PDFs,
// company profiles, rate sheets). Mirrors lib/kyc/files.ts in shape, but this namespace is
// public and cacheable — these are published on the marketing site, not access-controlled.
//
// SVG is deliberately excluded, exactly as it is for KYC. An SVG is a script carrier, and these
// render on public marketing pages; lib/media.ts allows it for brand logos only because that
// route serves it under a locked-down CSP and never embeds it as active content.
//
// Import-safe from client components: no prisma, no env, no node builtins.

export const CMS_DOCUMENT_NAMESPACE = "cms-documents";

// Extension → content type. The extension is what we store (putObject writes `<uuid>.<ext>`),
// so this map is also what the serving route trusts — a stored key can only ever resolve to a
// type that appears here.
export const CMS_DOCUMENT_TYPES: Record<string, string> = {
  // previewable inline
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  // download-only
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  zip: "application/zip",
};

// Documents are whole files, not logos — the 2 MB media cap (which bounds what a logo costs on
// every page load) is far too small for a policy PDF. This bounds a deliberate, occasional
// download instead.
export const MAX_CMS_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const MAX_CMS_DOCUMENT_LABEL = `${Math.round(MAX_CMS_DOCUMENT_BYTES / (1024 * 1024))} MB`;

export const CMS_DOCUMENT_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip";

/**
 * How a document is presented on the public page.
 *
 * Only images and PDFs can be previewed in a browser without shipping the bytes to a
 * third-party viewer (Google Docs / Office Online), which would publish the file to an outside
 * service. Everything else is therefore a download card — an honest affordance rather than a
 * preview that silently fails or leaks.
 */
export type CmsDocumentKind = "image" | "pdf" | "file";

export function cmsDocumentExtForContentType(contentType: string): string | null {
  const match = Object.entries(CMS_DOCUMENT_TYPES).find(([, ct]) => ct === contentType);
  return match ? match[0] : null;
}

export function cmsDocumentContentTypeForKey(key: string): string | null {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return CMS_DOCUMENT_TYPES[ext] ?? null;
}

export function cmsDocumentExt(value: string): string {
  // Strip any query/hash before reading the extension, or "?download=1" becomes the extension.
  const clean = value.split(/[?#]/)[0] ?? "";
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

export function cmsDocumentKind(value: string): CmsDocumentKind {
  const ext = cmsDocumentExt(value);
  const contentType = CMS_DOCUMENT_TYPES[ext];
  if (!contentType) return "file";
  if (contentType.startsWith("image/")) return "image";
  if (contentType === "application/pdf") return "pdf";
  return "file";
}

/** Uppercase extension for the download card badge, e.g. "PDF", "DOCX". */
export function cmsDocumentLabel(value: string): string {
  return cmsDocumentExt(value).toUpperCase() || "FILE";
}

export function cmsDocumentKeyBasename(key: string): string {
  return key.split("/").pop() ?? key;
}

/** The public URL a stored document key is served at. */
export function cmsDocumentUrl(key: string): string {
  return `/api/${CMS_DOCUMENT_NAMESPACE}/${cmsDocumentKeyBasename(key)}`;
}

/** Forces a save-as instead of an inline render. */
export function cmsDocumentDownloadUrl(value: string): string {
  return `${value}${value.includes("?") ? "&" : "?"}download=1`;
}

/**
 * Whether a stored field value is a document we serve. Used by the save-time validator, so it
 * must stay strict: an arbitrary external URL here would let an admin point a "document" at any
 * third-party host and have the page embed it.
 */
export function isCmsDocumentValue(value: string): boolean {
  return value.startsWith(`/api/${CMS_DOCUMENT_NAMESPACE}/`);
}

/** Human-readable byte size for the download card. */
export function formatDocumentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}
