import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminSection } from "@/components/admin/admin-section";
import { PageEditor } from "@/components/admin/pages/page-editor";
import { getCmsPageDetail } from "@/lib/admin/cms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const page = await getCmsPageDetail(id);
  return { title: page ? `Edit Page · ${page.title}` : "Edit Page" };
}

export default async function AdminPageEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getCmsPageDetail(id);
  if (!page) notFound();
  return (
    <AdminSection
      title={`Edit Page — ${page.title}`}
      description={`Manage the sections and settings for ${page.path}.`}
    >
      <PageEditor page={page} />
    </AdminSection>
  );
}
