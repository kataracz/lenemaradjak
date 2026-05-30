import type { FeedItem, PublisherConfig } from "@/types/dashboard";
import { fetchRSSFeed } from "@/lib/fetchers/rss";

const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
const CHANNEL_ID_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const channelIdCache = new Map<string, { expires: number; id: string }>();

const getChannelCacheKey = (publisherId: string) =>
  `lenemaradjak:youtube-channel-id:${publisherId}`;

const loadCachedChannelId = (publisherId: string): string | undefined => {
  const memoryEntry = channelIdCache.get(publisherId);
  if (memoryEntry && memoryEntry.expires > Date.now()) {
    return memoryEntry.id;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const stored = window.localStorage.getItem(getChannelCacheKey(publisherId));
    if (!stored) {
      return undefined;
    }

    const parsed = JSON.parse(stored) as { expires: number; id: string };
    if (parsed.expires > Date.now() && parsed.id) {
      channelIdCache.set(publisherId, parsed);
      return parsed.id;
    }
  } catch {
    // Ignore cache errors.
  }

  return undefined;
};

const storeCachedChannelId = (publisherId: string, channelId: string) => {
  const entry = {
    expires: Date.now() + CHANNEL_ID_CACHE_TTL_MS,
    id: channelId,
  };
  channelIdCache.set(publisherId, entry);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getChannelCacheKey(publisherId),
      JSON.stringify(entry),
    );
  } catch {
    // Ignore cache errors.
  }
};

const normalizeFeedItem = (
  item: FeedItem,
  source: string,
  channelName: string,
): FeedItem => ({
  ...item,
  source,
  channelName,
});

const normalizeHandle = (handle: string) => handle.trim().replace(/^@/, "");

async function resolveYouTubeChannelId(
  publisher: PublisherConfig,
): Promise<string | undefined> {
  if (publisher.youtubeChannelId) {
    return publisher.youtubeChannelId;
  }

  if (!apiKey || !publisher.youtubeChannelHandle) {
    return undefined;
  }

  const cachedChannelId = loadCachedChannelId(publisher.id);
  if (cachedChannelId) {
    return cachedChannelId;
  }

  const query = normalizeHandle(publisher.youtubeChannelHandle);
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "id");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "channel");
  searchUrl.searchParams.set("maxResults", "1");
  searchUrl.searchParams.set("key", apiKey);

  const response = await fetch(searchUrl.toString());
  if (!response.ok) {
    return undefined;
  }

  const result = await response.json();
  const channelId = result.items?.[0]?.id?.channelId;

  if (channelId) {
    storeCachedChannelId(publisher.id, channelId);
    return channelId;
  }

  const usernameUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  usernameUrl.searchParams.set("part", "id");
  usernameUrl.searchParams.set("forUsername", query);
  usernameUrl.searchParams.set("key", apiKey);

  const usernameResponse = await fetch(usernameUrl.toString());
  if (!usernameResponse.ok) {
    return undefined;
  }

  const usernameResult = await usernameResponse.json();
  const fallbackChannelId = usernameResult.items?.[0]?.id;

  if (fallbackChannelId) {
    storeCachedChannelId(publisher.id, fallbackChannelId);
    return fallbackChannelId;
  }

  return undefined;
}

async function resolveChannelPublishers(
  publishers: PublisherConfig[],
): Promise<Array<{ publisher: PublisherConfig; channelId: string }>> {
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

export async function fetchYouTubeVideos(
  publishers: PublisherConfig[],
  maxItems = 5,
): Promise<FeedItem[]> {
  if (apiKey) {
    const resolvedPublishers = await resolveChannelPublishers(publishers);

    if (resolvedPublishers.length > 0) {
      const promises = resolvedPublishers.map(
        async ({ publisher, channelId }) => {
          const url = new URL("https://www.googleapis.com/youtube/v3/search");
          url.searchParams.set("part", "snippet");
          url.searchParams.set("channelId", channelId);
          url.searchParams.set("eventType", "completed");
          url.searchParams.set("type", "video");
          url.searchParams.set("order", "date");
          url.searchParams.set("maxResults", "10");
          url.searchParams.set("key", apiKey);

          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error(`YouTube API failed: ${response.status}`);
          }

          const result = await response.json();
          return (result.items ?? []).map((item: any) => ({
            id:
              item.id.videoId ??
              item.id.playlistId ??
              item.id.channelId ??
              `${publisher.id}-${item.snippet?.publishedAt}`,
            title: item.snippet?.title ?? "Untitled",
            description: item.snippet?.description,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
            thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
            channelName: item.snippet?.channelTitle,
            source: publisher.name,
          }));
        },
      );

      const results = await Promise.allSettled(promises);
      const videos = results
        .filter(
          (result): result is PromiseFulfilledResult<FeedItem[]> =>
            result.status === "fulfilled",
        )
        .flatMap((result) => result.value);

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
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (firstError) {
        throw firstError.reason instanceof Error
          ? firstError.reason
          : new Error("YouTube API request failed.");
      }
    }
  }

  const publisherSources = publishers.filter((publisher) =>
    Boolean(publisher.youtubeRssFeedUrl),
  );

  const result = await Promise.all(
    publisherSources.map(async (publisher) => {
      const url = publisher.youtubeRssFeedUrl!;
      const items = await fetchRSSFeed(url);
      return items.map((item) =>
        normalizeFeedItem(item, publisher.name, publisher.name),
      );
    }),
  );

  return result
    .flat()
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, maxItems);
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

  const promises = resolvedPublishers.map(async ({ publisher, channelId }) => {
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
      throw new Error(`YouTube Live API failed: ${response.status}`);
    }

    const result = await response.json();
    return (result.items ?? []).map((item: any) => ({
      id: item.id.videoId ?? `${publisher.id}-${item.snippet?.publishedAt}`,
      title: item.snippet?.title ?? "Live stream",
      description: item.snippet?.description,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
      channelName: item.snippet?.channelTitle,
      source: publisher.name,
      isLive: true,
    }));
  });

  const results = await Promise.allSettled(promises);
  const streams = results
    .filter(
      (result): result is PromiseFulfilledResult<FeedItem[]> =>
        result.status === "fulfilled",
    )
    .flatMap((result) => result.value);

  if (streams.length > 0) {
    return streams
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )
      .slice(0, maxItems);
  }

  const firstError = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (firstError) {
    throw firstError.reason instanceof Error
      ? firstError.reason
      : new Error("YouTube Live API request failed.");
  }

  return [];
}
