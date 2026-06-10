import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import type { FeedItem } from "@/types/dashboard";

vi.mock("@/lib/fetchers/rss", () => ({
  fetchRSSFeed: vi.fn(),
}));
vi.mock("@/lib/publisher-config", () => ({
  publishers: [
    {
      id: "pub1",
      name: "Publisher 1",
      articleFeedUrl: "https://pub1.com/feed",
    },
    {
      id: "pub2",
      name: "Publisher 2",
      articleFeedUrl: "https://pub2.com/feed",
    },
  ],
}));

import { fetchRSSFeed } from "@/lib/fetchers/rss";
import { useRSSFeed } from "@/hooks/useRSSFeed";
import type { PublisherConfig } from "@/types/dashboard";

// Stable references at module scope — avoids re-creating arrays on every render
// which would cause useMemo to recompute on each tick and trigger infinite effects.
const IDS_PUB1 = ["pub1"];
const IDS_BOTH = ["pub1", "pub2"];
const getUrl = (p: PublisherConfig) => p.articleFeedUrl;
const noUrl = () => undefined;
const getPartialError = (count: number) => `${String(count)} feeds failed`;

const ITEM_1: FeedItem = {
  id: "i1",
  title: "Article One",
  url: "https://pub1.com/1",
  publishedAt: "2024-06-01T00:00:00Z",
};
const ITEM_2: FeedItem = {
  id: "i2",
  title: "Article Two",
  url: "https://pub2.com/1",
  publishedAt: "2024-05-01T00:00:00Z",
};

describe("useRSSFeed", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("starts with empty items, not loading, no error", () => {
    vi.mocked(fetchRSSFeed).mockResolvedValue({ items: [], fromCache: false });
    const { result } = renderHook(() =>
      useRSSFeed(IDS_PUB1, getUrl, getPartialError),
    );
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("populates items after both feeds succeed, sorted newest first", async () => {
    vi.mocked(fetchRSSFeed)
      .mockResolvedValueOnce({ items: [ITEM_1], fromCache: false })
      .mockResolvedValueOnce({ items: [ITEM_2], fromCache: false });

    const { result } = renderHook(() =>
      useRSSFeed(IDS_BOTH, getUrl, getPartialError),
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(result.current.items[0].id).toBe("i1"); // newer first
    expect(result.current.items[1].id).toBe("i2");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error when all feeds fail and no items loaded", async () => {
    vi.mocked(fetchRSSFeed).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useRSSFeed(IDS_PUB1, getUrl, getPartialError),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("shows partial error with items when some feeds fail", async () => {
    vi.mocked(fetchRSSFeed)
      .mockResolvedValueOnce({ items: [ITEM_1], fromCache: false })
      .mockRejectedValueOnce(new Error("Feed 2 down"));

    const { result } = renderHook(() =>
      useRSSFeed(IDS_BOTH, getUrl, getPartialError),
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    expect(result.current.error).toBe("1 feeds failed");
    expect(result.current.items[0].id).toBe("i1");
  });

  it("fetches nothing when publisher has no URL", async () => {
    const { result } = renderHook(() =>
      useRSSFeed(IDS_PUB1, noUrl, getPartialError),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(fetchRSSFeed)).not.toHaveBeenCalled();
  });

  it("only fetches publishers matching publisherIds", async () => {
    vi.mocked(fetchRSSFeed).mockResolvedValue({
      items: [ITEM_1],
      fromCache: false,
    });

    const { result } = renderHook(() =>
      useRSSFeed(IDS_PUB1, getUrl, getPartialError),
    );

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    expect(vi.mocked(fetchRSSFeed)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchRSSFeed)).toHaveBeenCalledWith(
      "https://pub1.com/feed",
    );
  });

  it("refreshDisabled is true from initial load and stays true until cooldown expires", async () => {
    vi.mocked(fetchRSSFeed).mockResolvedValue({ items: [], fromCache: false });

    const { result } = renderHook(() =>
      useRSSFeed(IDS_PUB1, getUrl, getPartialError),
    );

    expect(result.current.refreshDisabled).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.refreshDisabled).toBe(true);
  });

  it("re-enables refresh once a fully cached load resolves", async () => {
    vi.mocked(fetchRSSFeed).mockResolvedValue({ items: [], fromCache: true });

    const { result } = renderHook(() =>
      useRSSFeed(IDS_PUB1, getUrl, getPartialError),
    );

    expect(result.current.refreshDisabled).toBe(true);

    await waitFor(() => {
      expect(result.current.refreshDisabled).toBe(false);
    });
  });
});
