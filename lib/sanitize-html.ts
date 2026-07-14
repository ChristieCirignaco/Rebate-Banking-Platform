// Conservative HTML sanitizer for admin-authored rich text (deposit method instructions).
// The value is later seeded into a contentEditable via innerHTML (a DOM-XSS sink) and may
// one day be shown to users, so strip the vectors that actually execute there: event-handler
// attributes, script/embed-style tags, and javascript: URLs. Not a full allowlist parser —
// it targets the executable surface, not cosmetic tags.
const DANGEROUS_TAGS =
  /<\/?(?:script|style|iframe|object|embed|link|meta|form|base|svg|math)[^>]*>/gi;
const EVENT_ATTR_DQ = /\son\w+\s*=\s*"[^"]*"/gi;
const EVENT_ATTR_SQ = /\son\w+\s*=\s*'[^']*'/gi;
const EVENT_ATTR_BARE = /\son\w+\s*=\s*[^\s>]+/gi;
const JS_URL = /(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi;

export function sanitizeHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAGS, "")
    .replace(EVENT_ATTR_DQ, "")
    .replace(EVENT_ATTR_SQ, "")
    .replace(EVENT_ATTR_BARE, "")
    .replace(JS_URL, "$1=$2#$2");
}
