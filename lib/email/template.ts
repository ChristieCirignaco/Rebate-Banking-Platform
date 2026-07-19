import { prisma } from "@/lib/db";

// The transactional email template. Hand-rolled rather than pulled from a library because email
// HTML is its own dialect: no <style> in many clients, no flexbox/grid in Outlook, so this is
// table-based with everything inlined. Every mail also ships a plain-text twin — clients that
// refuse HTML need it, and its absence hurts spam scoring.
//
// Two audiences, one shell:
//   user  — the account holder. Warm, branded, links into the app.
//   admin — the operator. Compact, states what needs review, links into /admin.

export type EmailAudience = "user" | "admin";

export type EmailRow = { label: string; value: string };

export type EmailContent = {
  audience: EmailAudience;
  heading: string;
  // One or more plain sentences. Each becomes a paragraph.
  paragraphs: string[];
  // Optional detail table — the transaction facts (amount, reference, method).
  rows?: EmailRow[];
  // A one-time code (sign-in, transfer authorization). Rendered as its own large, letter-spaced
  // block rather than inline in a sentence: it's the one thing the reader needs, it has to
  // survive being read off a phone, and it must be selectable — so it stays live text, never an
  // image. Codes are the reason `note` usually carries the "didn't request this?" line.
  code?: string;
  cta?: { label: string; url: string };
  // Small print under the body, e.g. "You're receiving this because…".
  note?: string;
};

export type RenderedEmail = { subject: string; text: string; html: string };

type Brand = { name: string; url: string; supportEmail: string; logo: string | null };

// Read straight from the settings row rather than through getSettings(): this runs from
// fire-and-forget mail paths that aren't inside a request, where the React-cached store is
// pointless, and a settings failure must degrade to a usable default rather than throw.
async function loadBrand(): Promise<Brand> {
  const fallback: Brand = {
    name: "Rebate Bank",
    url: "",
    supportEmail: "",
    logo: null,
  };
  try {
    const [general, branding] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "general" } }),
      prisma.siteSetting.findUnique({ where: { key: "branding" } }),
    ]);
    const g = (general?.value ?? {}) as {
      brandName?: string;
      siteUrl?: string;
      supportEmail?: string;
    };
    const b = (branding?.value ?? {}) as { logoLight?: string | null };
    return {
      name: g.brandName?.trim() || fallback.name,
      url: g.siteUrl?.trim() || "",
      supportEmail: g.supportEmail?.trim() || "",
      logo: b.logoLight ?? null,
    };
  } catch {
    return fallback;
  }
}

// Everything interpolated into the HTML is escaped. These strings are assembled from admin
// remarks, method names and user names — none of it is trusted markup.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Absolute URLs only — a relative href is dead in an inbox. Returns null when siteUrl isn't
// configured, in which case the CTA is dropped rather than rendered broken.
function absolute(brand: Brand, url: string): string | null {
  if (/^https?:\/\//i.test(url)) return url;
  if (!brand.url) return null;
  return `${brand.url.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

const ACCENT = { user: "#2563eb", admin: "#0f172a" } as const;

export async function renderEmail(content: EmailContent): Promise<RenderedEmail> {
  const brand = await loadBrand();
  const accent = ACCENT[content.audience];
  const subject =
    content.audience === "admin" ? `[${brand.name} admin] ${content.heading}` : content.heading;

  // ---- plain text twin ----
  const textParts = [content.heading, "", ...content.paragraphs];
  if (content.code) textParts.push("", content.code);
  if (content.rows?.length) {
    textParts.push("", ...content.rows.map((r) => `${r.label}: ${r.value}`));
  }
  const ctaUrl = content.cta ? absolute(brand, content.cta.url) : null;
  if (content.cta && ctaUrl) textParts.push("", `${content.cta.label}: ${ctaUrl}`);
  if (content.note) textParts.push("", content.note);
  textParts.push("", `— ${brand.name}`);
  const text = textParts.join("\n");

  // ---- html ----
  // The uploaded logo is stored as a media PATH ("/api/media/..."), not an absolute URL, so
  // testing for https:// here dropped it and every mail fell back to the brand-name text.
  // Resolve it against siteUrl like any other link — an inbox can't fetch a relative src.
  // absolute() still returns null when siteUrl isn't configured, so a broken <img> is never
  // rendered; the text wordmark remains the fallback.
  const logo = brand.logo ? absolute(brand, brand.logo) : null;
  const header = logo
    ? `<img src="${esc(logo)}" alt="${esc(brand.name)}" height="28" style="height:28px;display:block;border:0" />`
    : `<span style="font-size:17px;font-weight:700;color:${accent};letter-spacing:-0.2px">${esc(brand.name)}</span>`;

  const paragraphs = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:23px;color:#334155">${esc(p)}</p>`,
    )
    .join("");

  // Monospace + wide tracking so 0/O and 1/l can't be misread, and a light panel so it reads as
  // a value to copy rather than body text.
  const code = content.code
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 20px;border-collapse:separate">
        <tr><td align="center" style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
          <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:6px;color:#0f172a">${esc(content.code)}</span>
        </td></tr>
      </table>`
    : "";

  const rows = content.rows?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 20px;border-collapse:separate;border-spacing:0;background:#f8fafc;border-radius:10px">
        ${content.rows
          .map(
            (r, i) => `<tr>
              <td style="padding:${i === 0 ? "14px" : "8px"} 16px 8px;font-size:13px;color:#64748b">${esc(r.label)}</td>
              <td align="right" style="padding:${i === 0 ? "14px" : "8px"} 16px 8px;font-size:13px;font-weight:600;color:#0f172a">${esc(r.value)}</td>
            </tr>`,
          )
          .join("")}
      </table>`
    : "";

  const cta =
    content.cta && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px">
          <tr><td style="border-radius:10px;background:${accent}">
            <a href="${esc(ctaUrl)}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${esc(content.cta.label)}</a>
          </td></tr>
        </table>`
      : "";

  const note = content.note
    ? `<p style="margin:18px 0 0;font-size:12px;line-height:19px;color:#94a3b8">${esc(content.note)}</p>`
    : "";

  const support = brand.supportEmail
    ? ` · <a href="mailto:${esc(brand.supportEmail)}" style="color:#94a3b8;text-decoration:underline">${esc(brand.supportEmail)}</a>`
    : "";

  // The preheader is the grey line inboxes show beside the subject. Hidden in the body itself.
  const preheader = content.paragraphs[0] ?? content.heading;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="color-scheme" content="light" /><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9">
    <tr><td align="center" style="padding:28px 12px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
        <tr><td style="padding:22px 24px 0">${header}</td></tr>
        <tr><td style="padding:16px 24px 24px">
          <h1 style="margin:0 0 12px;font-size:19px;line-height:26px;font-weight:700;color:#0f172a;letter-spacing:-0.3px">${esc(content.heading)}</h1>
          ${paragraphs}
          ${code}
          ${rows}
          ${cta}
          ${note}
        </td></tr>
        <tr><td style="padding:16px 24px 22px;border-top:1px solid #f1f5f9">
          <p style="margin:0;font-size:12px;line-height:19px;color:#94a3b8">${esc(brand.name)}${support}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}
