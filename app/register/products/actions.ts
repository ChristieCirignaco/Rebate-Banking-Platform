"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { notifyAdmins } from "@/lib/notifications";
import { toMinor } from "@/lib/money/money";
import { REGISTRATION_COOKIE, verifyRegistrationToken } from "@/lib/registration-token";

// A product image must be one WE stored via /api/register/product-image (a served
// /api/media/<key>.<ext> path). The `products` payload is client-forgeable, so we can't trust
// it to have gone through the upload endpoint — reject external, protocol-relative ("//…"),
// and data: URLs here so an attacker can't plant a tracking beacon / phishing link that the
// admin's browser fetches during review.
const OWN_MEDIA_URL = /^\/api\/media\/[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/;

export type ProductInput = {
  name: string;
  price: string;
  quantity: string;
  imageUrl?: string;
};
export type ProductResult = { ok: true } | { ok: false; error: string };

const MAX_PRODUCTS = 50;

const ProductSchema = z.object({
  name: z.string().trim().min(2, "Product name is too short.").max(100),
  price: z.coerce
    .number({ message: "Enter a valid price." })
    .positive("Price must be greater than 0.")
    .max(1_000_000_000, "Price is too large."),
  quantity: z.coerce
    .number({ message: "Enter a valid quantity." })
    .int("Quantity must be a whole number.")
    .positive("Quantity must be at least 1.")
    .max(1_000_000, "Quantity is too large."),
  // Only a URL our own upload endpoint produced — never an arbitrary/external one.
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((v) => !v || OWN_MEDIA_URL.test(v), { message: "Invalid product image." }),
});

async function readContinuationUserId(): Promise<string | null> {
  const store = await cookies();
  return verifyRegistrationToken(store.get(REGISTRATION_COOKIE)?.value);
}

async function clearContinuation(): Promise<void> {
  const store = await cookies();
  store.delete(REGISTRATION_COOKIE);
}

// Attach the optional product submissions from the registration product step to the pending
// user, then finish registration. Bound to the signed continuation cookie, so products can
// only ever be written for the account that just registered — never an arbitrary userId.
export async function submitRegistrationProducts(
  products: ProductInput[],
): Promise<ProductResult> {
  const userId = await readContinuationUserId();
  if (!userId) {
    return {
      ok: false,
      error: "Your registration session expired. Please register again.",
    };
  }

  if (!Array.isArray(products) || products.length === 0) {
    await clearContinuation();
    return { ok: true }; // nothing to add — same as skipping
  }
  if (products.length > MAX_PRODUCTS) {
    return { ok: false, error: `You can add up to ${MAX_PRODUCTS} products.` };
  }

  const rows: {
    name: string;
    priceMinor: bigint;
    quantity: number;
    imageUrl: string | null;
  }[] = [];
  for (const product of products) {
    const parsed = ProductSchema.safeParse(product);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please check your product details.",
      };
    }
    rows.push({
      name: parsed.data.name,
      priceMinor: toMinor(parsed.data.price),
      quantity: parsed.data.quantity,
      imageUrl: parsed.data.imageUrl ? parsed.data.imageUrl : null,
    });
  }

  // Only ever write products for a real, still-pending regular user. A duplicate-email
  // registrant's token points at no user, so this silently no-ops (enumeration safety).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, role: true, currency: true },
  });
  if (user && user.status === "pending" && (user.role === "user" || user.role === null)) {
    await prisma.product.createMany({
      data: rows.map((row) => ({
        userId,
        name: row.name,
        priceMinor: row.priceMinor,
        currency: user.currency,
        quantity: row.quantity,
        imageUrl: row.imageUrl,
      })),
    });

    // The in-app submitProducts raises this and this path didn't, so products uploaded during
    // signup landed in the review queue with nothing announcing them. No user-side notice here:
    // the account is still `pending`, so the approval mail is the next thing they should get.
    // Best-effort — the rows are committed and registration must not fail on a notify error.
    try {
      await notifyAdmins({
        type: "products_submitted",
        title: "New product submission",
        message: `A pending registrant submitted ${rows.length} product${rows.length === 1 ? "" : "s"} during sign-up.`,
      });
    } catch {
      // ignored — the admin queue still shows the products.
    }
  }

  await clearContinuation();
  return { ok: true };
}

// Finish registration without adding any products.
export async function skipRegistrationProducts(): Promise<ProductResult> {
  const userId = await readContinuationUserId();
  if (!userId) {
    return {
      ok: false,
      error: "Your registration session expired. Please register again.",
    };
  }
  await clearContinuation();
  return { ok: true };
}
