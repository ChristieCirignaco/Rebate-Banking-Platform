"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { getSession } from "@/lib/auth-guards";
import { getCountryByCode } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { needsLoginOtpVerification } from "@/lib/login-otp";

export type ProfileResult = { ok: true } | { ok: false; error: string };

// An avatar value we produced: the served URL of an upload from /api/user/avatar. Anything else
// (an external URL, a data: URI) is refused, so the column can only ever point at our own media
// route — a client can't turn it into an arbitrary remote/inline image.
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

// Update the signed-in user's own profile. The target is always the session user's id — a
// userId is never taken from the client, so this can't be used to edit another account.
export async function updateProfile(input: ProfileInput): Promise<ProfileResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Your session expired. Please sign in again." };

  // Apply the SAME full gate the page (requireActiveUser) does — status AND the email-OTP
  // login second factor — so a suspended user or a pre-OTP session can't mutate their profile
  // by replaying the action directly.
  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });
  if (!account || account.status !== "active") {
    return { ok: false, error: "Your account isn't active." };
  }
  if (await needsLoginOtpVerification(session.session.id, session.user.role)) {
    return { ok: false, error: "Please finish the login verification first." };
  }

  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const data = parsed.data;

  const country = getCountryByCode(data.countryCode);
  if (!country) return { ok: false, error: "Please choose a valid country." };

  // Parse as UTC midnight so the stored instant matches the yyyy-mm-dd the user picked
  // regardless of server timezone (the page reads it back with toISOString().slice(0, 10)).
  // The regex only proves the SHAPE — "2002-02-30" still has to be rejected here.
  let birthday: Date | null = null;
  if (data.birthday) {
    const parsed = new Date(`${data.birthday}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "Enter a valid date of birth." };
    }
    if (parsed.getTime() > Date.now()) {
      return { ok: false, error: "Your date of birth can't be in the future." };
    }
    birthday = parsed;
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
    // username is `String? @unique`, and it is the ONLY unique column this update writes — so
    // any P2002 (unique constraint violation) here is a username collision. Checking "is it
    // free?" before the write would still race two concurrent claims, so the unique index is
    // the real arbiter; translate its violation into a friendly message rather than letting a
    // raw P2002 crash the action.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "That username is taken." };
    }
    throw error;
  }

  revalidatePath("/account/profile");
  return { ok: true };
}
