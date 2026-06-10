import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RSSFeedResult } from "@/lib/fetchers/rss";

const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Channel</title>
    <item>
      <title>Test Article</title>
      <link>https://example.com/article-1</link>
      <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
      <description>Test description</description>
    </item>
  </channel>
</rss>`;

function makeFetchOk(body: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
  });
}

describe("fetchRSSFeed", () => {
  let fetchRSSFeed: (url: string) => Promise<RSSFeedResult>;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    const mod = await import("@/lib/fetchers/rss");
    fetchRSSFeed = mod.fetchRSSFeed;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("parses RSS items and returns correct fields", async () => {
    vi.stubGlobal("fetch", makeFetchOk(RSS_XML));
    const { items, fromCache } = await fetchRSSFeed(
      "https://example.com/feed.xml",
    );
    expect(fromCache).toBe(false);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Test Article");
    expect(items[0].url).toBe("https://example.com/article-1");
    expect(items[0].publishedAt).toBe(
      new Date("Mon, 01 Jan 2024 10:00:00 GMT").toISOString(),
    );
  });

  it("routes through proxy for PROXY_HOSTS hostnames", async () => {
    const mockFetch = makeFetchOk(RSS_XML);
    vi.stubGlobal("fetch", mockFetch);
    await fetchRSSFeed("https://telex.hu/feed.xml");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/proxy?url=" + encodeURIComponent("https://telex.hu/feed.xml"),
    );
  });

  it("fetches directly for non-proxy hostnames", async () => {
    const mockFetch = makeFetchOk(RSS_XML);
    vi.stubGlobal("fetch", mockFetch);
    await fetchRSSFeed("https://example.com/feed.xml");
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/feed.xml");
  });

  it("throws when the HTTP response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    await expect(fetchRSSFeed("https://example.com/feed.xml")).rejects.toThrow(
      "404",
    );
  });

  it("returns cached result without a second network request", async () => {
    const mockFetch = makeFetchOk(RSS_XML);
    vi.stubGlobal("fetch", mockFetch);
    const first = await fetchRSSFeed("https://example.com/feed.xml");
    const second = await fetchRSSFeed("https://example.com/feed.xml");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
  });

  it("deduplicates inflight requests for the same URL", async () => {
    const mockFetch = makeFetchOk(RSS_XML);
    vi.stubGlobal("fetch", mockFetch);
    const [first, second] = await Promise.all([
      fetchRSSFeed("https://example.com/feed.xml"),
      fetchRSSFeed("https://example.com/feed.xml"),
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(false);
  });
});
