import type { FeedItem } from "@/types/dashboard";
import { PROXY_HOSTS } from "@/lib/proxy-hosts";

export interface RSSFeedResult {
  items: FeedItem[];
  fromCache: boolean;
}

const RSS_CACHE_TTL_MS = 15 * 60 * 1000;
const rssMemoryCache = new Map<
  string,
  { expires: number; items: FeedItem[] }
>();
const inflightRequests = new Map<string, Promise<RSSFeedResult>>();

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
    const stored = window.sessionStorage.getItem(getCacheKey(url));
    if (!stored) {
      return undefined;
    }

    const parsed = JSON.parse(stored) as { expires: number; items: FeedItem[] };
    if (parsed.expires > now && Array.isArray(parsed.items)) {
      rssMemoryCache.set(url, parsed);
      return parsed.items;
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn(error);
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
    window.sessionStorage.setItem(getCacheKey(url), JSON.stringify(entry));
  } catch (error) {
    if (import.meta.env.DEV) console.warn(error);
  }
};

export function clearRSSCache(url: string) {
  rssMemoryCache.delete(url);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(getCacheKey(url));
  } catch (error) {
    if (import.meta.env.DEV) console.warn(error);
  }
}

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
  if (Number.isNaN(parsed.getTime())) {
    // Unparseable date falls back to now, which reorders the item — surface it.
    if (import.meta.env.DEV)
      console.warn(`Unparseable feed date: ${dateValue}`);
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

export async function fetchRSSFeed(
  url: string,
  { force = false }: { force?: boolean } = {},
): Promise<RSSFeedResult> {
  if (!force) {
    const cached = loadCachedFeed(url);
    if (cached) return { items: cached, fromCache: true };
  }

  const inflight = inflightRequests.get(url);
  if (inflight) {
    return inflight;
  }

  const promise = (async () => {
    let fetchUrl = url;
    try {
      if (typeof window !== "undefined") {
        const u = new URL(url);
        if (PROXY_HOSTS.has(u.hostname)) {
          fetchUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        }
      }
    } catch {
      fetchUrl = url;
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${String(response.status)}`);
    }

    const text = await response.text();
    const parser = new DOMParser();
    const document = parser.parseFromString(text, "application/xml");
    const items = Array.from(document.querySelectorAll("item, entry"));

    const parsedItems = items.slice(0, 15).map((item) => {
      const title = parseText(item, ["title"]);
      const link =
        parseText(item, ["link", "link[rel='alternate']"]) ??
        item.querySelector("link")?.getAttribute("href") ??
        undefined;
      const description = parseText(item, [
        "description",
        "summary",
        "content",
      ]);
      const publishedAt = parseDate(
        parseText(item, ["pubDate", "published", "updated"]),
      );
      const thumbnailUrl =
        item
          .querySelector("media\\:thumbnail, thumbnail, image")
          ?.getAttribute("url") ?? undefined;

      return {
        id: link ?? `${title ?? "item"}-${publishedAt}`,
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
    return { items: parsedItems, fromCache: false };
  })();

  inflightRequests.set(url, promise);
  promise.then(
    () => inflightRequests.delete(url),
    () => inflightRequests.delete(url),
  );

  return promise;
}
