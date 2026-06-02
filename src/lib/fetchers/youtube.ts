import type { FeedItem, PublisherConfig } from "@/types/dashboard";
import { PROXY_HOSTS } from "@/lib/proxy-hosts";

const apiKey: string | undefined = import.meta.env.VITE_YOUTUBE_API_KEY as
  | string
  | undefined;

// Channel ID resolution cache (24h TTL)
const CHANNEL_ID_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const channelIdCache = new Map<string, { expires: number; id: string }>();
const channelResolutionInflight = new Map<
  string,
  Promise<string | undefined>
>();

// Video/stream result cache (15-min TTL, per channel)
const YOUTUBE_RESULT_TTL_MS = 15 * 60 * 1000;
const videoResultCache = new Map<
  string,
  { expires: number; items: FeedItem[] }
>();
const streamResultCache = new Map<
  string,
  { expires: number; items: FeedItem[] }
>();
const videoDetailsCache = new Map<
  string,
  { expires: number; items: VideoItem[] }
>();
const videoFetchInflight = new Map<string, Promise<FeedItem[]>>();
const streamFetchInflight = new Map<string, Promise<FeedItem[]>>();
const videoDetailsInflight = new Map<string, Promise<VideoItem[]>>();

// ── API response types ────────────────────────────────────────────────────────

interface PlaylistContentItem {
  contentDetails?: { videoId?: string };
}

interface VideoItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string } };
    channelTitle?: string;
    liveBroadcastContent?: "live" | "upcoming" | "none";
  };
}

// ── Cache key helpers ────────────────────────────────────────────────────────

const getChannelCacheKey = (publisherId: string) =>
  `lenemaradjak:youtube-channel-id:${publisherId}`;

const getVideoCacheKey = (channelId: string) =>
  `lenemaradjak:youtube:videos:${channelId}`;

const getStreamCacheKey = (channelId: string) =>
  `lenemaradjak:youtube:streams:${channelId}`;

const getVideoDetailsCacheKey = (channelId: string) =>
  `lenemaradjak:youtube:video-details:${channelId}`;

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
  const entry = { expires: Date.now() + ttl, ...data } as {
    expires: number;
  } & T;
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
  saveToCache(
    channelIdCache,
    getChannelCacheKey(publisherId),
    CHANNEL_ID_CACHE_TTL_MS,
    {
      id: channelId,
    },
  );
};

const loadCachedVideos = (channelId: string): FeedItem[] | undefined => {
  const key = getVideoCacheKey(channelId);
  return loadFromCache<{ items: FeedItem[] }>(videoResultCache, key)?.items;
};

const storeCachedVideos = (channelId: string, items: FeedItem[]) => {
  saveToCache(
    videoResultCache,
    getVideoCacheKey(channelId),
    YOUTUBE_RESULT_TTL_MS,
    { items },
  );
};

const loadCachedStreams = (channelId: string): FeedItem[] | undefined => {
  const key = getStreamCacheKey(channelId);
  return loadFromCache<{ items: FeedItem[] }>(streamResultCache, key)?.items;
};

const storeCachedStreams = (channelId: string, items: FeedItem[]) => {
  saveToCache(
    streamResultCache,
    getStreamCacheKey(channelId),
    YOUTUBE_RESULT_TTL_MS,
    { items },
  );
};

const loadCachedVideoDetails = (channelId: string): VideoItem[] | undefined => {
  const key = getVideoDetailsCacheKey(channelId);
  return loadFromCache<{ items: VideoItem[] }>(videoDetailsCache, key)?.items;
};

const storeCachedVideoDetails = (channelId: string, items: VideoItem[]) => {
  saveToCache(
    videoDetailsCache,
    getVideoDetailsCacheKey(channelId),
    YOUTUBE_RESULT_TTL_MS,
    {
      items,
    },
  );
};

// ── Proxy-aware fetch ────────────────────────────────────────────────────────

async function proxyFetch(url: URL): Promise<Response> {
  if (typeof window !== "undefined" && PROXY_HOSTS.has(url.hostname)) {
    return fetch(`/api/proxy?url=${encodeURIComponent(url.toString())}`);
  }
  return fetch(url.toString());
}

// ── Channel handle → ID resolution ───────────────────────────────────────────

const normalizeHandle = (handle: string) => handle.trim().replace(/^@/, "");

const getUploadsPlaylistId = (channelId: string) => "UU" + channelId.slice(2);

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
    // Step 1: forHandle — modern low-cost lookup (1 quota unit), works with Brand Accounts.
    // forUsername is deprecated and triggers accountDelegationForbidden for Brand Accounts.
    const handleUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    handleUrl.searchParams.set("part", "id");
    handleUrl.searchParams.set("forHandle", handle);
    handleUrl.searchParams.set("key", apiKey);

    const handleResponse = await proxyFetch(handleUrl);
    if (!handleResponse.ok) {
      // Genuine API error (quota, auth, etc.) — search.list would also fail, so skip it.
      console.warn(
        `YouTube forHandle failed for ${publisher.id}: ${String(handleResponse.status)}`,
      );
      return undefined;
    }

    const handleResult = (await handleResponse.json()) as {
      items?: { id?: string }[];
    };
    const channelId: string | undefined = handleResult.items?.[0]?.id;
    if (channelId) {
      storeCachedChannelId(publisher.id, channelId);
      return channelId;
    }

    // forHandle returned 200 but no items — handle not recognized; try search fallback.
    // Step 2: search fallback (100 quota units).
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "id");
    searchUrl.searchParams.set("q", normalizeHandle(handle));
    searchUrl.searchParams.set("type", "channel");
    searchUrl.searchParams.set("maxResults", "1");
    searchUrl.searchParams.set("key", apiKey);

    const searchResponse = await proxyFetch(searchUrl);
    if (!searchResponse.ok) {
      console.warn(
        `YouTube channel resolution failed for ${publisher.id}: ${String(searchResponse.status)}`,
      );
      return undefined;
    }

    const searchResult = (await searchResponse.json()) as {
      items?: { id?: { channelId?: string } }[];
    };
    const fallbackId: string | undefined =
      searchResult.items?.[0]?.id?.channelId;
    if (fallbackId) {
      storeCachedChannelId(publisher.id, fallbackId);
      return fallbackId;
    }

    console.warn(
      `YouTube: could not resolve channel ID for ${publisher.id} (${handle})`,
    );
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

// Shared: fetches recent uploads playlist IDs then hydrates video details.
// Both fetchChannelVideos and fetchChannelLiveStreams call this so the two
// API calls (playlistItems + videos) fire only once per channel per TTL window,
// even when both widgets are mounted simultaneously.
function fetchChannelVideoDetails(channelId: string): Promise<VideoItem[]> {
  if (!apiKey) return Promise.resolve([]);

  const cached = loadCachedVideoDetails(channelId);
  if (cached) return Promise.resolve(cached);

  const inflight = videoDetailsInflight.get(channelId);
  if (inflight) return inflight;

  const promise = (async () => {
    const playlistUrl = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems",
    );
    playlistUrl.searchParams.set("part", "contentDetails");
    playlistUrl.searchParams.set("playlistId", getUploadsPlaylistId(channelId));
    playlistUrl.searchParams.set("maxResults", "10");
    playlistUrl.searchParams.set("key", apiKey);

    const playlistResponse = await proxyFetch(playlistUrl);
    if (!playlistResponse.ok) {
      throw new Error(
        `YouTube playlistItems API failed: ${String(playlistResponse.status)}`,
      );
    }

    const playlistResult = (await playlistResponse.json()) as {
      items?: PlaylistContentItem[];
    };
    const videoIds = (playlistResult.items ?? [])
      .map((item) => item.contentDetails?.videoId)
      .filter((id): id is string => Boolean(id));

    if (videoIds.length === 0) {
      storeCachedVideoDetails(channelId, []);
      return [];
    }

    // videos.list returns snippet.liveBroadcastContent used by the live stream filter.
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet");
    videosUrl.searchParams.set("id", videoIds.join(","));
    videosUrl.searchParams.set("key", apiKey);

    const videosResponse = await proxyFetch(videosUrl);
    if (!videosResponse.ok) {
      throw new Error(
        `YouTube videos API failed: ${String(videosResponse.status)}`,
      );
    }

    const videosResult = (await videosResponse.json()) as {
      items?: VideoItem[];
    };
    const items = videosResult.items ?? [];
    storeCachedVideoDetails(channelId, items);
    return items;
  })();

  videoDetailsInflight.set(channelId, promise);
  promise.then(
    () => videoDetailsInflight.delete(channelId),
    () => videoDetailsInflight.delete(channelId),
  );

  return promise;
}

function fetchChannelVideos(
  publisher: PublisherConfig,
  channelId: string,
): Promise<FeedItem[]> {
  if (!apiKey) return Promise.resolve([]);

  const cached = loadCachedVideos(channelId);
  if (cached) return Promise.resolve(cached);

  const inflight = videoFetchInflight.get(channelId);
  if (inflight) return inflight;

  const promise = (async () => {
    const videoItems = await fetchChannelVideoDetails(channelId);
    const items: FeedItem[] = videoItems.map((item) => ({
      id:
        item.id ??
        `${publisher.id}-${item.snippet?.publishedAt ?? new Date().toISOString()}`,
      title: item.snippet?.title ?? "Untitled",
      description: item.snippet?.description,
      url: item.id ? `https://www.youtube.com/watch?v=${item.id}` : "#",
      publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
      channelName: item.snippet?.channelTitle,
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
    const videoItems = await fetchChannelVideoDetails(channelId);
    const items: FeedItem[] = videoItems
      .filter((item) => item.snippet?.liveBroadcastContent === "live")
      .map((item) => ({
        id: item.id ?? `${publisher.id}-live`,
        title: item.snippet?.title ?? "Live stream",
        description: item.snippet?.description,
        url: item.id ? `https://www.youtube.com/watch?v=${item.id}` : "#",
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
        (r): r is PromiseFulfilledResult<FeedItem[]> =>
          r.status === "fulfilled",
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
