// Voucher code format, shared by the client (redeem-modal validation) and the server (redeem
// action). Pure — no node/prisma imports — so it is safe to import into client components.
// A code is a fixed prefix followed by 8 uppercase alphanumeric characters, e.g. VCHR1A2B3C4D.
export const VOUCHER_PREFIX = "VCHR";
export const VOUCHER_CODE_LENGTH = 8;
export const VOUCHER_CODE_RE = new RegExp(`^${VOUCHER_PREFIX}[A-Z0-9]{${VOUCHER_CODE_LENGTH}}$`);

export function normalizeVoucherCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidVoucherCode(code: string): boolean {
  return VOUCHER_CODE_RE.test(normalizeVoucherCode(code));
}
