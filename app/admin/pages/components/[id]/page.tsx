import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminSection } from "@/components/admin/admin-section";
import { ComponentEditor } from "@/components/admin/pages/component-editor";
import { getCmsComponentDetail } from "@/lib/admin/cms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const component = await getCmsComponentDetail(id);
  return { title: component ? `Edit Component · ${component.name}` : "Edit Component" };
}

export default async function AdminComponentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const component = await getCmsComponentDetail(id);
  if (!component) notFound();
  return (
    <AdminSection
      title={`Edit Page Component — ${component.name}`}
      description="Changes apply everywhere this component is used."
    >
      <ComponentEditor component={component} />
    </AdminSection>
  );
}
