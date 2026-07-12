import type { FeedItem } from "@/types/dashboard";

const CHANNEL_ID_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const channelIdCache = new Map<string, { expires: number; id: string }>();
export const channelResolutionInflight = new Map<
  string,
  Promise<string | undefined>
>();

const YOUTUBE_RESULT_TTL_MS = 15 * 60 * 1000;
const channelDataCache = new Map<
  string,
  { expires: number; videos: FeedItem[]; streams: FeedItem[] }
>();
export const channelDataInflight = new Map<
  string,
  Promise<{ videos: FeedItem[]; streams: FeedItem[] }>
>();

export function withInflight<T>(
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

export const loadCachedChannelId = (
  publisherId: string,
): string | undefined => {
  const key = getChannelCacheKey(publisherId);
  return loadFromCache<{ id: string }>(channelIdCache, key)?.id;
};

export const storeCachedChannelId = (
  publisherId: string,
  channelId: string,
) => {
  saveToCache(
    channelIdCache,
    getChannelCacheKey(publisherId),
    CHANNEL_ID_CACHE_TTL_MS,
    {
      id: channelId,
    },
  );
};

export const loadCachedChannelData = (
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

export const storeCachedChannelData = (
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

export function clearYouTubeCacheState(): void {
  channelIdCache.clear();
  channelDataCache.clear();
  channelDataInflight.clear();
  channelResolutionInflight.clear();
}
