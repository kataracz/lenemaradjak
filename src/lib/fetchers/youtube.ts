import type { FeedItem, PublisherConfig } from "@/types/dashboard";
import { sortByDateDesc } from "@/lib/utils";
import { settleParallel } from "@/lib/parallel-fetch";
import { resolveChannelPublishers } from "@/lib/fetchers/youtube-channel-resolution";
import {
  fetchChannelData,
  isYouTubeDataCached,
} from "@/lib/fetchers/youtube-videos";
import { clearYouTubeCacheState } from "@/lib/fetchers/youtube-cache";
import {
  isYoutubeUnavailable,
  setYoutubeUnavailable,
} from "@/lib/fetchers/youtube-errors";

export {
  YouTubeQuotaError,
  isYouTubeQuotaError,
} from "@/lib/fetchers/youtube-errors";

export async function fetchYouTubeData(
  publishers: PublisherConfig[],
  { force = false, signal }: { force?: boolean; signal?: AbortSignal } = {},
): Promise<{
  videos: FeedItem[];
  streams: FeedItem[];
  partialError?: string;
  fromCache: boolean;
  notConfigured: boolean;
}> {
  const fromCache = !force && isYouTubeDataCached(publishers);

  if (isYoutubeUnavailable()) {
    return { videos: [], streams: [], fromCache, notConfigured: true };
  }

  const resolvedPublishers = await resolveChannelPublishers(publishers, signal);
  if (resolvedPublishers.length === 0) {
    return {
      videos: [],
      streams: [],
      fromCache,
      notConfigured: isYoutubeUnavailable(),
    };
  }

  const { fulfilled, failedCount, firstError } = await settleParallel(
    resolvedPublishers,
    ({ publisher, channelId }) =>
      fetchChannelData(publisher, channelId, force, signal),
  );

  const allVideos: FeedItem[] = [];
  const allStreams: FeedItem[] = [];
  const seenIds = new Set<string>();

  for (const { videos, streams } of fulfilled) {
    for (const v of videos) {
      if (!seenIds.has(v.id)) {
        seenIds.add(v.id);
        allVideos.push(v);
      }
    }
    for (const s of streams) {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        allStreams.push(s);
      }
    }
  }

  const videos = allVideos.sort(sortByDateDesc);
  const streams = allStreams.sort(sortByDateDesc);

  if (videos.length === 0 && streams.length === 0 && failedCount > 0) {
    throw firstError instanceof Error
      ? firstError
      : new Error("YouTube API request failed.");
  }

  const partialError =
    failedCount > 0
      ? `${failedCount === 1 ? "Egy" : String(failedCount)} YouTube csatorna nem töltődött be. A sikeresen betöltött tartalmak megjelennek.`
      : undefined;

  return {
    videos,
    streams,
    partialError,
    fromCache,
    notConfigured: isYoutubeUnavailable(),
  };
}

export function clearYouTubeCaches(): void {
  clearYouTubeCacheState();
  setYoutubeUnavailable(false);
}
