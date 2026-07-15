"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { saveSettings } from "@/lib/settings/store";
import { FEATURE_FLAGS, isFeatureFlagKey } from "@/lib/settings/feature-flags";
import type {
  BrandingSettings,
  GeneralSettings,
  LegalSettings,
  LimitsSettings,
  PluginsSettings,
  SecuritySettings,
} from "@/lib/settings/defs";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORIZED: ActionResult = { ok: false, error: "Not authorized." };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A storable URL is empty or an http(s) URL — rejects javascript:/data: schemes that would
// become stored XSS wherever these values are later rendered as links.
function isStorableUrl(value: string): boolean {
  const v = value.trim();
  return v === "" || /^https?:\/\//i.test(v);
}

// Revalidate the whole settings subtree (and the admin shell, which reads branding + the
// screen-lock config) so a save is reflected everywhere on the next render.
function revalidateSettings() {
  revalidatePath("/admin/settings", "layout");
  revalidatePath("/admin", "layout");
}

export async function updateGeneralSettings(
  payload: GeneralSettings,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  if (!payload.siteTitle?.trim()) return { ok: false, error: "Site title is required." };
  if (payload.supportEmail && !EMAIL_RE.test(payload.supportEmail.trim())) {
    return { ok: false, error: "Enter a valid support email." };
  }
  if (payload.fromEmail && !EMAIL_RE.test(payload.fromEmail.trim())) {
    return { ok: false, error: "Enter a valid From email." };
  }
  if (payload.replyTo && !EMAIL_RE.test(payload.replyTo.trim())) {
    return { ok: false, error: "Enter a valid Reply-To email." };
  }
  if (!isStorableUrl(payload.siteUrl)) {
    return { ok: false, error: "Site URL must start with http:// or https://." };
  }

  await saveSettings(
    "general",
    {
      siteTitle: payload.siteTitle.trim(),
      brandName: payload.brandName.trim(),
      description: payload.description.trim(),
      seoKeywords: payload.seoKeywords.map((k) => k.trim()).filter(Boolean),
      siteUrl: payload.siteUrl.trim(),
      timezone: payload.timezone,
      defaultCurrency: payload.defaultCurrency,
      supportEmail: payload.supportEmail.trim(),
      supportPhone: payload.supportPhone.trim(),
      address: payload.address.trim(),
      fromName: payload.fromName.trim(),
      fromEmail: payload.fromEmail.trim(),
      replyTo: payload.replyTo.trim(),
      footerText: payload.footerText.trim(),
    },
    session.user.id,
  );
  revalidateSettings();
  return { ok: true };
}

export async function updateBrandingSettings(
  payload: BrandingSettings,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;
  await saveSettings("branding", payload, session.user.id);
  revalidateSettings();
  return { ok: true };
}

export async function updatePluginsSettings(
  payload: PluginsSettings,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;
  await saveSettings("plugins", payload, session.user.id);
  revalidateSettings();
  return { ok: true };
}

export async function updateSecuritySettings(
  payload: SecuritySettings,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;
  if (
    payload.screenLockEnabled &&
    (payload.screenLockIdleValue <= 0 || payload.screenLockIdleValue > 100_000)
  ) {
    return { ok: false, error: "Screen-lock idle time is out of range." };
  }
  if (payload.passwordMinLength < 6 || payload.passwordMinLength > 128) {
    return { ok: false, error: "Password minimum length must be between 6 and 128." };
  }
  const positiveInts = [
    payload.sessionLifetimeMinutes,
    payload.loginMaxAttempts,
    payload.loginLockoutMinutes,
  ];
  if (positiveInts.some((n) => !Number.isFinite(n) || n < 1)) {
    return { ok: false, error: "Session and login values must be at least 1." };
  }
  await saveSettings("security", payload, session.user.id);
  revalidateSettings();
  return { ok: true };
}

export async function updateLimitsSettings(
  payload: LimitsSettings,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;
  const nonNeg = [
    payload.withdrawalMin,
    payload.withdrawalMax,
    payload.withdrawalDailyLimit,
    payload.depositMin,
    payload.depositMax,
    payload.makerCheckerThreshold,
  ];
  if (nonNeg.some((n) => !Number.isFinite(n) || n < 0)) {
    return { ok: false, error: "Limits must be zero or a positive number." };
  }
  if (payload.withdrawalMax > 0 && payload.withdrawalMax < payload.withdrawalMin) {
    return { ok: false, error: "Withdrawal maximum can't be less than the minimum." };
  }
  if (payload.depositMax > 0 && payload.depositMax < payload.depositMin) {
    return { ok: false, error: "Deposit maximum can't be less than the minimum." };
  }
  await saveSettings("limits", payload, session.user.id);
  revalidateSettings();
  return { ok: true };
}

export async function updateLegalSettings(
  payload: LegalSettings,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  // Every URL field is rendered as a link somewhere down the line — reject non-http(s)
  // schemes so a stored value can't become a javascript:/data: XSS vector.
  const urls = [
    payload.termsUrl,
    payload.privacyUrl,
    payload.socialFacebook,
    payload.socialX,
    payload.socialInstagram,
    payload.socialLinkedin,
    payload.socialYoutube,
    payload.socialTiktok,
  ];
  if (urls.some((url) => !isStorableUrl(url))) {
    return { ok: false, error: "Links must start with http:// or https://." };
  }

  await saveSettings("legal", payload, session.user.id);
  revalidateSettings();
  return { ok: true };
}

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;
  if (!isFeatureFlagKey(key)) return { ok: false, error: "Unknown feature flag." };

  const def = FEATURE_FLAGS.find((flag) => flag.key === key)!;
  await prisma.featureFlag.upsert({
    where: { key },
    create: { key, enabled, description: def.description, updatedBy: session.user.id },
    update: { enabled, updatedBy: session.user.id },
  });
  revalidateSettings();
  return { ok: true };
}

// Verifies the signed-in admin's password to dismiss the idle screen lock. Does NOT create
// or refresh a session — the existing session already authorizes; this only re-confirms the
// human. Returns a generic error so it can't be used to probe which accounts exist.
export async function unlockScreen(password: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Session expired. Please sign in again." };
  if (!password) return { ok: false, error: "Enter your password." };

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "credential" },
    select: { password: true },
  });
  if (!account?.password) {
    return { ok: false, error: "Password unlock isn't available for this account." };
  }

  const valid = await verifyPassword({ hash: account.password, password });
  if (!valid) return { ok: false, error: "Incorrect password." };
  return { ok: true };
}
