// "Latest Updates" news feed for the marketing home page. Aggregates several free public
// RSS feeds (Trump / markets / investing) server-side, merges + dedupes them, and caches for
// 5 minutes (revalidate: 300) so the section auto-refreshes. Dependency-free XML parsing so
// nothing is added to package.json. All network failures degrade to an empty list, and the
// page falls back to its static cards.

export type NewsItem = {
  title: string;
  url: string;
  source: string;
  excerpt: string;
  category: string;
  publishedAt: number;
  publishedLabel: string;
};

type Feed = { url: string; name: string; category: string };

const FEEDS: Feed[] = [
  {
    url: "https://news.google.com/rss/search?q=Trump%20economy%20OR%20markets%20OR%20investing&hl=en-US&gl=US&ceid=US:en",
    name: "Google News",
    category: "Market Analysis",
  },
  {
    url: "https://news.google.com/rss/search?q=stock%20market%20OR%20inflation%20OR%20wealth&hl=en-US&gl=US&ceid=US:en",
    name: "Google News",
    category: "Wealth Building",
  },
  {
    url: "https://finance.yahoo.com/news/rssindex",
    name: "Yahoo Finance",
    category: "Markets",
  },
  {
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    name: "CNBC",
    category: "Economy",
  },
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const REVALIDATE_SECONDS = 300;
const FETCH_TIMEOUT_MS = 8000;

const NAMED_ENTITIES: Record<string, string> = {
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
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => codePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => codePoint(parseInt(dec, 10)))
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => NAMED_ENTITIES[m] ?? m);
}

function codePoint(n: number): string {
  return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : "";
}

function stripCdata(input: string): string {
  const m = input.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : input;
}

function stripHtml(input: string): string {
  return decodeEntities(stripCdata(input).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function tagText(item: string, name: string): string {
  const m = item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(stripCdata(m[1])).replace(/\s+/g, " ").trim() : "";
}

function parseFeed(xml: string, feed: Feed): NewsItem[] {
  const blocks = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  const items: NewsItem[] = [];
  for (const block of blocks) {
    let title = tagText(block, "title");
    const url = tagText(block, "link");
    if (!title || !url) continue;

    const source = tagText(block, "source") || feed.name;
    // Google News titles are "Headline - Publisher"; drop the trailing publisher.
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(source.length + 3)).trim();
    }

    const rawDesc = block.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? "";
    let excerpt = stripHtml(rawDesc);
    // Some feeds (Google News) just repeat the headline in the description — drop those.
    if (excerpt && title && excerpt.toLowerCase().includes(title.toLowerCase().slice(0, 30))) {
      excerpt = "";
    }
    excerpt = excerpt.slice(0, 180);

    const pub =
      tagText(block, "pubDate") || tagText(block, "published") || tagText(block, "updated");
    const parsed = pub ? Date.parse(pub) : NaN;

    items.push({
      title,
      url,
      source,
      excerpt,
      category: feed.category,
      publishedAt: Number.isNaN(parsed) ? 0 : parsed,
      publishedLabel: "",
    });
  }
  return items;
}

async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
      signal: controller.signal,
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    return parseFeed(await res.text(), feed);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
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
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Merge all feeds, dedupe by normalized headline, sort newest-first, take `limit`.
export async function getLatestNews(limit = 6): Promise<NewsItem[]> {
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
  return deduped
    .slice(0, limit)
    .map((item) => ({ ...item, publishedLabel: relativeLabel(item.publishedAt) }));
}
