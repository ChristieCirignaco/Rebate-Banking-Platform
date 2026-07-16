// "Latest Updates" news for the home page. Aggregates free public RSS feeds (real article
// URLs so we can show thumbnails and render an internal preview page), merges + dedupes them,
// and caches for 5 minutes so the section auto-refreshes. Dependency-free XML parsing.
//
// Copyright note: we only ever show a headline, the publisher's share image (og:image), a
// short publisher-provided summary (og:description), source attribution, and a link to read
// the full article at the source — never the full article body.

export type NewsItem = {
  id: string; // base64url of the article URL — used for the internal /news/[id] route
  title: string;
  url: string;
  source: string;
  excerpt: string;
  category: string;
  image: string;
  publishedAt: number;
  publishedLabel: string;
};

export type ArticleMeta = {
  url: string;
  title: string;
  image: string;
  description: string;
  siteName: string;
  publishedAt: number;
};

type Feed = { url: string; name: string; category: string };

// Real-URL feeds (Google News RSS uses redirect links that can't be scraped server-side).
const FEEDS: Feed[] = [
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", name: "CNBC", category: "Market Analysis" },
  { url: "https://www.cnbc.com/id/20910258/device/rss/rss.html", name: "CNBC", category: "Economy" },
  { url: "https://finance.yahoo.com/news/rssindex", name: "Yahoo Finance", category: "Wealth Building" },
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const FEED_REVALIDATE = 300; // 5 min
const ARTICLE_REVALIDATE = 1800; // 30 min (article metadata changes rarely)
const TIMEOUT_MS = 8000;

const NAMED: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => cp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => cp(parseInt(d, 10)))
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => NAMED[m] ?? m);
}
function cp(n: number): string {
  return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : "";
}
function stripCdata(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : s;
}
function stripHtml(s: string): string {
  return decodeEntities(stripCdata(s).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
function tagText(item: string, name: string): string {
  const m = item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(stripCdata(m[1])).replace(/\s+/g, " ").trim() : "";
}
function feedImage(block: string): string {
  return (
    block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1] ??
    block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1] ??
    block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\//i)?.[1] ??
    ""
  );
}

export function encodeNewsId(url: string): string {
  return Buffer.from(url, "utf8").toString("base64url");
}

// Only allow fetching public http(s) hosts — blocks SSRF via a crafted id (localhost, private
// IPs, IP literals, *.local, single-label hosts).
function isSafePublicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.includes(":")) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false; // IPv4 literal
    return host.includes(".");
  } catch {
    return false;
  }
}

export function decodeNewsId(id: string): string | null {
  try {
    const url = Buffer.from(id, "base64url").toString("utf8");
    return isSafePublicUrl(url) ? url : null;
  } catch {
    return null;
  }
}

function parseFeed(xml: string, feed: Feed): NewsItem[] {
  const blocks = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  const items: NewsItem[] = [];
  for (const block of blocks) {
    const title = tagText(block, "title");
    const url = tagText(block, "link");
    if (!title || !url || !/^https?:\/\//i.test(url)) continue;

    const rawDesc = block.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? "";
    const pub =
      tagText(block, "pubDate") || tagText(block, "published") || tagText(block, "updated");
    const parsed = pub ? Date.parse(pub) : NaN;

    items.push({
      id: encodeNewsId(url),
      title,
      url,
      source: tagText(block, "source") || feed.name,
      excerpt: stripHtml(rawDesc).slice(0, 180),
      category: feed.category,
      image: feedImage(block),
      publishedAt: Number.isNaN(parsed) ? 0 : parsed,
      publishedLabel: "",
    });
  }
  return items;
}

async function timedFetch(url: string, revalidate: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml" },
      signal: controller.signal,
      next: { revalidate },
    });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  const res = await timedFetch(feed.url, FEED_REVALIDATE);
  if (!res) return [];
  try {
    return parseFeed(await res.text(), feed);
  } catch {
    return [];
  }
}

function metaTag(html: string, prop: string): string {
  const a = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*\\scontent=["']([^"']*)["']`,
    "i",
  );
  const b = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
    "i",
  );
  const m = html.match(a) ?? html.match(b);
  return m ? decodeEntities(m[1]).trim() : "";
}

// Fetch an article's Open Graph metadata (share image + summary) — the standard link-preview
// mechanism. Cached; used for card thumbnails and the internal detail page. Never the body.
export async function fetchArticleMeta(url: string): Promise<ArticleMeta | null> {
  const res = await timedFetch(url, ARTICLE_REVALIDATE);
  if (!res) return null;
  try {
    const html = (await res.text()).slice(0, 200_000);
    const title =
      metaTag(html, "og:title") || stripHtml(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "");
    const pub = metaTag(html, "article:published_time");
    const parsed = pub ? Date.parse(pub) : NaN;
    return {
      url,
      title: decodeEntities(title).trim(),
      image: metaTag(html, "og:image"),
      description: metaTag(html, "og:description") || metaTag(html, "description"),
      siteName: metaTag(html, "og:site_name"),
      publishedAt: Number.isNaN(parsed) ? 0 : parsed,
    };
  } catch {
    return null;
  }
}

function relativeLabel(ms: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 0) return "Just now";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function getLatestNews(limit = 3): Promise<NewsItem[]> {
  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of all) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 60);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  deduped.sort((a, b) => b.publishedAt - a.publishedAt);
  const top = deduped.slice(0, limit);

  // Enrich the shortlist with the article's og:image (higher quality than feed thumbnails)
  // and a summary where the feed lacked one. Warms the cache for the detail page too.
  return Promise.all(
    top.map(async (item) => {
      const meta = await fetchArticleMeta(item.url);
      return {
        ...item,
        image: meta?.image || item.image || "",
        excerpt: item.excerpt || meta?.description?.slice(0, 180) || "",
        source: item.source || meta?.siteName || "",
        publishedLabel: relativeLabel(item.publishedAt),
      };
    }),
  );
}
