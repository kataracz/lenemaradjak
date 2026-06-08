import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { FeedItem } from "@/types/dashboard";

vi.mock("@/lib/publisher-config", () => ({
  publishers: [
    { id: "pub1", name: "Publisher 1", youtubeChannelId: "UC1" },
    { id: "pub2", name: "Publisher 2", youtubeChannelId: "UC2" },
  ],
}));

vi.mock("@/lib/fetchers/youtube", () => ({
  fetchYouTubeData: vi.fn(),
}));

import { useYouTubeData } from "@/hooks/useYouTubeData";
import { fetchYouTubeData } from "@/lib/fetchers/youtube";

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
    });

    const { result } = renderHook(() => useYouTubeData(["pub1"]));

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

    const { result } = renderHook(() => useYouTubeData(["pub1"]));

    await waitFor(() => {
      expect(result.current.error).toBe("YouTube API failed");
    });

    expect(result.current.videos).toEqual([]);
    expect(result.current.streams).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("returns empty arrays when fetch resolves with empty result", async () => {
    vi.mocked(fetchYouTubeData).mockResolvedValue({ videos: [], streams: [] });

    const { result } = renderHook(() => useYouTubeData(["pub1"]));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.videos).toEqual([]);
    expect(result.current.streams).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("hasConfiguredChannels is true when a matched publisher has a channel ID", async () => {
    vi.mocked(fetchYouTubeData).mockResolvedValue({ videos: [], streams: [] });

    const { result } = renderHook(() => useYouTubeData(["pub1"]));

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
    });

    const { result } = renderHook(() => useYouTubeData(["pub1"]));

    await waitFor(() => {
      expect(result.current.videos).toHaveLength(1);
    });

    expect(result.current.error).toBe("Egy YouTube csatorna nem töltődött be.");
  });

  it("refreshDisabled becomes true after refresh() is called", async () => {
    vi.mocked(fetchYouTubeData).mockResolvedValue({ videos: [], streams: [] });

    const { result } = renderHook(() => useYouTubeData(["pub1"]));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.refreshDisabled).toBe(false);

    act(() => {
      result.current.refresh();
    });

    expect(result.current.refreshDisabled).toBe(true);
  });
});
