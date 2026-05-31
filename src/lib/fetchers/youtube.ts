import type { FeedItem, PublisherConfig } from "@/types/dashboard";

const apiKey: string | undefined = import.meta.env.VITE_YOUTUBE_API_KEY as
  | string
  | undefined;

// Channel ID resolution cache (24h TTL)
const CHANNEL_ID_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const channelIdCache = new Map<string, { expires: number; id: string }>();
const channelResolutionInflight = new Map<string, Promise<string | undefined>>();

// Video/stream result cache (15-min TTL, per channel)
const YOUTUBE_RESULT_TTL_MS = 15 * 60 * 1000;
const videoResultCache = new Map<string, { expires: number; items: FeedItem[] }>();
const streamResultCache = new Map<string, { expires: number; items: FeedItem[] }>();
const videoFetchInflight = new Map<string, Promise<FeedItem[]>>();
const streamFetchInflight = new Map<string, Promise<FeedItem[]>>();

// ── API response types ────────────────────────────────────────────────────────

interface PlaylistItem {
  snippet: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string } };
    channelTitle?: string;
    resourceId?: { videoId?: string };
  };
}

interface SearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string } };
    channelTitle?: string;
  };
}

// ── Cache key helpers ────────────────────────────────────────────────────────

const getChannelCacheKey = (publisherId: string) =>
  `lenemaradjak:youtube-channel-id:${publisherId}`;

const getVideoCacheKey = (channelId: string) =>
  `lenemaradjak:youtube:videos:${channelId}`;

const getStreamCacheKey = (channelId: string) =>
  `lenemaradjak:youtube:streams:${channelId}`;

// ── Generic localStorage-backed cache helpers ────────────────────────────────

function loadFromCache<T>(
  memoryCache: Map<string, { expires: number } & T>,
  storageKey: string,
): ({ expires: number } & T) | undefined {
  const now = Date.now();
  const memEntry = memoryCache.get(storageKey);
  if (memEntry && memEntry.expires > now) return memEntry;

  if (typeof window === "undefined") return undefined;

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return undefined;
    const parsed = JSON.parse(stored) as { expires: number } & T;
    if (parsed.expires > now) {
      memoryCache.set(storageKey, parsed);
      return parsed;
    }
  } catch {
    // Ignore cache errors.
  }

  return undefined;
}

function saveToCache<T>(
  memoryCache: Map<string, { expires: number } & T>,
  storageKey: string,
  ttl: number,
  data: T,
) {
  const entry = { expires: Date.now() + ttl, ...data } as { expires: number } & T;
  memoryCache.set(storageKey, entry);

  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch {
    // Ignore cache errors.
  }
}

// ── Convenience wrappers for each cache type ─────────────────────────────────

const loadCachedChannelId = (publisherId: string): string | undefined => {
  const key = getChannelCacheKey(publisherId);
  return loadFromCache<{ id: string }>(channelIdCache, key)?.id;
};

const storeCachedChannelId = (publisherId: string, channelId: string) => {
  saveToCache(channelIdCache, getChannelCacheKey(publisherId), CHANNEL_ID_CACHE_TTL_MS, { id: channelId });
};

const loadCachedVideos = (channelId: string): FeedItem[] | undefined => {
  const key = getVideoCacheKey(channelId);
  return loadFromCache<{ items: FeedItem[] }>(videoResultCache, key)?.items;
};

const storeCachedVideos = (channelId: string, items: FeedItem[]) => {
  saveToCache(videoResultCache, getVideoCacheKey(channelId), YOUTUBE_RESULT_TTL_MS, { items });
};

const loadCachedStreams = (channelId: string): FeedItem[] | undefined => {
  const key = getStreamCacheKey(channelId);
  return loadFromCache<{ items: FeedItem[] }>(streamResultCache, key)?.items;
};

const storeCachedStreams = (channelId: string, items: FeedItem[]) => {
  saveToCache(streamResultCache, getStreamCacheKey(channelId), YOUTUBE_RESULT_TTL_MS, { items });
};

// ── Channel handle → ID resolution ───────────────────────────────────────────

const normalizeHandle = (handle: string) => handle.trim().replace(/^@/, "");

async function resolveYouTubeChannelId(
  publisher: PublisherConfig,
): Promise<string | undefined> {
  if (publisher.youtubeChannelId) {
    return publisher.youtubeChannelId;
  }

  if (!apiKey) return undefined;
  const handle = publisher.youtubeChannelHandle;
  if (!handle) return undefined;

  const cached = loadCachedChannelId(publisher.id);
  if (cached) return cached;

  const inflight = channelResolutionInflight.get(publisher.id);
  if (inflight) return inflight;

  const promise = (async (): Promise<string | undefined> => {
    const query = normalizeHandle(handle);

    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "id");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "channel");
    searchUrl.searchParams.set("maxResults", "1");
    searchUrl.searchParams.set("key", apiKey);

    const response = await fetch(searchUrl.toString());
    if (!response.ok) return undefined;

    const result = await response.json() as { items?: { id?: { channelId?: string } }[] };
    const channelId: string | undefined = result.items?.[0]?.id?.channelId;
    if (channelId) {
      storeCachedChannelId(publisher.id, channelId);
      return channelId;
    }

    const usernameUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    usernameUrl.searchParams.set("part", "id");
    usernameUrl.searchParams.set("forUsername", query);
    usernameUrl.searchParams.set("key", apiKey);

    const usernameResponse = await fetch(usernameUrl.toString());
    if (!usernameResponse.ok) return undefined;

    const usernameResult = await usernameResponse.json() as { items?: { id?: string }[] };
    const fallbackId: string | undefined = usernameResult.items?.[0]?.id;
    if (fallbackId) {
      storeCachedChannelId(publisher.id, fallbackId);
      return fallbackId;
    }

    return undefined;
  })();

  channelResolutionInflight.set(publisher.id, promise);
  promise.then(
    () => channelResolutionInflight.delete(publisher.id),
    () => channelResolutionInflight.delete(publisher.id),
  );

  return promise;
}

async function resolveChannelPublishers(
  publishers: PublisherConfig[],
): Promise<{ publisher: PublisherConfig; channelId: string }[]> {
  const results = await Promise.allSettled(
    publishers.map(async (publisher) => ({
      publisher,
      channelId: await resolveYouTubeChannelId(publisher),
    })),
  );

  return results
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<{
        publisher: PublisherConfig;
        channelId: string;
      }> => result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter((item): item is { publisher: PublisherConfig; channelId: string } =>
      Boolean(item.channelId),
    );
}

// ── Per-channel fetch helpers (with cache + inflight dedup) ──────────────────

function fetchChannelVideos(
  publisher: PublisherConfig,
  channelId: string,
): Promise<FeedItem[]> {
  if (!apiKey) return Promise.resolve([]);

  const cached = loadCachedVideos(channelId);
  if (cached) return Promise.resolve(cached);

  const inflight = videoFetchInflight.get(channelId);
  if (inflight) return inflight;

  // UC→UU: uploads playlist ID derived directly from channel ID
  const uploadsPlaylistId = "UU" + channelId.slice(2);

  const promise = (async () => {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", uploadsPlaylistId);
    url.searchParams.set("maxResults", "10");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`YouTube playlistItems API failed: ${String(response.status)}`);
    }

    const result = await response.json() as { items?: PlaylistItem[] };
    const items: FeedItem[] = (result.items ?? []).map((item) => ({
      id:
        item.snippet.resourceId?.videoId ??
        `${publisher.id}-${item.snippet.publishedAt ?? new Date().toISOString()}`,
      title: item.snippet.title ?? "Untitled",
      description: item.snippet.description,
      url: item.snippet.resourceId?.videoId
        ? `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
        : "#",
      publishedAt: item.snippet.publishedAt ?? new Date().toISOString(),
      thumbnailUrl: item.snippet.thumbnails?.medium?.url,
      channelName: item.snippet.channelTitle,
      source: publisher.name,
    }));

    storeCachedVideos(channelId, items);
    return items;
  })();

  videoFetchInflight.set(channelId, promise);
  promise.then(
    () => videoFetchInflight.delete(channelId),
    () => videoFetchInflight.delete(channelId),
  );

  return promise;
}

function fetchChannelLiveStreams(
  publisher: PublisherConfig,
  channelId: string,
): Promise<FeedItem[]> {
  if (!apiKey) return Promise.resolve([]);

  const cached = loadCachedStreams(channelId);
  if (cached) return Promise.resolve(cached);

  const inflight = streamFetchInflight.get(channelId);
  if (inflight) return inflight;

  const promise = (async () => {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("channelId", channelId);
    url.searchParams.set("eventType", "live");
    url.searchParams.set("type", "video");
    url.searchParams.set("order", "date");
    url.searchParams.set("maxResults", "10");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`YouTube Live API failed: ${String(response.status)}`);
    }

    const result = await response.json() as { items?: SearchItem[] };
    const items: FeedItem[] = (result.items ?? []).map((item) => ({
      id:
        item.id?.videoId ??
        `${publisher.id}-${item.snippet?.publishedAt ?? new Date().toISOString()}`,
      title: item.snippet?.title ?? "Live stream",
      description: item.snippet?.description,
      url: item.id?.videoId
        ? `https://www.youtube.com/watch?v=${item.id.videoId}`
        : "#",
      publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
      channelName: item.snippet?.channelTitle,
      source: publisher.name,
      isLive: true,
    }));

    storeCachedStreams(channelId, items);
    return items;
  })();

  streamFetchInflight.set(channelId, promise);
  promise.then(
    () => streamFetchInflight.delete(channelId),
    () => streamFetchInflight.delete(channelId),
  );

  return promise;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchYouTubeVideos(
  publishers: PublisherConfig[],
  maxItems = 5,
): Promise<FeedItem[]> {
  if (!apiKey) {
    return [];
  }

  const resolvedPublishers = await resolveChannelPublishers(publishers);

  if (resolvedPublishers.length > 0) {
    const results = await Promise.allSettled(
      resolvedPublishers.map(({ publisher, channelId }) =>
        fetchChannelVideos(publisher, channelId),
      ),
    );

    const videos = results
      .filter(
        (r): r is PromiseFulfilledResult<FeedItem[]> => r.status === "fulfilled",
      )
      .flatMap((r) => r.value);

    if (videos.length > 0) {
      return videos
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime(),
        )
        .slice(0, maxItems);
    }

    const firstError = results.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    if (firstError) {
      throw firstError.reason instanceof Error
        ? firstError.reason
        : new Error("YouTube API request failed.");
    }
  }

  return [];
}

export async function fetchYouTubeLiveStreams(
  publishers: PublisherConfig[],
  maxItems = 5,
): Promise<FeedItem[]> {
  if (!apiKey) {
    return [];
  }

  const resolvedPublishers = await resolveChannelPublishers(publishers);
  if (resolvedPublishers.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    resolvedPublishers.map(({ publisher, channelId }) =>
      fetchChannelLiveStreams(publisher, channelId),
    ),
  );

  const streams = results
    .filter(
      (r): r is PromiseFulfilledResult<FeedItem[]> => r.status === "fulfilled",
    )
    .flatMap((r) => r.value);

  if (streams.length > 0) {
    return streams
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )
      .slice(0, maxItems);
  }

  const firstError = results.find(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );
  if (firstError) {
    throw firstError.reason instanceof Error
      ? firstError.reason
      : new Error("YouTube Live API request failed.");
  }

  return [];
}
