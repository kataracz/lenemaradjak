import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveYouTubeChannelId,
  resolveChannelPublishers,
} from "@/lib/fetchers/youtube-channel-resolution";
import { clearYouTubeCaches } from "@/lib/fetchers/youtube";
import type { PublisherConfig } from "@/types/dashboard";

const PUBLISHER_WITH_HANDLE: PublisherConfig = {
  id: "telex",
  name: "Telex",
  youtubeChannelHandle: "@telex",
};

function makeResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function makeErrorResponse(status: number) {
  return { ok: false, status, json: () => Promise.resolve({}) };
}

describe("resolveYouTubeChannelId", () => {
  beforeEach(() => {
    localStorage.clear();
    clearYouTubeCaches();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns the configured channel id without a network call", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const channelId = await resolveYouTubeChannelId({
      id: "pub",
      name: "Pub",
      youtubeChannelId: "UC123",
    });

    expect(channelId).toBe("UC123");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("resolves via forHandle when the channels API recognizes the handle", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeResponse({ items: [{ id: "UCHandle" }] }));
    vi.stubGlobal("fetch", mockFetch);

    const channelId = await resolveYouTubeChannelId(PUBLISHER_WITH_HANDLE);

    expect(channelId).toBe("UCHandle");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to search.list when the handle isn't recognized", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeResponse({ items: [] }))
      .mockResolvedValueOnce(
        makeResponse({ items: [{ id: { channelId: "UCFallback" } }] }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const channelId = await resolveYouTubeChannelId(PUBLISHER_WITH_HANDLE);

    expect(channelId).toBe("UCFallback");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not fall back to search.list when forHandle fails outright", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(makeErrorResponse(403));
    vi.stubGlobal("fetch", mockFetch);

    const channelId = await resolveYouTubeChannelId(PUBLISHER_WITH_HANDLE);

    expect(channelId).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("caches a resolved channel id so a second call skips the network", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeResponse({ items: [{ id: "UCHandle" }] }));
    vi.stubGlobal("fetch", mockFetch);

    await resolveYouTubeChannelId(PUBLISHER_WITH_HANDLE);
    const second = await resolveYouTubeChannelId(PUBLISHER_WITH_HANDLE);

    expect(second).toBe("UCHandle");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent resolutions for the same publisher", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(makeResponse({ items: [{ id: "UCHandle" }] }));
    vi.stubGlobal("fetch", mockFetch);

    const [first, second] = await Promise.all([
      resolveYouTubeChannelId(PUBLISHER_WITH_HANDLE),
      resolveYouTubeChannelId(PUBLISHER_WITH_HANDLE),
    ]);

    expect(first).toBe("UCHandle");
    expect(second).toBe("UCHandle");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("resolveChannelPublishers", () => {
  beforeEach(() => {
    localStorage.clear();
    clearYouTubeCaches();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("drops publishers whose channel id couldn't be resolved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeResponse({ items: [] })),
    );

    const resolved = await resolveChannelPublishers([
      { id: "configured", name: "Configured", youtubeChannelId: "UC1" },
      { id: "no-handle", name: "No handle" },
    ]);

    expect(resolved).toEqual([
      {
        publisher: {
          id: "configured",
          name: "Configured",
          youtubeChannelId: "UC1",
        },
        channelId: "UC1",
      },
    ]);
  });
});
