import * as React from "react";
import { fetchRSSFeed } from "@/lib/fetchers/rss";
import { publishers } from "@/lib/publisher-config";
import { useCooldown } from "@/hooks/useCooldown";
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

        const promises: Promise<FeedItem[]>[] = publisherFeeds.map(
          async ({ publisher, url }) => {
            const result = await fetchRSSFeed(url, { force });
            if (!result.fromCache) fromCache = false;
            return result.items.map((item) => ({
              ...item,
              source: publisher.name,
            }));
          },
        );

        const results = await Promise.allSettled(promises);

        const successful = results
          .filter(
            (r): r is PromiseFulfilledResult<FeedItem[]> =>
              r.status === "fulfilled",
          )
          .flatMap((r) => r.value);

        const failed = results.filter(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        );

        if (failed.length > 0) fromCache = false;

        const sorted = successful.sort(sortByDateDesc);

        if (sorted.length > 0) {
          setItems(sorted);
          if (failed.length > 0) {
            setError(partialErrorMessage(failed.length));
          }
        } else if (failed.length > 0) {
          throw failed[0].reason;
        } else {
          setItems([]);
        }
      } catch (err) {
        fromCache = false;
        setError(err instanceof Error ? err.message : String(err));
        setItems([]);
      } finally {
        setLoading(false);
        if (fromCache) resetCooldown();
      }
    },
    [filteredPublishers, getFeedUrl, partialErrorMessage, resetCooldown],
  );

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
    if (triggerRefresh()) void load(true);
  }, [triggerRefresh, load]);

  return { items, loading, error, refresh, refreshDisabled };
}
