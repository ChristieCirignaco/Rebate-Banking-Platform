"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Underline } from "lucide-react";

import { sanitizeHtml } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

const TOOLS = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "insertUnorderedList", icon: List, label: "Bullet list" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
] as const;

// A small contentEditable WYSIWYG (uses document.execCommand — deprecated but universally
// supported, and avoids pulling in a heavy editor dependency). Uncontrolled internally:
// the initial HTML is written once, and edits are reported up via onChange, so the caret
// never jumps. The dialog remounts it on open, which re-seeds defaultValue.
export function RichTextEditor({
  defaultValue,
  onChange,
  ariaLabel,
  ariaLabelledBy,
}: {
  defaultValue: string;
  onChange: (html: string) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (ref.current && !seeded.current) {
      // Sanitize before it hits innerHTML (a DOM-XSS sink); server also sanitizes on write.
      ref.current.innerHTML = sanitizeHtml(defaultValue);
      seeded.current = true;
    }
  }, [defaultValue]);

  function exec(command: string) {
    document.execCommand(command, false);
    ref.current?.focus();
    onChange(ref.current?.innerHTML ?? "");
  }

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap gap-1 border-b p-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.cmd}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => exec(tool.cmd)}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <tool.icon className="size-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? "Rich text editor")}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className={cn(
          "min-h-28 px-3 py-2 text-sm outline-none",
          "[&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
        )}
      />
    </div>
  );
}
