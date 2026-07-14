"use client";

import { FileText, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApplicableToBadge, MethodStatusBadge } from "./kyc-badges";
import { KycDeleteTemplateDialog } from "./kyc-delete-template-dialog";
import { KycTemplateDialog } from "./kyc-template-dialog";
import type { KycTemplateSummary } from "./types";

export function KycTemplatesTable({ templates }: { templates: KycTemplateSummary[] }) {
  if (templates.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <FileText className="text-muted-foreground size-6" />
        </div>
        <div>
          <p className="font-medium">No templates yet</p>
          <p className="text-muted-foreground text-sm">
            Create a verification template to define what users submit for KYC.
          </p>
        </div>
        <KycTemplateDialog>
          <Button>Add New Template</Button>
        </KycTemplateDialog>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title / Description</TableHead>
            <TableHead>Applicable To</TableHead>
            <TableHead>Fields</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{template.title}</span>
                  {template.description ? (
                    <span className="text-muted-foreground line-clamp-1 max-w-md text-xs">
                      {template.description}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <ApplicableToBadge />
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {template.fieldCount}
                </span>
              </TableCell>
              <TableCell>
                <MethodStatusBadge active={template.status === "active"} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <KycTemplateDialog template={template}>
                    <Button size="icon" variant="ghost" className="size-9" aria-label={`Edit ${template.title}`}>
                      <Pencil className="size-4" />
                    </Button>
                  </KycTemplateDialog>
                  <KycDeleteTemplateDialog
                    id={template.id}
                    title={template.title}
                    submissionCount={template.submissionCount}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                      aria-label={`Delete ${template.title}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </KycDeleteTemplateDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
