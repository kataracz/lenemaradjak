import type { FeedItem, PublisherConfig } from "@/types/dashboard";
import { proxyFetch } from "@/lib/fetchers/youtube-http";
import {
  youtubeApiError,
  isNotConfiguredResponse,
  isYoutubeUnavailable,
  setYoutubeUnavailable,
} from "@/lib/fetchers/youtube-errors";
import {
  withInflight,
  channelDataInflight,
  loadCachedChannelId,
  loadCachedChannelData,
  storeCachedChannelData,
} from "@/lib/fetchers/youtube-cache";

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

const getUploadsPlaylistId = (channelId: string) => "UU" + channelId.slice(2);

export function fetchChannelData(
  publisher: PublisherConfig,
  channelId: string,
  force = false,
  signal?: AbortSignal,
): Promise<{ videos: FeedItem[]; streams: FeedItem[] }> {
  if (!force) {
    const cached = loadCachedChannelData(channelId);
    if (cached) return Promise.resolve(cached);
  }

  if (isYoutubeUnavailable())
    return Promise.resolve({ videos: [], streams: [] });

  return withInflight(channelDataInflight, channelId, async () => {
    // Fetch 10 so a live stream is still caught behind a few recent uploads (1 quota unit either way).
    const playlistUrl = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems",
    );
    playlistUrl.searchParams.set("part", "contentDetails");
    playlistUrl.searchParams.set("playlistId", getUploadsPlaylistId(channelId));
    playlistUrl.searchParams.set("maxResults", "10");

    const playlistResponse = await proxyFetch(playlistUrl, signal);
    if (isNotConfiguredResponse(playlistResponse)) {
      setYoutubeUnavailable(true);
      return { videos: [], streams: [] };
    }
    if (!playlistResponse.ok) {
      throw await youtubeApiError(
        playlistResponse,
        "YouTube playlistItems API",
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

    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet");
    videosUrl.searchParams.set("id", videoIds.join(","));

    const videosResponse = await proxyFetch(videosUrl, signal);
    if (!videosResponse.ok) {
      throw await youtubeApiError(videosResponse, "YouTube videos API");
    }

    const videosResult = (await videosResponse.json()) as {
      items?: VideoItem[];
    };
    const rawItems = videosResult.items ?? [];

    const toFeedItem = (item: VideoItem, isLive: boolean): FeedItem => {
      const { id, snippet } = item;
      const publishedAt = snippet?.publishedAt ?? new Date().toISOString();
      return {
        id: id ?? `${publisher.id}-${isLive ? "live" : publishedAt}`,
        title: snippet?.title ?? (isLive ? "Live stream" : "Untitled"),
        description: snippet?.description,
        url: id ? `https://www.youtube.com/watch?v=${id}` : "#",
        publishedAt,
        thumbnailUrl: snippet?.thumbnails?.medium?.url,
        channelName: snippet?.channelTitle,
        source: publisher.name,
        isLive: isLive ? true : undefined,
      };
    };

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

export function isYouTubeDataCached(publishers: PublisherConfig[]): boolean {
  if (isYoutubeUnavailable()) return true;

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
