import * as React from "react";
import { fetchRSSFeed } from "@/lib/fetchers/rss";
import { useCooldown } from "@/hooks/useCooldown";
import { useFilteredPublishers } from "@/hooks/useFilteredPublishers";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { settleParallel } from "@/lib/parallel-fetch";
import { sortByDateDesc } from "@/lib/utils";
import type { FeedItem, PublisherConfig } from "@/types/dashboard";

export function useRSSFeed(
  publisherIds: string[],
  getFeedUrl: (publisher: PublisherConfig) => string | undefined,
  partialErrorMessage: (count: number) => string,
): {
  items: FeedItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  refreshDisabled: boolean;
} {
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);

  const filteredPublishers = useFilteredPublishers(publisherIds);

  const {
    disabled: refreshDisabled,
    trigger: triggerRefresh,
    reset: resetCooldown,
  } = useCooldown(60000);

  const load = React.useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      let fromCache = true;
      try {
        const publisherFeeds = filteredPublishers
          .map((p) => ({ publisher: p, url: getFeedUrl(p) }))
          .filter(
            (
              entry,
            ): entry is { publisher: typeof entry.publisher; url: string } =>
              Boolean(entry.url),
          );

        const { fulfilled, failedCount, firstError } = await settleParallel(
          publisherFeeds,
          async ({ publisher, url }) => {
            const result = await fetchRSSFeed(url, { force });
            if (!result.fromCache) fromCache = false;
            return result.items.map((item) => ({
              ...item,
              source: publisher.name,
            }));
          },
        );
        if (!mountedRef.current) return;

        if (failedCount > 0) fromCache = false;

        const sorted = fulfilled.flat().sort(sortByDateDesc);

        if (sorted.length > 0) {
          setItems(sorted);
          if (failedCount > 0) {
            setError(partialErrorMessage(failedCount));
          }
        } else if (failedCount > 0) {
          throw firstError;
        } else {
          setItems([]);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        fromCache = false;
        setError(err instanceof Error ? err.message : String(err));
        setItems([]);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          if (fromCache) resetCooldown();
        }
      }
    },
    [filteredPublishers, getFeedUrl, partialErrorMessage, resetCooldown],
  );

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useAutoRefresh(load, triggerRefresh);

  return { items, loading, error, refresh, refreshDisabled };
}
