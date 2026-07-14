import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AdminSection } from "@/components/admin/admin-section";
import { KycTemplateDialog } from "@/components/admin/kyc/kyc-template-dialog";
import { KycTemplatesTable } from "@/components/admin/kyc/kyc-templates-table";
import { Button } from "@/components/ui/button";
import { getKycTemplates } from "@/lib/admin/kyc";

export const metadata: Metadata = { title: "KYC Templates" };

export default async function KycTemplatesPage() {
  const templates = await getKycTemplates();

  return (
    <AdminSection
      title="KYC Templates"
      description="Define verification types and the fields users submit for each."
      actions={
        <KycTemplateDialog>
          <Button>
            <Plus className="size-4" />
            Add New
          </Button>
        </KycTemplateDialog>
      }
    >
      <KycTemplatesTable templates={templates} />
    </AdminSection>
  );
}
