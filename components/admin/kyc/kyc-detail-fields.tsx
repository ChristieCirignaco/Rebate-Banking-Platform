"use client";

import { KycFilePreview } from "./kyc-file-preview";
import type { KycFieldValueView } from "./types";

// The dynamic submitted-information block, shared by the review and view modals. Text and
// number fields show as label + value; File fields defer to KycFilePreview (image inline /
// pdf download). Handles the empty case (e.g. manually-approved records with no submission).
export function KycDetailFields({ fields }: { fields: KycFieldValueView[] }) {
  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
        No information was submitted for this record.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <div key={`${field.label}-${index}`} className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">
            {field.label || "Field"}
          </span>
          {field.type === "file" ? (
            <KycFilePreview field={field} />
          ) : (
            <span className="text-sm break-words">{field.value || "—"}</span>
          )}
        </div>
      ))}
    </div>
  );
}
