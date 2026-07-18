"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { getAdminSession } from "@/lib/auth-guards";
import { getCountryByCode } from "@/lib/countries";
import { prisma } from "@/lib/db";

export type ProfileResult = { ok: true } | { ok: false; error: string };

// An avatar value we produced: the served URL of an upload from /api/user/avatar (shared media
// route). Anything else is refused, so the column can only ever point at our own media route.
const AVATAR_URL = /^\/api\/media\/[A-Za-z0-9._-]+$/;
const USERNAME = /^[a-z0-9_]{3,20}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const ProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(60),
  lastName: z.string().trim().min(1, "Last name is required.").max(60),
  countryCode: z.string().trim().toUpperCase().length(2),
  phone: z.string().trim().max(32),
  gender: z.enum(["male", "female", "other", "unspecified"]),
  address: z.string().trim().max(200),
  // Empty string clears the field — stored as NULL, never "" (a "" username would collide on
  // the unique index with every other cleared username).
  username: z
    .string()
    .trim()
    .toLowerCase()
    .max(20)
    .refine(
      (value) => value === "" || USERNAME.test(value),
      "Username must be 3–20 characters, using only lowercase letters, numbers or underscores.",
    ),
  birthday: z
    .string()
    .trim()
    .refine((value) => value === "" || DATE_ONLY.test(value), "Enter a valid date of birth."),
  image: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || AVATAR_URL.test(value), "That profile photo isn't valid."),
});

export type ProfileInput = z.input<typeof ProfileSchema>;

// Update the signed-in admin's OWN profile. The target is always the admin session user's id —
// a userId is never taken from the client — and getAdminSession() re-checks admin-tier + active
// status so a demoted/suspended session can't mutate a profile by replaying the action.
export async function updateAdminProfile(input: ProfileInput): Promise<ProfileResult> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Your admin session expired. Please sign in again." };

  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const data = parsed.data;

  const country = getCountryByCode(data.countryCode);
  if (!country) return { ok: false, error: "Please choose a valid country." };

  // Parse as UTC midnight so the stored instant matches the yyyy-mm-dd picked regardless of
  // server timezone. The regex only proves SHAPE — "2002-02-30" still has to be rejected here.
  let birthday: Date | null = null;
  if (data.birthday) {
    const d = new Date(`${data.birthday}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Enter a valid date of birth." };
    if (d.getTime() > Date.now()) {
      return { ok: false, error: "Your date of birth can't be in the future." };
    }
    birthday = d;
  }

  const name = `${data.firstName} ${data.lastName}`.replace(/\s+/g, " ").trim();

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        country: country.name,
        phone: data.phone || null,
        gender: data.gender,
        address: data.address || null,
        username: data.username || null,
        birthday,
        image: data.image || null,
      },
    });
  } catch (error) {
    // username is the only unique column written here, so any P2002 is a username collision.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "That username is taken." };
    }
    throw error;
  }

  revalidatePath("/admin/profile");
  return { ok: true };
}

const PreferencesSchema = z.object({
  timezone: z.string().trim().min(1).max(64),
  locale: z.string().trim().max(20),
  currency: z.string().trim().toUpperCase().min(3).max(8),
});

export type PreferencesInput = z.input<typeof PreferencesSchema>;

// Update the admin's own locale/timezone/currency. Timezone is validated against the IANA list
// and currency against the active currencies, so neither can be set to an unusable value.
export async function updateAdminPreferences(input: PreferencesInput): Promise<ProfileResult> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Your admin session expired. Please sign in again." };

  const parsed = PreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your preferences." };
  }
  const data = parsed.data;

  if (!Intl.supportedValuesOf("timeZone").includes(data.timezone)) {
    return { ok: false, error: "Please choose a valid timezone." };
  }

  const currency = await prisma.currency.findFirst({
    where: { code: data.currency, isActive: true },
    select: { code: true },
  });
  if (!currency) return { ok: false, error: "Please choose an active currency." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      timezone: data.timezone,
      locale: data.locale || null,
      currency: currency.code,
    },
  });

  revalidatePath("/admin/profile/preferences");
  return { ok: true };
}
