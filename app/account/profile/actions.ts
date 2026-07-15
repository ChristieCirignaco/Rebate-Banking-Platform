"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSession } from "@/lib/auth-guards";
import { getCountryByCode } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { needsLoginOtpVerification } from "@/lib/login-otp";

export type ProfileResult = { ok: true } | { ok: false; error: string };

const ProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(60),
  lastName: z.string().trim().min(1, "Last name is required.").max(60),
  countryCode: z.string().trim().toUpperCase().length(2),
  phone: z.string().trim().max(32),
  gender: z.enum(["male", "female", "other", "unspecified"]),
  address: z.string().trim().max(200),
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

  const name = `${data.firstName} ${data.lastName}`.replace(/\s+/g, " ").trim();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      country: country.name,
      phone: data.phone || null,
      gender: data.gender,
      address: data.address || null,
    },
  });

  revalidatePath("/account/profile");
  return { ok: true };
}
