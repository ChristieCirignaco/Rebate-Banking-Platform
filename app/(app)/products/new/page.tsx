import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { ProductSubmitForm } from "@/components/app/product-submit-form";

export const metadata: Metadata = { title: "Submit products" };

// Submit new products for rebate review. Flag-gated: when product submissions are closed, bounce
// to /products (which shows the closed banner). The form itself sits in a focused light card on
// both mobile and desktop.
export default async function NewProductPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await isFeatureEnabled("product_submission"))) redirect("/products");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true },
  });
  const currency = user?.currency ?? "USD";

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 lg:px-0 lg:pb-0">
      <div className="lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-lg lg:dark:bg-slate-900">
        <div className="flex items-center gap-3 py-4 lg:pt-0">
          <Link
            href="/products"
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Submit products</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">List purchases for rebate review.</p>
          </div>
        </div>
        <ProductSubmitForm currency={currency} />
      </div>
    </div>
  );
}
