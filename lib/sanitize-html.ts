// Conservative HTML sanitizer for admin-authored rich text (deposit method instructions).
// The value is seeded into a contentEditable via innerHTML AND rendered to users via
// dangerouslySetInnerHTML (both DOM-XSS sinks), so strip the vectors that execute there:
// event-handler attributes, script/embed-style tags, and dangerous URL schemes.
//
// NOTE: this is a denylist, not a real parser. It closes the known auto-exec vectors but a
// determined author can still craft edge cases — for untrusted input, replace this with an
// allowlist parser (DOMPurify / the `sanitize-html` package). It is kept dependency-free and
// client-safe here because a client editor imports it.
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

export function sanitizeHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAGS, "")
    .replace(EVENT_ATTR, "")
    .replace(URL_SCHEME_DQ, "$1#$2")
    .replace(URL_SCHEME_SQ, "$1#$2")
    .replace(URL_SCHEME_BARE, "$1#");
}
