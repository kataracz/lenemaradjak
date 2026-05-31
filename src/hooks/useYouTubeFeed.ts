import * as React from "react";
import { publishers } from "@/lib/publisher-config";
import { useCooldown } from "@/hooks/useCooldown";
import type { FeedItem, PublisherConfig } from "@/types/dashboard";

export function useYouTubeFeed(
  publisherIds: string[],
  fetcher: (publishers: PublisherConfig[], limit: number) => Promise<FeedItem[]>,
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
      const results = await fetcher(filteredPublishers, 5);
      setItems(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filteredPublishers, fetcher]);

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

  return { items, loading, error, refresh, refreshDisabled, filteredPublishers };
}
