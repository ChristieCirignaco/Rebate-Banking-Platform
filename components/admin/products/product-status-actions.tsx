"use client";

import type { ComponentType } from "react";
import { CheckCircle2, Undo2, XCircle } from "lucide-react";

import {
  ActionIconButton,
  type ActionTint,
} from "@/components/admin/users/detail/shared";
import { Button } from "@/components/ui/button";
import { StatusChangeDialog } from "./status-change-dialog";
import type { ProductStatus } from "./types";

type StatusAction = {
  to: ProductStatus;
  label: string;
  success: string;
  icon: ComponentType<{ className?: string }>;
  tint: ActionTint;
};

const APPROVE: StatusAction = {
  to: "approved",
  label: "Approve Product",
  success: "Product approved",
  icon: CheckCircle2,
  tint: "emerald",
};
const REJECT: StatusAction = {
  to: "rejected",
  label: "Reject Product",
  success: "Product rejected",
  icon: XCircle,
  tint: "rose",
};
const RESET: StatusAction = {
  to: "pending",
  label: "Reset to Pending",
  success: "Reset to pending",
  icon: Undo2,
  tint: "amber",
};

// The available moves depend on where the submission currently sits.
function actionsFor(status: ProductStatus): StatusAction[] {
  switch (status) {
    case "pending":
      return [APPROVE, REJECT];
    case "approved":
      return [RESET, REJECT];
    case "rejected":
      return [RESET, APPROVE];
  }
}

export function ProductStatusActions({
  productId,
  status,
  variant,
  note,
}: {
  productId: string;
  status: ProductStatus;
  variant: "icon" | "buttons";
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actionsFor(status).map((action) => {
        const Icon = action.icon;
        return (
          <StatusChangeDialog
            key={action.to}
            productId={productId}
            to={action.to}
            title={action.label}
            successMessage={action.success}
            defaultNote={note}
          >
            {variant === "icon" ? (
              <ActionIconButton
                icon={action.icon}
                tint={action.tint}
                label={action.label}
              />
            ) : (
              <Button type="button" variant="outline" size="sm">
                <Icon className="size-4" />
                {action.label}
              </Button>
            )}
          </StatusChangeDialog>
        );
      })}
    </div>
  );
}
