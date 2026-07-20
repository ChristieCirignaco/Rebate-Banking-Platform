// Server-side validation for CMS content against the field schemas. Actions
// pass raw client payloads through here before persisting; unknown keys are
// dropped and every value is coerced/sanitized per its declared field type.
import { CMS_ICONS } from "@/lib/cms/icons";
import { isAcceptableImageValue } from "@/lib/media";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { CmsData, CmsFieldDef } from "./types";
import { SEED_PAGES } from "./seed-data";

const MAX_TEXT = 500;
const MAX_TEXTAREA = 10_000;
const MAX_RICHTEXT = 200_000;

export type ValidateResult = { ok: true; data: CmsData } | { ok: false; error: string };

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

// Hrefs may be internal ("/register", "/#faq"), web, mailto: or tel: — never
// javascript:/data: (these land in <a href> and <video src>).
function isSafeHref(value: string): boolean {
  return (
    value.startsWith("/") ||
    value.startsWith("#") ||
    /^https?:\/\//i.test(value) ||
    /^mailto:[^\s]+$/i.test(value) ||
    /^tel:[+\d\s().-]+$/i.test(value)
  );
}

export function validateCmsData(fields: CmsFieldDef[], input: unknown): ValidateResult {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const data: CmsData = {};

  for (const field of fields) {
    const value = raw[field.key];
    const missing = value === undefined || value === null || value === "";
    if (missing || (Array.isArray(value) && value.length === 0)) {
      if (field.required) return { ok: false, error: `${field.label} is required.` };
      data[field.key] = field.type === "lines" ? [] : "";
      continue;
    }

    switch (field.type) {
      case "text":
      case "accent":
      case "select":
      case "icon": {
        const s = asString(value)?.trim();
        if (s === null || s === undefined) return { ok: false, error: `${field.label} must be text.` };
        if (s.length > MAX_TEXT) return { ok: false, error: `${field.label} is too long.` };
        if (field.type === "select" && field.options && !field.options.includes(s)) {
          return { ok: false, error: `Choose a valid ${field.label.toLowerCase()}.` };
        }
        if (field.type === "icon" && !CMS_ICONS[s]) {
          return { ok: false, error: `Choose a valid icon for ${field.label}.` };
        }
        data[field.key] = s;
        break;
      }
      case "textarea": {
        const s = asString(value);
        if (s === null) return { ok: false, error: `${field.label} must be text.` };
        if (s.length > MAX_TEXTAREA) return { ok: false, error: `${field.label} is too long.` };
        data[field.key] = s.trim();
        break;
      }
      case "richtext": {
        const s = asString(value);
        if (s === null) return { ok: false, error: `${field.label} must be text.` };
        if (s.length > MAX_RICHTEXT) return { ok: false, error: `${field.label} is too long.` };
        data[field.key] = sanitizeHtml(s);
        break;
      }
      case "url":
      case "video": {
        const s = asString(value)?.trim() ?? "";
        if (!s || s.length > 2000 || !isSafeHref(s)) {
          return { ok: false, error: `${field.label} must be a valid link or path.` };
        }
        data[field.key] = s;
        break;
      }
      case "image": {
        const s = asString(value)?.trim() ?? "";
        if (!s || s.length > 2000 || !isAcceptableImageValue(s)) {
          return { ok: false, error: `${field.label} must be an uploaded image or a valid image path.` };
        }
        data[field.key] = s;
        break;
      }
      case "number": {
        const n = typeof value === "number" ? value : Number(asString(value));
        if (!Number.isFinite(n)) return { ok: false, error: `${field.label} must be a number.` };
        data[field.key] = n;
        break;
      }
      case "lines": {
        const arr = Array.isArray(value)
          ? value
          : typeof value === "string"
            ? value.split("\n")
            : null;
        if (!arr) return { ok: false, error: `${field.label} must be a list.` };
        const lines = arr
          .map((l) => (typeof l === "string" ? l.trim() : ""))
          .filter(Boolean)
          .slice(0, 100);
        if (field.required && lines.length === 0) {
          return { ok: false, error: `${field.label} is required.` };
        }
        data[field.key] = lines;
        break;
      }
    }
  }

  return { ok: true, data };
}

// Slugs an admin-created page may NOT take: every real route segment in the
// app plus the seeded marketing pages (which have dedicated route files).
export const RESERVED_SLUGS = new Set<string>([
  ...SEED_PAGES.map((p) => p.slug),
  "admin",
  "api",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "two-factor",
  "verify-email",
  "verify-otp",
  "account-suspended",
  "pending-approval",
  "news",
  "account",
  "dashboard",
  "deposit",
  "exchange",
  "kyc",
  "notifications",
  "products",
  "referrals",
  "request",
  "search",
  "send",
  "settings",
  "statistic",
  "support",
  "transactions",
  "voucher",
  "wallet",
  "withdraw",
]);

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function validatePageSlug(slug: string): string | null {
  if (!slug) return "Enter a slug.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "Slugs may only contain lowercase letters, numbers, and dashes.";
  }
  if (RESERVED_SLUGS.has(slug)) return "This slug is reserved by an existing page or route.";
  return null;
}
