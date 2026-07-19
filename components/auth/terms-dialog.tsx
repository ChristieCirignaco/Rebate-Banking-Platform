"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// The Terms & Conditions acceptance control for the register form. Two distinct affordances:
// the "I accept the" label toggles the checkbox directly, while the "Terms and Conditions"
// link OPENS the dialog (it does not toggle). Inside the dialog, "I Agree" checks the box and
// closes; once accepted the button is disabled (there's nothing left to agree to).
export function TermsCheckbox({
  checked,
  onCheckedChange,
  termsContent,
  disabled,
  error,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  termsContent: string;
  disabled?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <Checkbox
          id="terms"
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          disabled={disabled}
          aria-invalid={!!error}
          className="mt-0.5"
        />
        {/* `inline` overrides the shared Label's `flex` — as a block-level flex box it claimed
            the full row, pushing the sibling link onto its own line. Inline keeps the two as
            one continuous sentence that wraps naturally instead of breaking after "the". */}
        <span className="text-sm leading-relaxed">
          <Label htmlFor="terms" className="inline cursor-pointer font-normal">
            I accept the
          </Label>{" "}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Terms and Conditions
          </button>
        </span>
      </div>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
            <DialogDescription>
              Please read these terms. Selecting &ldquo;I Agree&rdquo; accepts them.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {termsContent}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                onCheckedChange(true);
                setOpen(false);
              }}
              disabled={checked}
              className="w-full sm:w-auto"
            >
              {checked ? "Accepted" : "I Agree"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
