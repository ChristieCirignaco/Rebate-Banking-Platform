// Allowlist + helpers for KYC document files, shared by the upload route, the serving
// route, and the data layer. SVG is deliberately excluded — inline SVG can carry script,
// and these files are served to admins; only raster images and PDF are accepted.
export const KYC_FILE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export const MAX_KYC_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

// A human hint for the composer/validators.
export const KYC_FILE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf";

// The file extension for an allowed content-type, or null if not allowed.
export function extForContentType(contentType: string): string | null {
  const match = Object.entries(KYC_FILE_TYPES).find(([, ct]) => ct === contentType);
  return match ? match[0] : null;
}

// The content-type implied by a stored key/filename's extension, or null if not allowed.
export function contentTypeForKey(key: string): string | null {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return KYC_FILE_TYPES[ext] ?? null;
}

export function isImageContentType(contentType: string | null | undefined): boolean {
  return !!contentType && contentType.startsWith("image/");
}

// Last path segment of a storage key (its opaque filename).
export function keyBasename(key: string): string {
  return key.split("/").pop() ?? key;
}

// The access-controlled URL a client uses to fetch a stored KYC document.
export function kycDocumentUrl(key: string): string {
  return `/api/kyc-documents/${keyBasename(key)}`;
}
