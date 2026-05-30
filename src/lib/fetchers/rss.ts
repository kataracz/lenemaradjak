import type { FeedItem } from "@/types/dashboard";

const RSS_CACHE_TTL_MS = 15 * 60 * 1000;
const rssMemoryCache = new Map<
  string,
  { expires: number; items: FeedItem[] }
>();

const getCacheKey = (url: string) => `lenemaradjak:rss:${url}`;

const loadCachedFeed = (url: string): FeedItem[] | undefined => {
  const now = Date.now();
  const memoryEntry = rssMemoryCache.get(url);
  if (memoryEntry && memoryEntry.expires > now) {
    return memoryEntry.items;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const stored = window.localStorage.getItem(getCacheKey(url));
    if (!stored) {
      return undefined;
    }

    const parsed = JSON.parse(stored) as { expires: number; items: FeedItem[] };
    if (parsed.expires > now && Array.isArray(parsed.items)) {
      rssMemoryCache.set(url, parsed);
      return parsed.items;
    }
  } catch {
    // Ignore cache errors.
  }

  return undefined;
};

const storeCachedFeed = (url: string, items: FeedItem[]) => {
  const entry = { expires: Date.now() + RSS_CACHE_TTL_MS, items };
  rssMemoryCache.set(url, entry);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getCacheKey(url), JSON.stringify(entry));
  } catch {
    // Ignore cache errors.
  }
};

const parseText = (parent: Element | null, selectors: string[]) => {
  if (!parent) {
    return undefined;
  }

  for (const selector of selectors) {
    const node = parent.querySelector(selector);
    if (node?.textContent) {
      return node.textContent.trim();
    }
  }

  return undefined;
};

const parseDate = (dateValue: string | null | undefined) => {
  if (!dateValue) {
    return new Date().toISOString();
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
};

export async function fetchRSSFeed(url: string): Promise<FeedItem[]> {
  const cached = loadCachedFeed(url);
  if (cached) {
    return cached;
  }

  let fetchUrl = url;
  try {
    if (typeof window !== "undefined") {
      const u = new URL(url);
      const PROXY_HOSTS = new Set([
        "telex.hu",
        "www.telex.hu",
        "direkt36.hu",
        "www.direkt36.hu",
        "valaszonline.hu",
        "www.valaszonline.hu",
        "magyarhang.org",
        "www.magyarhang.org",
        "444.hu",
        "www.444.hu",
        "media.rss.com",
        "anchor.fm",
        "www.anchor.fm",
        "omnycontent.com",
        "www.omnycontent.com",
      ]);

      if (PROXY_HOSTS.has(u.hostname)) {
        fetchUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      }
    }
  } catch {
    fetchUrl = url;
  }

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.status}`);
  }

  const text = await response.text();
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "application/xml");
  const items = Array.from(document.querySelectorAll("item, entry"));

  const parsedItems = items.slice(0, 15).map((item) => {
    const title = parseText(item, ["title"]);
    const link =
      parseText(item, ["link", "link[rel='alternate']"]) ||
      item.querySelector("link")?.getAttribute("href") ||
      undefined;
    const description = parseText(item, ["description", "summary", "content"]);
    const publishedAt = parseDate(
      parseText(item, ["pubDate", "published", "updated"]),
    );
    const thumbnailUrl =
      item
        .querySelector("media\\:thumbnail, thumbnail, image")
        ?.getAttribute("url") ?? undefined;

    return {
      id: link || `${title}-${publishedAt}`,
      title: title ?? "Untitled",
      description: description ?? undefined,
      url: link ?? "#",
      publishedAt,
      thumbnailUrl,
      source:
        document.querySelector("channel > title")?.textContent ?? undefined,
    };
  });

  storeCachedFeed(url, parsedItems);
  return parsedItems;
}
