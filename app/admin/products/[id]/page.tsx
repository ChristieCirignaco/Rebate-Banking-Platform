import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminSection } from "@/components/admin/admin-section";
import { ImageProofCard } from "@/components/admin/products/detail/image-proof-card";
import { ProductInformationCard } from "@/components/admin/products/detail/product-information-card";
import { UserInformationCard } from "@/components/admin/products/detail/user-information-card";
import { UserProductStatsCard } from "@/components/admin/products/detail/user-product-stats-card";
import { Button } from "@/components/ui/button";
import { getProductDetail, getUserProductStats } from "@/lib/admin/products";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getProductDetail(id);
  return { title: detail ? `Submission · ${detail.productName}` : "Submission" };
}

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getProductDetail(id);
  if (!detail) notFound();

  const userStats = await getUserProductStats(detail.user.id);

  return (
    <AdminSection
      title="Product Submission Details"
      actions={
        <Button asChild variant="outline">
          <Link href="/admin/products">
            <ArrowLeft className="size-4" />
            Back to List
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ProductInformationCard product={detail} />
          <ImageProofCard
            imageUrl={detail.imageUrl}
            productName={detail.productName}
          />
        </div>
        <div className="flex flex-col gap-4">
          <UserInformationCard user={detail.user} />
          <UserProductStatsCard stats={userStats} />
        </div>
      </div>
    </AdminSection>
  );
}
