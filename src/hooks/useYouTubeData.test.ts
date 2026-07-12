import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { FeedItem } from "@/types/dashboard";

vi.mock("@/lib/publisher-config", () => ({
  publishers: [
    { id: "pub1", name: "Publisher 1", youtubeChannelId: "UC1" },
    { id: "pub2", name: "Publisher 2", youtubeChannelId: "UC2" },
  ],
}));

const { QuotaError } = vi.hoisted(() => {
  class QuotaError extends Error {}
  return { QuotaError };
});

vi.mock("@/lib/fetchers/youtube", () => ({
  fetchYouTubeData: vi.fn(),
  isYouTubeQuotaError: (err: unknown) => err instanceof QuotaError,
}));

import { useYouTubeData } from "@/hooks/useYouTubeData";
import { fetchYouTubeData } from "@/lib/fetchers/youtube";

const IDS_PUB1 = ["pub1"];

const ITEM: FeedItem = {
  id: "vid1",
  title: "Test Video",
  url: "https://youtube.com/watch?v=vid1",
  publishedAt: "2024-01-01T00:00:00Z",
  source: "Publisher 1",
};

describe("useYouTubeData", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("populates videos after fetch resolves", async () => {
    vi.mocked(fetchYouTubeData).mockResolvedValue({
      videos: [ITEM],
      streams: [],
      fromCache: false,
    });

    const { result } = renderHook(() => useYouTubeData(IDS_PUB1));

    await waitFor(() => {
      expect(result.current.videos).toHaveLength(1);
    });

    expect(result.current.videos[0].title).toBe("Test Video");
    expect(result.current.streams).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch throws", async () => {
    vi.mocked(fetchYouTubeData).mockRejectedValue(
      new Error("YouTube API failed"),
    );

    const { result } = renderHook(() => useYouTubeData(IDS_PUB1));

    await waitFor(() => {
      expect(result.current.error).toBe("YouTube API failed");
    });

    expect(result.current.videos).toEqual([]);
    expect(result.current.streams).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("shows a quota-specific message when fetch throws a quota error", async () => {
    vi.mocked(fetchYouTubeData).mockRejectedValue(new QuotaError());

    const { result } = renderHook(() => useYouTubeData(IDS_PUB1));

    await waitFor(() => {
      expect(result.current.error).toBe(
        "Elértük a YouTube napi API-kvótáját, próbáld újra később.",
      );
    });
  });

  it("returns empty arrays when fetch resolves with empty result", async () => {
    vi.mocked(fetchYouTubeData).mockResolvedValue({
      videos: [],
      streams: [],
      fromCache: false,
    });

    const { result } = renderHook(() => useYouTubeData(IDS_PUB1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.videos).toEqual([]);
    expect(result.current.streams).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("hasConfiguredChannels is true when a matched publisher has a channel ID", async () => {
    vi.mocked(fetchYouTubeData).mockResolvedValue({
      videos: [],
      streams: [],
      fromCache: false,
    });

    const { result } = renderHook(() => useYouTubeData(IDS_PUB1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasConfiguredChannels).toBe(true);
  });

  it("sets error while keeping items when fetch resolves with partialError", async () => {
    vi.mocked(fetchYouTubeData).mockResolvedValue({
      videos: [ITEM],
      streams: [],
      partialError: "Egy YouTube csatorna nem töltődött be.",
      fromCache: false,
    });

    const { result } = renderHook(() => useYouTubeData(IDS_PUB1));

    await waitFor(() => {
      expect(result.current.videos).toHaveLength(1);
    });

    expect(result.current.error).toBe("Egy YouTube csatorna nem töltődött be.");
  });

  it("refreshDisabled is true from initial load and stays true until cooldown expires", async () => {
    vi.mocked(fetchYouTubeData).mockResolvedValue({
      videos: [],
      streams: [],
      fromCache: false,
    });

    const { result } = renderHook(() => useYouTubeData(IDS_PUB1));

    expect(result.current.refreshDisabled).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.refreshDisabled).toBe(true);
  });

  it("re-enables refresh once a fully cached load resolves", async () => {
    vi.mocked(fetchYouTubeData).mockResolvedValue({
      videos: [],
      streams: [],
      fromCache: true,
    });

    const { result } = renderHook(() => useYouTubeData(IDS_PUB1));

    expect(result.current.refreshDisabled).toBe(true);

    await waitFor(() => {
      expect(result.current.refreshDisabled).toBe(false);
    });
  });

  it("passes an AbortSignal to fetchYouTubeData and aborts it on unmount", async () => {
    vi.mocked(fetchYouTubeData).mockResolvedValue({
      videos: [],
      streams: [],
      fromCache: false,
    });

    const { unmount } = renderHook(() => useYouTubeData(IDS_PUB1));

    await waitFor(() => {
      expect(fetchYouTubeData).toHaveBeenCalled();
    });

    const passedSignal = vi.mocked(fetchYouTubeData).mock.calls[0][1]?.signal;
    expect(passedSignal).toBeInstanceOf(AbortSignal);
    expect(passedSignal?.aborted).toBe(false);

    unmount();

    expect(passedSignal?.aborted).toBe(true);
  });

  it("does not throw when the initial load resolves after unmount", async () => {
    let resolveFetch!: (value: {
      videos: FeedItem[];
      streams: FeedItem[];
      fromCache: boolean;
    }) => void;
    vi.mocked(fetchYouTubeData).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { unmount } = renderHook(() => useYouTubeData(IDS_PUB1));

    await waitFor(() => {
      expect(fetchYouTubeData).toHaveBeenCalled();
    });
    unmount();

    resolveFetch({ videos: [ITEM], streams: [], fromCache: false });
    await new Promise((r) => setTimeout(r, 0));
  });
});
