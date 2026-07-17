// Public brand-image (logo / flag) uploads. Unlike KYC documents these are non-sensitive
// and served publicly + cacheable — but still go through storage + a route (not public/),
// so the backend stays swappable. The "media" namespace is isolated from private "kyc".
export const MEDIA_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

// Brand images render small but ship on every page load, so this stays well below the ticket /
// KYC caps: it bounds what a logo costs every visitor, not what the platform can store.
export const MAX_MEDIA_BYTES = 2 * 1024 * 1024;

// The cap in words, DERIVED so a message can never contradict the check it sits next to. The
// three upload components and the route each hardcoded "512 KB" beside a MAX_MEDIA_BYTES test,
// so raising the constant alone would have left them all confidently stating the old number.
export const MAX_MEDIA_LABEL =
  MAX_MEDIA_BYTES >= 1024 * 1024
    ? `${Math.round((MAX_MEDIA_BYTES / (1024 * 1024)) * 10) / 10} MB`
    : `${Math.round(MAX_MEDIA_BYTES / 1024)} KB`;

export const MEDIA_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.svg";

export function mediaExtForContentType(contentType: string): string | null {
  const match = Object.entries(MEDIA_TYPES).find(([, ct]) => ct === contentType);
  return match ? match[0] : null;
}

export function mediaContentTypeForKey(key: string): string | null {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return MEDIA_TYPES[ext] ?? null;
}

export function mediaKeyBasename(key: string): string {
  return key.split("/").pop() ?? key;
}

// The public URL a stored media key is served at.
export function mediaUrl(key: string): string {
  return `/api/media/${mediaKeyBasename(key)}`;
}

// A stored value is one of ours if it points at the media route (new uploads) or is a
// legacy data-URI / local path / http URL (existing values stay valid). Used by validators.
export function isAcceptableImageValue(value: string): boolean {
  return (
    value.startsWith("/") || // /api/media/… (new) or /gateways/*.svg (static)
    /^https?:\/\//.test(value) ||
    /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/.test(value) // legacy
  );
}

async function uploadTo(
  endpoint: string,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(endpoint, { method: "POST", body: form });
  } catch {
    return { ok: false, error: "Network error during upload." };
  }
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; url?: string; error?: string }
    | null;
  if (!res.ok || !data?.ok || !data.url) {
    return { ok: false, error: data?.error ?? "Upload failed." };
  }
  return { ok: true, url: data.url };
}

// Client-side helper: upload one image through the admin endpoint and get its served URL.
export async function uploadMedia(file: File) {
  return uploadTo("/api/admin/media", file);
}

// Client-side helper for the (session-less) registration product step — authorized by the
// registration continuation cookie rather than an admin session.
export async function uploadRegistrationProductImage(file: File) {
  return uploadTo("/api/register/product-image", file);
}

// Client-side helper for a signed-in user submitting a product (the /products/new flow).
export async function uploadUserProductImage(file: File) {
  return uploadTo("/api/user/product-image", file);
}

// Client-side helper for a signed-in user uploading a manual-deposit payment proof (image/PDF).
// The returned URL is admin-served (private); see lib/deposit-proof.ts.
export async function uploadDepositProof(file: File) {
  return uploadTo("/api/user/deposit-proof", file);
}
