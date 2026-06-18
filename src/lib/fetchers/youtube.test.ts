import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchYouTubeData, clearYouTubeCaches } from "@/lib/fetchers/youtube";
import type { PublisherConfig } from "@/types/dashboard";

const CHANNEL_ID = "UCM-1sd-cXSuCsfWp8QMY_OQ";

const PUBLISHER: PublisherConfig = {
  id: "telex",
  name: "Telex",
  youtubeChannelId: CHANNEL_ID,
};

const PUBLISHER_2: PublisherConfig = {
  id: "partizan",
  name: "Partizán",
  youtubeChannelId: "UCEFpEvuosfPGlV1VyUF6QOA",
};

function makeResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function makeErrorResponse(status: number) {
  return { ok: false, status, json: () => Promise.resolve({}) };
}

function makePlaylistResponse(videoIds: string[]) {
  return makeResponse({
    items: videoIds.map((id) => ({ contentDetails: { videoId: id } })),
  });
}

function makeVideosResponse(
  videos: {
    id: string;
    title?: string;
    publishedAt?: string;
    live?: boolean;
  }[],
) {
  return makeResponse({
    items: videos.map((v) => ({
      id: v.id,
      snippet: {
        title: v.title ?? "Test Video",
        description: "Test description",
        publishedAt: v.publishedAt ?? "2024-01-01T00:00:00Z",
        thumbnails: { medium: { url: "https://example.com/thumb.jpg" } },
        channelTitle: "Test Channel",
        liveBroadcastContent: v.live ? "live" : "none",
      },
    })),
  });
}

describe("fetchYouTubeData", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
    sessionStorage.clear();
    clearYouTubeCaches();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns empty arrays when VITE_YOUTUBE_API_KEY is not set", async () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "");
    const result = await fetchYouTubeData([PUBLISHER]);
    expect(result.videos).toEqual([]);
    expect(result.streams).toEqual([]);
    expect(result.fromCache).toBe(true);
  });

  it("returns correctly shaped videos from playlist + videos APIs", async () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "test-key");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makePlaylistResponse(["vid1", "vid2"]))
      .mockResolvedValueOnce(
        makeVideosResponse([
          { id: "vid1", title: "First", publishedAt: "2024-06-01T00:00:00Z" },
          { id: "vid2", title: "Second", publishedAt: "2024-05-01T00:00:00Z" },
        ]),
      );
    vi.stubGlobal("fetch", mockFetch);

    const { videos, fromCache } = await fetchYouTubeData([PUBLISHER]);
    expect(videos).toHaveLength(2);
    expect(videos[0].title).toBe("First");
    expect(videos[0].url).toBe("https://www.youtube.com/watch?v=vid1");
    expect(videos[0].source).toBe("Telex");
    expect(videos[0].thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(fromCache).toBe(false);
  });

  it("puts live items in streams, not videos", async () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "test-key");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makePlaylistResponse(["liveVid", "normalVid"]))
      .mockResolvedValueOnce(
        makeVideosResponse([
          { id: "liveVid", title: "Live Now", live: true },
          { id: "normalVid", title: "Normal Video", live: false },
        ]),
      );
    vi.stubGlobal("fetch", mockFetch);

    const { videos, streams } = await fetchYouTubeData([PUBLISHER]);
    expect(videos).toHaveLength(1);
    expect(videos[0].title).toBe("Normal Video");
    expect(streams).toHaveLength(1);
    expect(streams[0].title).toBe("Live Now");
    expect(streams[0].isLive).toBe(true);
  });

  it("returns empty streams (does not throw) when no live streams found", async () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "test-key");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makePlaylistResponse(["vid1"]))
      .mockResolvedValueOnce(makeVideosResponse([{ id: "vid1", live: false }]));
    vi.stubGlobal("fetch", mockFetch);

    const { streams } = await fetchYouTubeData([PUBLISHER]);
    expect(streams).toEqual([]);
  });

  it("returns cached result without a second fetch", async () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "test-key");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makePlaylistResponse(["vid1"]))
      .mockResolvedValueOnce(
        makeVideosResponse([{ id: "vid1", title: "Cached" }]),
      );
    vi.stubGlobal("fetch", mockFetch);

    const first = await fetchYouTubeData([PUBLISHER]);
    const second = await fetchYouTubeData([PUBLISHER]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
  });

  it("deduplicates inflight parallel requests", async () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "test-key");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makePlaylistResponse(["vid1"]))
      .mockResolvedValueOnce(makeVideosResponse([{ id: "vid1" }]));
    vi.stubGlobal("fetch", mockFetch);

    await Promise.all([
      fetchYouTubeData([PUBLISHER]),
      fetchYouTubeData([PUBLISHER]),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws when the playlist API returns a non-ok response", async () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "test-key");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeErrorResponse(403)));

    await expect(fetchYouTubeData([PUBLISHER])).rejects.toThrow("403");
  });

  it("returns partialError when one publisher fails and another succeeds", async () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "test-key");

    const UPLOADS_1 = "UUM-1sd-cXSuCsfWp8QMY_OQ";
    const UPLOADS_2 = "UUEFpEvuosfPGlV1VyUF6QOA";

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes(UPLOADS_1)) {
        return Promise.resolve(makePlaylistResponse(["vid1"]));
      }
      if (url.includes(UPLOADS_2)) {
        return Promise.resolve(makePlaylistResponse(["vid2"]));
      }
      if (url.includes("vid1")) {
        return Promise.resolve(
          makeVideosResponse([{ id: "vid1", title: "Working" }]),
        );
      }
      if (url.includes("vid2")) {
        return Promise.resolve(makeErrorResponse(500));
      }
      return Promise.resolve(makeErrorResponse(404));
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchYouTubeData([PUBLISHER, PUBLISHER_2]);
    expect(result.videos).toHaveLength(1);
    expect(result.videos[0].title).toBe("Working");
    expect(result.partialError).toMatch(/YouTube csatorna nem töltődött be/);
  });

  it("sorts videos by publishedAt descending across multiple publishers", async () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "test-key");

    // Pub1 uploads playlist: "UU" + CHANNEL_ID.slice(2)
    const UPLOADS_1 = "UUM-1sd-cXSuCsfWp8QMY_OQ";
    // Pub2 uploads playlist: "UU" + CHANNEL_ID_2.slice(2)
    const UPLOADS_2 = "UUEFpEvuosfPGlV1VyUF6QOA";

    // Use URL-based dispatch because both channels are fetched in parallel
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes(UPLOADS_1)) {
        return Promise.resolve(makePlaylistResponse(["oldVid"]));
      }
      if (url.includes(UPLOADS_2)) {
        return Promise.resolve(makePlaylistResponse(["newVid"]));
      }
      if (url.includes("oldVid")) {
        return Promise.resolve(
          makeVideosResponse([
            {
              id: "oldVid",
              title: "Older",
              publishedAt: "2024-01-01T00:00:00Z",
            },
          ]),
        );
      }
      if (url.includes("newVid")) {
        return Promise.resolve(
          makeVideosResponse([
            {
              id: "newVid",
              title: "Newer",
              publishedAt: "2024-06-01T00:00:00Z",
            },
          ]),
        );
      }
      return Promise.resolve(makeErrorResponse(404));
    });
    vi.stubGlobal("fetch", mockFetch);

    const { videos } = await fetchYouTubeData([PUBLISHER, PUBLISHER_2]);
    expect(videos[0].title).toBe("Newer");
    expect(videos[1].title).toBe("Older");
  });
});
