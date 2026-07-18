"use server";

import { randomUUID } from "node:crypto";

import { cookies, headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { getCountryByCode } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { awardReferral, referrerIdForCode } from "@/lib/referrals";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { REGISTRATION_COOKIE, signRegistrationToken } from "@/lib/registration-token";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";

export type RegisterResult = { ok: true } | { ok: false; error: string };

const RegisterSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(60),
  lastName: z.string().trim().min(1, "Last name is required.").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  // Cap at 128 to match Better Auth's default maxPasswordLength — otherwise a 129-200 char
  // passphrase passes here but signUpEmail throws PASSWORD_TOO_LONG and the user gets a
  // confusing generic error.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
  countryCode: z.string().trim().toUpperCase().length(2),
  dialCode: z.string().trim().regex(/^\+\d{1,5}$/, "Invalid dial code."),
  phone: z.string().trim().min(3, "Enter your phone number.").max(20),
  gender: z.enum(["male", "female", "other", "unspecified"]),
  address: z.string().trim().min(3, "Enter your home address.").max(200),
  timezone: z.string().trim().max(64).optional(),
  ref: z.string().trim().max(32).optional(), // referral share code from /register?ref=
  // reCAPTCHA token from the client widget. Optional in the schema because it's only present
  // when the admin has enabled reCAPTCHA — verifyRecaptcha decides whether its absence matters.
  recaptchaToken: z.string().max(4000).optional(),
  acceptedTerms: z.literal(true, { message: "Please accept the Terms and Conditions." }),
});

export type RegisterInput = z.input<typeof RegisterSchema>;

// Lightweight in-memory throttle for the register action (it is a server action, not an
// /api/auth route, so Better Auth's rate limiter doesn't cover it). Mirrors Better Auth's
// memory store — swap for a shared store when running multi-instance. Keyed independently by
// client IP AND by email, so spoofing the IP header can't email-bomb a single address, and a
// single IP can't flood the (argon2 + email) path. Expired buckets are pruned on every call
// and the map is size-capped, so it can't grow without bound.
const REGISTER_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_MAX_PER_IP = 5;
const REGISTER_MAX_PER_EMAIL = 3;
const RATE_MAP_CAP = 10_000;
const registerHits = new Map<string, { count: number; resetAt: number }>();

function prune(now: number) {
  for (const [key, hit] of registerHits) {
    if (hit.resetAt < now) registerHits.delete(key);
  }
  // Hard backstop against pathological growth between prunes.
  if (registerHits.size > RATE_MAP_CAP) {
    const overflow = registerHits.size - RATE_MAP_CAP;
    let i = 0;
    for (const key of registerHits.keys()) {
      if (i++ >= overflow) break;
      registerHits.delete(key);
    }
  }
}

function hit(key: string, max: number, now: number): boolean {
  const bucket = registerHits.get(key);
  if (!bucket || bucket.resetAt < now) {
    registerHits.set(key, { count: 1, resetAt: now + REGISTER_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
}

// The client IP as reported by the immediate (trusted) proxy. Prefer x-real-ip; otherwise the
// RIGHTMOST x-forwarded-for hop (the one our proxy appended), never the leftmost token, which
// is fully client-controlled and trivially spoofed.
function clientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return "unknown";
}

// Normalize a national phone number: keep digits, drop a single leading trunk zero, and
// prefix the selected dial code, e.g. ("+234","0802 123 4567") -> "+234 802 123 4567".
function formatPhone(dialCode: string, raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  return `${dialCode} ${digits}`;
}

// Drop a signed, httpOnly continuation cookie that carries the (session-less) registrant into
// the optional product-upload step. Set on BOTH the real and duplicate-email paths so the two
// are indistinguishable to the client (enumeration safety) — a duplicate gets a token for a
// non-existent id, so the product step simply no-ops.
async function setContinuation(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(REGISTRATION_COOKIE, signRegistrationToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

// Register a new user. Creates the account as `pending` (no session — autoSignIn is off) and
// sends a verification email; the account then waits for manual admin approval. Extra profile
// fields are written straight after the Better Auth create (which also provisions the wallet).
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  if (!(await isFeatureEnabled("registration"))) {
    return { ok: false, error: "Registration is currently closed." };
  }

  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const data = parsed.data;

  const country = getCountryByCode(data.countryCode);
  if (!country) return { ok: false, error: "Please choose a valid country." };

  const requestHeaders = await headers();
  const now = Date.now();
  prune(now);
  const tooMany =
    hit(`ip:${clientIp(requestHeaders)}`, REGISTER_MAX_PER_IP, now) ||
    hit(`email:${data.email}`, REGISTER_MAX_PER_EMAIL, now);
  if (tooMany) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  // Bot gate. After the rate limiter (in-memory, cheapest) and before argon2 + the email send
  // (the expensive work), so a failed captcha costs nothing. A no-op unless the admin enabled
  // reCAPTCHA in Plugins — see verifyRecaptcha.
  const captcha = await verifyRecaptcha(data.recaptchaToken, "register");
  if (!captcha.ok) return { ok: false, error: captcha.error };

  const name = `${data.firstName} ${data.lastName}`.replace(/\s+/g, " ").trim();

  let userId: string;
  try {
    // autoSignIn is off, so this creates the user + wallet (user.create.after hook) and sends
    // the verification email, but establishes no session. The user.create.before hook stamps
    // status="pending" atomically. callbackURL drives the post-verify landing (see
    // app/verify-email — the ?registered=1 marker shows the pending-approval copy).
    const result = await auth.api.signUpEmail({
      body: {
        name,
        email: data.email,
        password: data.password,
        callbackURL: "/verify-email?registered=1",
      },
      headers: requestHeaders,
    });
    userId = result.user.id;
  } catch (error) {
    // Enumeration-safe: a duplicate email returns the SAME neutral success as a new sign-up,
    // so an unauthenticated caller can't probe which addresses are registered. Only genuinely
    // unexpected failures surface an error.
    const message =
      error && typeof error === "object" && "body" in error
        ? ((error as { body?: { message?: string } }).body?.message ?? "")
        : "";
    if (/exist|already|taken|in use/i.test(message)) {
      await setContinuation(randomUUID()); // identical UX to a fresh signup; no real account
      return { ok: true };
    }
    return { ok: false, error: "Could not create your account. Please try again." };
  }

  // Force the account to "pending" and fill in the profile. The create-time before-hook only
  // fires for the HTTP /sign-up/email path — a server-side auth.api.signUpEmail call has no
  // request context, so the hook can't see the path and the row is created with the default
  // "active". We therefore set the status here explicitly, and fall back to a status-only write
  // if the combined update fails, so a self-registered account is NEVER left active/unapproved.
  // Resolve the referral link's code to a referrer (never self-refer). Recorded on the new user.
  const referrerId = data.ref ? await referrerIdForCode(data.ref) : null;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "pending",
        country: country.name,
        phone: formatPhone(data.dialCode, data.phone),
        gender: data.gender,
        address: data.address,
        ...(data.timezone ? { timezone: data.timezone } : {}),
        ...(referrerId && referrerId !== userId ? { referredById: referrerId } : {}),
      },
    });
  } catch (error) {
    console.error("[register] profile write failed for", userId, error);
    await prisma.user
      .update({
        where: { id: userId },
        data: {
          status: "pending",
          ...(referrerId && referrerId !== userId ? { referredById: referrerId } : {}),
        },
      })
      .catch(() => {});
  }

  // Award on the "signup" trigger (no-op unless referral settings use it + a referrer exists).
  await awardReferral({ referredUserId: userId, trigger: "signup" });

  await setContinuation(userId);
  return { ok: true };
}
