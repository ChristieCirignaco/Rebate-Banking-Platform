"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyAdmins, notifyUserOf } from "@/lib/notifications";
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
export type ProductMutateResult = { ok: true } | { ok: false; error: string };

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

  // The rebate is only credited on approval, so a submission otherwise sits silent — confirm the
  // count so the user can tell a partial submit from a complete one. Best-effort (notifyUserOf
  // swallows its own errors), so it can never fail the committed rows.
  await notifyUserOf(session.user.id, {
    type: "email",
    title: "Products Submitted",
    message: `We've received ${rows.length} product${rows.length === 1 ? "" : "s"} for rebate review. We'll let you know once they've been reviewed.`,
    greeting: session.user.name ? `Dear ${session.user.name},` : undefined,
    rows: [{ label: "Products submitted", value: String(rows.length) }],
    cta: { label: "View products", url: "/products" },
  });

  return { ok: true, count: rows.length };
}

// Edit one of your own products, while it is still `pending`.
//
// Only pending rows, and that's the whole rule: once an admin has reviewed a product the row is
// the record of that decision. Letting the owner rewrite the name or price afterwards would
// change what was approved — including what an already-credited rebate was paid for — so a
// reviewed row is immutable from this side. Until then a typo'd price was permanent, because
// submitProducts was the only mutation that existed.
export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ProductMutateResult> {
  const { session } = await requireActiveUser();

  if (!(await isFeatureEnabled("product_submission"))) {
    return { ok: false, error: "Product submissions are currently closed." };
  }

  const parsed = ProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check your product details.",
    };
  }

  // Scope the write by owner AND status inside one updateMany rather than read-then-write: a
  // findUnique followed by an update would race an admin approving the row between the two, and
  // silently rewrite a product that had just been approved.
  const claim = await prisma.product.updateMany({
    where: { id, userId: session.user.id, status: "pending" },
    data: {
      name: parsed.data.name,
      priceMinor: toMinor(parsed.data.price),
      quantity: parsed.data.quantity,
      imageUrl: parsed.data.imageUrl ? parsed.data.imageUrl : null,
    },
  });
  if (claim.count === 0) {
    return { ok: false, error: "This product has already been reviewed and can't be edited." };
  }

  revalidatePath("/products");
  return { ok: true };
}

// Withdraw one of your own pending products.
//
// Deliberately NOT gated on the product_submission flag, unlike submit and update: withdrawing
// is a retraction, not a submission. Closing submissions must not strand a user with a pending
// row they can no longer remove. Same owner+status scoping, for the same race.
export async function deleteProduct(id: string): Promise<ProductMutateResult> {
  const { session } = await requireActiveUser();

  // Matches submitProducts and updateProduct: the whole product mutation surface freezes when
  // submissions are off, rather than leaving delete as the one write that still lands. Viewing
  // is unaffected — that's the separate `products` flag.
  if (!(await isFeatureEnabled("product_submission"))) {
    return { ok: false, error: "Product submissions are currently disabled." };
  }

  const claim = await prisma.product.deleteMany({
    where: { id, userId: session.user.id, status: "pending" },
  });
  if (claim.count === 0) {
    return { ok: false, error: "This product has already been reviewed and can't be removed." };
  }

  revalidatePath("/products");
  return { ok: true };
}
