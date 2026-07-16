"use server";

import { z } from "zod";

import { requireActiveUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyAdmins } from "@/lib/notifications";
import { toMinor } from "@/lib/money/money";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";

// A product image must be one WE stored via /api/user/product-image (a served /api/media/<key>
// path). The payload is client-forgeable, so reject external / protocol-relative / data: URLs
// here — an attacker must not be able to plant a beacon the admin's browser fetches on review.
const OWN_MEDIA_URL = /^\/api\/media\/[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/;

const MAX_PRODUCTS = 50;

export type ProductInput = {
  name: string;
  price: string;
  quantity: string;
  imageUrl?: string;
};
export type SubmitResult = { ok: true; count: number } | { ok: false; error: string };

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
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((v) => !v || OWN_MEDIA_URL.test(v), { message: "Invalid product image." }),
});

// Submit one or more products for rebate review as the signed-in user. Gated on an active
// account (requireActiveUser) AND the product_submission feature flag (fail-closed). Rows are
// created as `pending` in the user's own currency; approval later credits the wallet (admin).
export async function submitProducts(products: ProductInput[]): Promise<SubmitResult> {
  const { session } = await requireActiveUser();

  if (!(await isFeatureEnabled("product_submission"))) {
    return { ok: false, error: "Product submissions are currently closed." };
  }

  if (!Array.isArray(products) || products.length === 0) {
    return { ok: false, error: "Add at least one product." };
  }
  if (products.length > MAX_PRODUCTS) {
    return { ok: false, error: `You can add up to ${MAX_PRODUCTS} products at once.` };
  }

  const rows: { name: string; priceMinor: bigint; quantity: number; imageUrl: string | null }[] =
    [];
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true },
  });
  const currency = user?.currency ?? "USD";

  await prisma.product.createMany({
    data: rows.map((row) => ({
      userId: session.user.id,
      name: row.name,
      priceMinor: row.priceMinor,
      currency,
      quantity: row.quantity,
      imageUrl: row.imageUrl,
    })),
  });

  // Best-effort: the rows are already committed, so a notify failure must never surface as a
  // failed submission.
  try {
    await notifyAdmins({
      type: "products_submitted",
      title: "New product submission",
      message: `${session.user.name} submitted ${rows.length} product${rows.length === 1 ? "" : "s"} for rebate review.`,
    });
  } catch {
    // ignored — the admin queue still shows the products.
  }

  return { ok: true, count: rows.length };
}
