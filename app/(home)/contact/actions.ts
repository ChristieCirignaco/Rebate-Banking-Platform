"use server";

import { z } from "zod";

import { sendEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings/store";

export type ContactInput = {
  fullName: string;
  email: string;
  subject: string;
  message: string;
};

export type ContactResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(100, "Name is too long."),
  email: z.string().trim().email("Please enter a valid email address."),
  subject: z
    .string()
    .trim()
    .min(2, "Please enter a subject.")
    .max(150, "Subject is too long."),
  message: z
    .string()
    .trim()
    .min(5, "Your message is too short.")
    .max(3000, "Your message is too long."),
});

export async function submitContactMessage(
  input: ContactInput,
): Promise<ContactResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { fullName, email, subject, message } = parsed.data;

  // Route to the admin-configured support inbox (falls back to From email, then a default).
  const general = await getSettings("general");
  const to = general.supportEmail?.trim() || general.fromEmail?.trim();
  if (!to) {
    return {
      ok: false,
      error: "We couldn't send your message right now. Please try again later.",
    };
  }

  try {
    await sendEmail({
      to,
      subject: `[Contact] ${subject}`,
      text: `From: ${fullName} <${email}>\n\n${message}`,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
