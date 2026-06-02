import * as React from "react";
import { fetchRSSFeed } from "@/lib/fetchers/rss";
import { publishers } from "@/lib/publisher-config";
import { useCooldown } from "@/hooks/useCooldown";
import type { FeedItem, PublisherConfig } from "@/types/dashboard";

export function useRSSFeed(
  publisherIds: string[],
  getFeedUrl: (publisher: PublisherConfig) => string | undefined,
  partialErrorMessage: (count: number) => string,
) {
  const [items, setItems] = React.useState<FeedItem[]>([]);
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
          const feedItems = await fetchRSSFeed(url);
          return feedItems.map((item) => ({
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

      const sorted = successful
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime(),
        )
        .slice(0, 5);

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
      setError(err instanceof Error ? err.message : String(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filteredPublishers, getFeedUrl, partialErrorMessage]);

  React.useEffect(() => {
    const timerId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [load]);

  const { disabled: refreshDisabled, trigger: triggerRefresh } =
    useCooldown(10000);

  const refresh = React.useCallback(() => {
    if (triggerRefresh()) void load();
  }, [triggerRefresh, load]);

  return { items, loading, error, refresh, refreshDisabled };
}
