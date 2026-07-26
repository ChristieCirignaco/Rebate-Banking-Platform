"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Eye,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pencil,
  Quote,
} from "lucide-react";

import { markdownToEmailHtml } from "@/lib/email/markdown";
import { cn } from "@/lib/utils";

// The Markdown composer for admin-authored EMAIL bodies (the per-user Notify dialog and the
// broadcast page). Plain Markdown over a WYSIWYG on purpose: what an email client will render is
// a narrow, inline-styled subset, and a rich-text surface invites structure — tables, colours,
// pasted styles — that silently dies in transit. Markdown can only express what the mail
// template can actually deliver.
//
// The Preview tab renders through markdownToEmailHtml, the SAME function the mailer uses, so
// what the admin approves is what is sent — no second renderer to drift out of step.

type Tool = {
  icon: typeof Bold;
  label: string;
  // Wraps the selection, e.g. ("**", "**"). `block` prefixes each selected line instead.
  before: string;
  after?: string;
  block?: boolean;
  placeholder: string;
};

const TOOLS: Tool[] = [
  { icon: Bold, label: "Bold", before: "**", after: "**", placeholder: "bold text" },
  { icon: Italic, label: "Italic", before: "*", after: "*", placeholder: "italic text" },
  { icon: Heading2, label: "Heading", before: "## ", block: true, placeholder: "Heading" },
  { icon: List, label: "Bullet list", before: "- ", block: true, placeholder: "List item" },
  { icon: ListOrdered, label: "Numbered list", before: "1. ", block: true, placeholder: "List item" },
  { icon: Quote, label: "Quote", before: "> ", block: true, placeholder: "Quoted text" },
  { icon: LinkIcon, label: "Link", before: "[", after: "](https://)", placeholder: "link text" },
];

export function MarkdownEditor({
  id,
  value,
  onChange,
  rows = 10,
  placeholder,
  maxLength,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  // Apply a tool at the caret. Reads the live selection from the DOM node rather than tracking
  // it in state — a controlled textarea reports its own selection accurately, and mirroring it
  // into React state would fight the caret on every keystroke.
  function apply(tool: Tool) {
    const el = ref.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    let next: string;
    let caret: number;

    if (tool.block) {
      // Grow the selection to whole lines, so prefixing can't land mid-word.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = end === start ? value.indexOf("\n", start) : end;
      const stop = lineEnd === -1 ? value.length : lineEnd;
      const target = value.slice(lineStart, stop) || tool.placeholder;
      const prefixed = target
        .split("\n")
        // Numbered lists count up; every other block prefix repeats.
        .map((line, i) => (tool.before === "1. " ? `${i + 1}. ${line}` : `${tool.before}${line}`))
        .join("\n");
      next = `${value.slice(0, lineStart)}${prefixed}${value.slice(stop)}`;
      caret = lineStart + prefixed.length;
    } else {
      const body = selected || tool.placeholder;
      const wrapped = `${tool.before}${body}${tool.after ?? ""}`;
      next = `${value.slice(0, start)}${wrapped}${value.slice(end)}`;
      caret = start + wrapped.length;
    }

    onChange(maxLength ? next.slice(0, maxLength) : next);

    // With nothing selected we inserted a placeholder — select it so the admin types straight
    // over it. Otherwise leave the caret after the inserted text. Deferred a frame because the
    // textarea is controlled: React has to commit the new value before a range means anything.
    const bare = !selected && !tool.block;
    const from = bare ? start + tool.before.length : caret;
    const to = bare ? start + tool.before.length + tool.placeholder.length : caret;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from, to);
    });
  }

  const preview = tab === "preview" ? markdownToEmailHtml(value) : "";

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-1 border-b p-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            disabled={tab === "preview"}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply(tool)}
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 rounded p-1.5 outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-40"
          >
            <tool.icon className="size-4" />
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          {(["write", "preview"] as const).map((name) => {
            const Icon = name === "write" ? Pencil : Eye;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                aria-pressed={tab === name}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium capitalize transition-colors",
                  tab === name
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "write" ? (
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="placeholder:text-muted-foreground field-sizing-content w-full resize-none bg-transparent p-3 text-sm outline-none"
        />
      ) : (
        // The rendered email body. Safe by construction: markdownToEmailHtml escapes its source
        // before parsing, and the only raw tags in its output are the ones it writes itself.
        <div
          className="min-h-24 bg-white p-3 text-slate-800"
          style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" }}
          dangerouslySetInnerHTML={{
            __html: preview || '<p style="color:#94a3b8;margin:0">Nothing to preview yet.</p>',
          }}
        />
      )}

      <p className="text-muted-foreground border-t px-3 py-2 text-xs">
        Markdown supported — <strong>**bold**</strong>, <em>*italic*</em>, <code>## heading</code>,{" "}
        <code>- list</code>, <code>&gt; quote</code>, <code>[text](https://link)</code>. Blank lines
        separate paragraphs.
      </p>
    </div>
  );
}
