// Conservative HTML sanitizer for admin-authored rich text (deposit method
// instructions, CMS rich-text components). The value is seeded into a
// contentEditable via innerHTML AND rendered to users via dangerouslySetInnerHTML
// (both DOM-XSS sinks), so strip the vectors that execute there: event-handler
// attributes, script/embed-style tags, and dangerous URL schemes.
//
// NOTE: this is a denylist, not a real parser. It closes the known auto-exec
// vectors but a determined author can still craft edge cases — for untrusted
// input, replace this with an allowlist parser (DOMPurify / the `sanitize-html`
// package). It is kept dependency-free and client-safe here because a client
// editor imports it.
const DANGEROUS_TAGS =
  /<\/?(?:script|style|iframe|object|embed|link|meta|form|base|svg|math|template|noscript)[^>]*>/gi;

// Event-handler attributes (onclick, onerror, …). The HTML tokenizer separates attributes with
// ASCII whitespace OR "/", so the name may be preceded by either — matching only whitespace was
// bypassable via `<img src=x /onerror=…>`. Handles double-, single-, and unquoted values.
const EVENT_ATTR = /[\s/]on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

// Dangerous URL schemes in ANY attribute value — quoted or unquoted (the old regex only caught
// quoted javascript: on href/src). Neutralize the scheme so the attribute becomes inert.
const URL_SCHEME_DQ = /(=\s*")\s*(?:javascript|vbscript|data)\s*:[^"]*(")/gi;
const URL_SCHEME_SQ = /(=\s*')\s*(?:javascript|vbscript|data)\s*:[^']*(')/gi;
const URL_SCHEME_BARE = /(=\s*)(?:javascript|vbscript|data)\s*:[^\s>]*/gi;

// Any attribute="value" pair — used to catch entity-obfuscated schemes
// (href="&#106;avascript:…") that the literal regexes above can't see.
const ATTR_PAIR = /([a-zA-Z_:][-\w:.]*)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/g;

function decodeEntities(value: string): string {
  return value
    .replace(/&#x0*([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#0*(\d+);?/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;/gi, "\t")
    .replace(/&newline;/gi, "\n");
}

function neutralizeObfuscatedSchemes(html: string): string {
  return html.replace(ATTR_PAIR, (match, name: string, eq: string, rawValue: string) => {
    const inner = rawValue.replace(/^["']|["']$/g, "");
    // Decode entities and drop whitespace/control chars, the tricks used to
    // smuggle a scheme past a literal match (j\navascript:, &#106;avascript:).
    const decoded = decodeEntities(inner)
      .replace(/[\s\u0000-\u0020]+/g, "")
      .toLowerCase();
    if (/^(?:javascript|vbscript|data):/.test(decoded)) return `${name}${eq}"#"`;
    return match;
  });
}

function sanitizePass(html: string): string {
  return neutralizeObfuscatedSchemes(
    html
      .replace(DANGEROUS_TAGS, "")
      .replace(EVENT_ATTR, "")
      .replace(URL_SCHEME_DQ, "$1#$2")
      .replace(URL_SCHEME_SQ, "$1#$2")
      .replace(URL_SCHEME_BARE, "$1#"),
  );
}

// Run to a fixpoint: a single pass is spliceable — removing an inner match can
// join its surroundings into a brand-new dangerous token (`<ifra<iframe>me …>`
// → `<iframe …>`), so keep sanitizing until the output stops changing. Content
// that never stabilizes is hostile by construction; refuse it outright.
export function sanitizeHtml(html: string): string {
  let out = html;
  for (let i = 0; i < 10; i++) {
    const next = sanitizePass(out);
    if (next === out) return out;
    out = next;
  }
  return "";
}
