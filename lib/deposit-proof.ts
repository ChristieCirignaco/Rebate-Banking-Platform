import { keyBasename, KYC_FILE_ACCEPT, MAX_KYC_FILE_BYTES } from "@/lib/kyc/files";

// Payment proofs (a manual deposit method's "file" field) are sensitive documents handled
// exactly like KYC files: stored in a private storage namespace, served only through an
// access-controlled route, and limited to raster images + PDF. We reuse the KYC allowlist and
// size limit rather than keep a second copy, exposed here under deposit-friendly names. This
// module is import-safe from client components (no prisma/env).
export const DEPOSIT_PROOF_NAMESPACE = "deposit-proofs";
export const DEPOSIT_PROOF_ACCEPT = KYC_FILE_ACCEPT;
export const MAX_DEPOSIT_PROOF_BYTES = MAX_KYC_FILE_BYTES;

// The access-controlled URL a stored proof is fetched at (admin-only serving route).
export function depositProofUrl(key: string): string {
  return `/api/${DEPOSIT_PROOF_NAMESPACE}/${keyBasename(key)}`;
}

// Whether a stored field value is one of our uploaded proofs (vs. free text). Used to decide
// when to render a value as a viewable link and to validate submissions server-side.
export function isDepositProofUrl(value: string): boolean {
  return value.startsWith(`/api/${DEPOSIT_PROOF_NAMESPACE}/`);
}
