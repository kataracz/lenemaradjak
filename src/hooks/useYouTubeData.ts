import * as React from "react";
import { publishers } from "@/lib/publisher-config";
import { useCooldown } from "@/hooks/useCooldown";
import { fetchYouTubeData } from "@/lib/fetchers/youtube";
import type { FeedItem } from "@/types/dashboard";

export function useYouTubeData(publisherIds: string[]): {
  videos: FeedItem[];
  streams: FeedItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  refreshDisabled: boolean;
  hasConfiguredChannels: boolean;
} {
  const [videos, setVideos] = React.useState<FeedItem[]>([]);
  const [streams, setStreams] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filteredPublishers = React.useMemo(
    () => publishers.filter((p) => publisherIds.includes(p.id)),
    [publisherIds],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchYouTubeData(filteredPublishers);
      setVideos(result.videos);
      setStreams(result.streams);
      setError(result.partialError ?? null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setVideos([]);
      setStreams([]);
    } finally {
      setLoading(false);
    }
  }, [filteredPublishers]);

  const { disabled: refreshDisabled, trigger: triggerRefresh } =
    useCooldown(60000);

  React.useEffect(() => {
    triggerRefresh();
    const timerId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [load, triggerRefresh]);

  const refresh = React.useCallback(() => {
    if (triggerRefresh()) void load();
  }, [triggerRefresh, load]);

  const hasConfiguredChannels = React.useMemo(
    () =>
      filteredPublishers.some(
        (p) => p.youtubeChannelId ?? p.youtubeChannelHandle,
      ),
    [filteredPublishers],
  );

  return {
    videos,
    streams,
    loading,
    error,
    refresh,
    refreshDisabled,
    hasConfiguredChannels,
  };
}
