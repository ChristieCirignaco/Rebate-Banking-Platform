import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-guards";
import { getUserProducts, getUserProductStats } from "@/lib/products";
import { isFeatureEnabled } from "@/lib/settings/feature-flags";
import { ProductsContent } from "@/components/app/products-content";

export const metadata: Metadata = { title: "Products" };

// The user's rebate submissions hub: count-by-status + the paginated list. Mobile renders on
// the light flow; desktop is a dark-scoped view in the dark content panel. Data fetched once.
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // The page itself; submitting is separately gated by product_submission (below + /new).
  if (!(await isFeatureEnabled("products"))) redirect("/dashboard");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [products, stats, canSubmit] = await Promise.all([
    getUserProducts(session.user.id, page),
    getUserProductStats(session.user.id),
    isFeatureEnabled("product_submission"),
  ]);

  return (
    <>
      {/* Mobile */}
      <div className="mx-auto max-w-2xl px-5 pb-24 lg:hidden">
        <ProductsContent stats={stats} page={products} canSubmit={canSubmit} variant="mobile" />
      </div>

      {/* Desktop */}
      <div className="dark hidden lg:block">
        <div className="mx-auto max-w-4xl">
          <ProductsContent stats={stats} page={products} canSubmit={canSubmit} variant="desktop" />
        </div>
      </div>
    </>
  );
}
