import * as React from "react";
import { useCooldown } from "@/hooks/useCooldown";
import { useFilteredPublishers } from "@/hooks/useFilteredPublishers";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { fetchYouTubeData, isYouTubeQuotaError } from "@/lib/fetchers/youtube";
import type { FeedItem } from "@/types/dashboard";

function errorMessage(err: unknown): string {
  if (isYouTubeQuotaError(err))
    return "Elértük a YouTube napi API-kvótáját, próbáld újra később.";
  return err instanceof Error ? err.message : String(err);
}

export function useYouTubeData(publisherIds: string[]): {
  videos: FeedItem[];
  streams: FeedItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  refreshDisabled: boolean;
  hasConfiguredChannels: boolean;
  notConfigured: boolean;
} {
  const [videos, setVideos] = React.useState<FeedItem[]>([]);
  const [streams, setStreams] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notConfigured, setNotConfigured] = React.useState(false);
  const controllerRef = React.useRef<AbortController | null>(null);

  const filteredPublishers = useFilteredPublishers(publisherIds);

  const {
    disabled: refreshDisabled,
    trigger: triggerRefresh,
    reset: resetCooldown,
  } = useCooldown(60000);

  const load = React.useCallback(
    async (force = false) => {
      const controller = controllerRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchYouTubeData(filteredPublishers, {
          force,
          signal: controller?.signal,
        });
        if (controller?.signal.aborted) return;
        setVideos(result.videos);
        setStreams(result.streams);
        setError(result.partialError ?? null);
        setNotConfigured(result.notConfigured);
        if (result.fromCache) resetCooldown();
      } catch (err) {
        if (controller?.signal.aborted) return;
        console.error(err);
        setError(errorMessage(err));
        setVideos([]);
        setStreams([]);
      } finally {
        if (!controller?.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [filteredPublishers, resetCooldown],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    return () => {
      controller.abort();
    };
  }, [load]);

  const refresh = useAutoRefresh(load, triggerRefresh);

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
    notConfigured,
  };
}
