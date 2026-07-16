import { randomInt } from "node:crypto";

// Unambiguous share/reference code alphabet — no 0/O/1/I so codes are easy to read and dictate.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// A random code of `len` characters (referral codes, ticket codes, …). Server only.
export function shortCode(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}
