// Markdown → email HTML, and Markdown → plain text.
//
// Why this exists: an admin-composed notice used to be dropped into the template as ONE
// paragraph, escaped and wrapped in a single <p>. HTML collapses newlines, so every blank line,
// list and heading the admin typed arrived as one run-on block — the formatting wasn't lost in
// transit, it was never converted in the first place.
//
// Hand-rolled, like lib/email/template.ts, and for the same reason: email HTML is its own
// dialect. A general-purpose markdown library emits <p>, <ul>, <blockquote> with no attributes
// and expects a stylesheet to finish the job — but many clients strip <style> entirely (Gmail
// drops it in the web app), so every rule here has to be an inline style attribute. That's a
// property of the OUTPUT, not of the parsing, which is why no dependency would save the work.
//
// Client-safe: no server imports, no dependencies. The admin editor renders its live preview
// with the very same function that builds the mail, so the preview cannot drift from delivery.
//
// SECURITY: the source is escaped ONCE, up front, before any parsing. Everything after that
// operates on text where < > & " ' are already entities, so an admin who types raw HTML gets
// visible, inert text — never markup in someone's inbox. The only unescaped strings emitted are
// this module's own literal tags, and URLs that passed the http/https/mailto allowlist.

export type MarkdownOptions = {
  // Link/heading accent. renderEmail passes the audience colour so mail matches its shell.
  accent?: string;
};

const DEFAULT_ACCENT = "#2563eb";

const TEXT = "font-size:15px;line-height:23px;color:#334155";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// http(s) and mailto only. A markdown link whose target is anything else (javascript:, data:)
// is left as the literal text the admin typed rather than rendered as a live link.
function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  return /^(?:https?:\/\/|mailto:)/i.test(trimmed) ? trimmed : null;
}

// Strip the placeholder sentinel and CRLF so parsing sees one canonical shape. NUL is removed
// rather than escaped because it is the marker the inline pass uses to park finished HTML.
function normalize(src: string): string {
  return src.replace(/\r\n?/g, "\n").replace(/\u0000/g, "");
}

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

// Finished HTML fragments are parked in `slots` and replaced by a sentinel, so later rules
// (emphasis, autolinking) can never reach inside an already-built tag — the classic failure
// where autolink rewrites the href of a link it just created.
function inline(escaped: string, accent: string): string {
  const slots: string[] = [];
  const park = (html: string): string => {
    slots.push(html);
    return `\u0000${slots.length - 1}\u0000`;
  };

  // Code spans first: their contents are literal and must survive every rule below.
  let out = escaped.replace(/`([^`\n]+)`/g, (_, code: string) =>
    park(
      `<code style="font-family:${MONO};font-size:13px;background:#f1f5f9;border-radius:4px;padding:2px 5px;color:#0f172a">${code}</code>`,
    ),
  );

  // Images before links — ![alt](src) also matches the link pattern.
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt: string, url: string) => {
    const src = safeUrl(url);
    if (!src) return match;
    return park(
      `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;display:block;border:0;border-radius:8px;margin:0 0 14px" />`,
    );
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
    const href = safeUrl(url);
    if (!href) return match;
    return park(
      `<a href="${href}" style="color:${accent};text-decoration:underline">${label}</a>`,
    );
  });

  // Bold before italic, so ** isn't eaten one asterisk at a time.
  out = out.replace(/\*\*(?!\s)([^\n]+?)(?<!\s)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__(?!\s)([^\n]+?)(?<!\s)__/g, "<strong>$1</strong>");
  out = out.replace(/\*(?!\s)([^*\n]+?)(?<!\s)\*/g, "<em>$1</em>");
  // Underscore emphasis only at word boundaries: an identifier like TRX_123_ABC in a system
  // notice must not turn into italics. This is CommonMark's rule, and the reason every notice
  // — not only admin-composed ones — can safely be rendered through here.
  out = out.replace(/(^|[^\w\u0000])_(?!\s)([^_\n]+?)(?<!\s)_(?![\w])/g, "$1<em>$2</em>");
  out = out.replace(
    /~~(?!\s)([^\n]+?)(?<!\s)~~/g,
    '<span style="text-decoration:line-through">$1</span>',
  );

  // Bare URLs. Safe to run last because every real link is parked behind a sentinel by now.
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, lead: string, url: string) =>
    `${lead}${park(`<a href="${url}" style="color:${accent};text-decoration:underline">${url}</a>`)}`,
  );

  return out.replace(/\u0000(\d+)\u0000/g, (_, index: string) => slots[Number(index)] ?? "");
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "code"; lines: string[] }
  | { kind: "rule" };

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
// Accepts both forms deliberately: the HTML path parses blocks AFTER escaping, where "> " has
// already become "&gt; ", while markdownToPlainText parses the raw source. One regex, both.
const QUOTE = /^\s*(?:&gt;|>)\s?(.*)$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const FENCE = /^\s*```/;

function parseBlocks(escaped: string): Block[] {
  const lines = escaped.split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", lines: paragraph });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!line.trim()) {
      flush();
      continue;
    }

    if (FENCE.test(line)) {
      flush();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      blocks.push({ kind: "code", lines: body });
      continue;
    }

    // Before BULLET: "---" is a rule, but also matches nothing else here, and "***" would
    // otherwise be read as a bullet whose content is "*".
    if (RULE.test(line)) {
      flush();
      blocks.push({ kind: "rule" });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      flush();
      const body = [quote[1]];
      while (i + 1 < lines.length) {
        const next = QUOTE.exec(lines[i + 1]);
        if (!next) break;
        body.push(next[1]);
        i += 1;
      }
      blocks.push({ kind: "quote", lines: body });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet || numbered) {
      flush();
      const ordered = !bullet;
      const items = [(bullet ?? numbered)![1]];
      while (i + 1 < lines.length) {
        const next = ordered ? NUMBERED.exec(lines[i + 1]) : BULLET.exec(lines[i + 1]);
        if (!next) break;
        items.push(next[1]);
        i += 1;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    paragraph.push(line.trim());
  }

  flush();
  return blocks;
}

const HEADING_STYLE: Record<1 | 2 | 3, string> = {
  1: "margin:0 0 12px;font-size:20px;line-height:27px;font-weight:700;letter-spacing:-0.3px",
  2: "margin:18px 0 10px;font-size:17px;line-height:24px;font-weight:700;letter-spacing:-0.2px",
  3: "margin:16px 0 8px;font-size:15px;line-height:22px;font-weight:700",
};

function renderBlock(block: Block, accent: string): string {
  switch (block.kind) {
    case "p":
      // A single newline inside a paragraph is a visible line break — what someone typing an
      // address block or a sign-off means by pressing Enter once.
      return `<p style="margin:0 0 14px;${TEXT}">${inline(block.lines.join("\n"), accent).replace(/\n/g, "<br />")}</p>`;

    case "heading":
      return `<h${block.level} style="${HEADING_STYLE[block.level]};color:#0f172a">${inline(block.text, accent)}</h${block.level}>`;

    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      const items = block.items
        .map((item) => `<li style="margin:0 0 6px">${inline(item, accent)}</li>`)
        .join("");
      return `<${tag} style="margin:0 0 14px;padding-left:22px;${TEXT}">${items}</${tag}>`;
    }

    case "quote":
      // TEXT first, then the quote's own colour — TEXT ends in a color declaration, so putting
      // it last would silently override the muted quote grey with body colour.
      return `<blockquote style="margin:0 0 14px;padding:8px 0 8px 14px;border-left:3px solid #e2e8f0;${TEXT};color:#475569">${inline(
        block.lines.join("\n"),
        accent,
      ).replace(/\n/g, "<br />")}</blockquote>`;

    case "code":
      // Not run through inline(): a code block is literal by definition.
      return `<pre style="margin:0 0 14px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-family:${MONO};font-size:13px;line-height:20px;color:#0f172a;white-space:pre-wrap;word-break:break-word">${block.lines.join("\n")}</pre>`;

    case "rule":
      return `<hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0" />`;
  }
}

// Markdown → inline-styled HTML for the body of an email (or the admin's preview of one).
export function markdownToEmailHtml(source: string, options: MarkdownOptions = {}): string {
  const accent = options.accent ?? DEFAULT_ACCENT;
  const escaped = esc(normalize(source));
  return parseBlocks(escaped)
    .map((block) => renderBlock(block, accent))
    .join("");
}

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

// Markdown → readable plain text, for the mail's text/plain twin and for UI previews (the bell
// row, the notifications list) where raw ** and ## would be noise. Operates on the RAW source,
// not the escaped copy, so entities never leak into a plain-text part.
export function markdownToPlainText(source: string): string {
  const lines = normalize(source).split("\n");
  const out: string[] = [];

  for (const line of lines) {
    if (FENCE.test(line) || RULE.test(line)) continue;

    let text = line;
    const heading = HEADING.exec(text);
    if (heading) text = heading[2];

    const quote = QUOTE.exec(text);
    if (quote) text = quote[1];

    const bullet = BULLET.exec(text);
    if (bullet) text = `• ${bullet[1]}`;

    text = text
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, "$1")
      // "label (url)" — an inbox reading the text part still needs the destination.
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)")
      .replace(/`([^`\n]+)`/g, "$1")
      .replace(/\*\*(?!\s)([^\n]+?)(?<!\s)\*\*/g, "$1")
      .replace(/__(?!\s)([^\n]+?)(?<!\s)__/g, "$1")
      .replace(/\*(?!\s)([^*\n]+?)(?<!\s)\*/g, "$1")
      .replace(/(^|[^\w])_(?!\s)([^_\n]+?)(?<!\s)_(?![\w])/g, "$1$2")
      .replace(/~~(?!\s)([^\n]+?)(?<!\s)~~/g, "$1");

    out.push(text);
  }

  // Collapse the runs of blank lines that stripped fences and rules leave behind.
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
