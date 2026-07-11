import type { FeedItem, PublisherConfig } from "@/types/dashboard";
import { PROXY_HOSTS } from "@/lib/proxy-hosts";
import { sortByDateDesc } from "@/lib/utils";

const getApiKey = () =>
  import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;

const CHANNEL_ID_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const channelIdCache = new Map<string, { expires: number; id: string }>();
const channelResolutionInflight = new Map<
  string,
  Promise<string | undefined>
>();

const YOUTUBE_RESULT_TTL_MS = 15 * 60 * 1000;
const channelDataCache = new Map<
  string,
  { expires: number; videos: FeedItem[]; streams: FeedItem[] }
>();
const channelDataInflight = new Map<
  string,
  Promise<{ videos: FeedItem[]; streams: FeedItem[] }>
>();

function withInflight<T>(
  map: Map<string, Promise<T>>,
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const existing = map.get(key);
  if (existing) return existing;
  const promise = factory();
  map.set(key, promise);
  promise.then(
    () => map.delete(key),
    () => map.delete(key),
  );
  return promise;
}

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

const getChannelCacheKey = (publisherId: string) =>
  `lenemaradjak:youtube-channel-id:${publisherId}`;

const getChannelDataCacheKey = (channelId: string) =>
  `lenemaradjak:youtube:channel-data:${channelId}`;

function loadFromCache<T>(
  memoryCache: Map<string, { expires: number } & T>,
  storageKey: string,
  storage: "local" | "session" = "local",
): ({ expires: number } & T) | undefined {
  const now = Date.now();
  const memEntry = memoryCache.get(storageKey);
  if (memEntry && memEntry.expires > now) return memEntry;

  if (typeof window === "undefined") return undefined;

  try {
    const store =
      storage === "session" ? window.sessionStorage : window.localStorage;
    const stored = store.getItem(storageKey);
    if (!stored) return undefined;
    const parsed = JSON.parse(stored) as { expires: number } & T;
    if (parsed.expires > now) {
      memoryCache.set(storageKey, parsed);
      return parsed;
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn(error);
  }

  return undefined;
}

function saveToCache<T>(
  memoryCache: Map<string, { expires: number } & T>,
  storageKey: string,
  ttl: number,
  data: T,
  storage: "local" | "session" = "local",
) {
  const entry = Object.assign({ expires: Date.now() + ttl }, data);
  memoryCache.set(storageKey, entry);

  if (typeof window === "undefined") return;

  try {
    const store =
      storage === "session" ? window.sessionStorage : window.localStorage;
    store.setItem(storageKey, JSON.stringify(entry));
  } catch (error) {
    if (import.meta.env.DEV) console.warn(error);
  }
}

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

const loadCachedChannelData = (
  channelId: string,
): { videos: FeedItem[]; streams: FeedItem[] } | undefined => {
  const key = getChannelDataCacheKey(channelId);
  const entry = loadFromCache<{ videos: FeedItem[]; streams: FeedItem[] }>(
    channelDataCache,
    key,
    "session",
  );
  return entry ? { videos: entry.videos, streams: entry.streams } : undefined;
};

const storeCachedChannelData = (
  channelId: string,
  videos: FeedItem[],
  streams: FeedItem[],
) => {
  saveToCache(
    channelDataCache,
    getChannelDataCacheKey(channelId),
    YOUTUBE_RESULT_TTL_MS,
    { videos, streams },
    "session",
  );
};

async function proxyFetch(url: URL, signal?: AbortSignal): Promise<Response> {
  const doFetch = () =>
    typeof window !== "undefined" && PROXY_HOSTS.has(url.hostname)
      ? fetch(`/api/proxy?url=${encodeURIComponent(url.toString())}`)
      : fetch(url.toString());

  const res = await doFetch();
  if (res.status === 429) {
    const waitSec = Number(res.headers.get("Retry-After") ?? 5);
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError(signal));
        return;
      }
      const timerId = setTimeout(resolve, waitSec * 1000);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timerId);
          reject(abortError(signal));
        },
        { once: true },
      );
    });
    return doFetch();
  }
  return res;
}

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}

const normalizeHandle = (handle: string) => handle.trim().replace(/^@/, "");

const getUploadsPlaylistId = (channelId: string) => "UU" + channelId.slice(2);

async function resolveYouTubeChannelId(
  publisher: PublisherConfig,
  signal?: AbortSignal,
): Promise<string | undefined> {
  if (publisher.youtubeChannelId) {
    return publisher.youtubeChannelId;
  }

  const apiKey = getApiKey();
  if (!apiKey) return undefined;
  const handle = publisher.youtubeChannelHandle;
  if (!handle) return undefined;

  const cached = loadCachedChannelId(publisher.id);
  if (cached) return cached;

  return withInflight(channelResolutionInflight, publisher.id, async () => {
    // Step 1: forHandle — modern low-cost lookup (1 quota unit), works with Brand Accounts.
    // forUsername is deprecated and triggers accountDelegationForbidden for Brand Accounts.
    const handleUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    handleUrl.searchParams.set("part", "id");
    handleUrl.searchParams.set("forHandle", handle);
    handleUrl.searchParams.set("key", apiKey);

    const handleResponse = await proxyFetch(handleUrl, signal);
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

    const searchResponse = await proxyFetch(searchUrl, signal);
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
  });
}

async function resolveChannelPublishers(
  publishers: PublisherConfig[],
  signal?: AbortSignal,
): Promise<{ publisher: PublisherConfig; channelId: string }[]> {
  const results = await Promise.allSettled(
    publishers.map(async (publisher) => ({
      publisher,
      channelId: await resolveYouTubeChannelId(publisher, signal),
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

function fetchChannelData(
  publisher: PublisherConfig,
  channelId: string,
  force = false,
  signal?: AbortSignal,
): Promise<{ videos: FeedItem[]; streams: FeedItem[] }> {
  if (!force) {
    const cached = loadCachedChannelData(channelId);
    if (cached) return Promise.resolve(cached);
  }

  const apiKey = getApiKey();
  if (!apiKey) return Promise.resolve({ videos: [], streams: [] });

  return withInflight(channelDataInflight, channelId, async () => {
    // Fetch 10 items to ensure a currently-live stream is captured even when
    // the channel recently uploaded several regular videos. playlistItems.list
    // charges 1 quota unit regardless of maxResults (up to 50).
    const playlistUrl = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems",
    );
    playlistUrl.searchParams.set("part", "contentDetails");
    playlistUrl.searchParams.set("playlistId", getUploadsPlaylistId(channelId));
    playlistUrl.searchParams.set("maxResults", "10");
    playlistUrl.searchParams.set("key", apiKey);

    const playlistResponse = await proxyFetch(playlistUrl, signal);
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
      storeCachedChannelData(channelId, [], []);
      return { videos: [], streams: [] };
    }

    // videos.list returns snippet.liveBroadcastContent used to split streams from videos.
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet");
    videosUrl.searchParams.set("id", videoIds.join(","));
    videosUrl.searchParams.set("key", apiKey);

    const videosResponse = await proxyFetch(videosUrl, signal);
    if (!videosResponse.ok) {
      throw new Error(
        `YouTube videos API failed: ${String(videosResponse.status)}`,
      );
    }

    const videosResult = (await videosResponse.json()) as {
      items?: VideoItem[];
    };
    const rawItems = videosResult.items ?? [];

    const toFeedItem = (item: VideoItem, isLive: boolean): FeedItem => ({
      id:
        item.id ??
        `${publisher.id}-${isLive ? "live" : (item.snippet?.publishedAt ?? new Date().toISOString())}`,
      title: item.snippet?.title ?? (isLive ? "Live stream" : "Untitled"),
      description: item.snippet?.description,
      url: item.id ? `https://www.youtube.com/watch?v=${item.id}` : "#",
      publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
      channelName: item.snippet?.channelTitle,
      source: publisher.name,
      isLive: isLive ? true : undefined,
    });

    const videos = rawItems
      .filter((item) => item.snippet?.liveBroadcastContent !== "live")
      .map((item) => toFeedItem(item, false));

    const streams = rawItems
      .filter((item) => item.snippet?.liveBroadcastContent === "live")
      .map((item) => toFeedItem(item, true));

    storeCachedChannelData(channelId, videos, streams);
    return { videos, streams };
  });
}

function isYouTubeDataCached(publishers: PublisherConfig[]): boolean {
  if (!getApiKey()) return true;

  return publishers.every((publisher) => {
    if (!publisher.youtubeChannelId && !publisher.youtubeChannelHandle) {
      return true;
    }

    const channelId =
      publisher.youtubeChannelId ?? loadCachedChannelId(publisher.id);
    if (!channelId) return false;

    return loadCachedChannelData(channelId) !== undefined;
  });
}

export async function fetchYouTubeData(
  publishers: PublisherConfig[],
  { force = false, signal }: { force?: boolean; signal?: AbortSignal } = {},
): Promise<{
  videos: FeedItem[];
  streams: FeedItem[];
  partialError?: string;
  fromCache: boolean;
}> {
  const fromCache = !force && isYouTubeDataCached(publishers);

  const apiKey = getApiKey();
  if (!apiKey) {
    return { videos: [], streams: [], fromCache };
  }

  const resolvedPublishers = await resolveChannelPublishers(publishers, signal);
  if (resolvedPublishers.length === 0) {
    return { videos: [], streams: [], fromCache };
  }

  const results = await Promise.allSettled(
    resolvedPublishers.map(({ publisher, channelId }) =>
      fetchChannelData(publisher, channelId, force, signal),
    ),
  );

  const allVideos: FeedItem[] = [];
  const allStreams: FeedItem[] = [];
  const seenIds = new Set<string>();
  let firstError: PromiseRejectedResult | undefined;
  let failedCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const v of result.value.videos) {
        if (!seenIds.has(v.id)) {
          seenIds.add(v.id);
          allVideos.push(v);
        }
      }
      for (const s of result.value.streams) {
        if (!seenIds.has(s.id)) {
          seenIds.add(s.id);
          allStreams.push(s);
        }
      }
    } else {
      console.error(result.reason);
      firstError ??= result;
      failedCount++;
    }
  }

  const videos = allVideos.sort(sortByDateDesc);
  const streams = allStreams.sort(sortByDateDesc);

  // Only throw when everything failed and there is nothing to show.
  if (videos.length === 0 && streams.length === 0 && firstError) {
    throw firstError.reason instanceof Error
      ? firstError.reason
      : new Error("YouTube API request failed.");
  }

  const partialError =
    failedCount > 0
      ? `${failedCount === 1 ? "Egy" : String(failedCount)} YouTube csatorna nem töltődött be. A sikeresen betöltött tartalmak megjelennek.`
      : undefined;

  return { videos, streams, partialError, fromCache };
}

export function clearYouTubeCaches(): void {
  channelIdCache.clear();
  channelDataCache.clear();
  channelDataInflight.clear();
  channelResolutionInflight.clear();
}
