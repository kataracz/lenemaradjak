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
  const controllerRef = React.useRef<AbortController | null>(null);

  const filteredPublishers = React.useMemo(
    () => publishers.filter((p) => publisherIds.includes(p.id)),
    [publisherIds],
  );

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
        if (result.fromCache) resetCooldown();
      } catch (err) {
        if (controller?.signal.aborted) return;
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
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
    triggerRefresh();
    const timerId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [load, triggerRefresh]);

  const refresh = React.useCallback(() => {
    if (triggerRefresh()) void load(true);
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
