"use client";

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DashboardCard } from "@/components/dashboard/widget-card";
import { fetchRSSFeed } from "@/lib/fetchers/rss";
import useCooldown from "@/hooks/useCooldown";
import { publishers } from "@/lib/publisher-config";
import type { FeedItem } from "@/types/dashboard";

export function ArticlesWidget({ publisherIds }: { publisherIds: string[] }) {
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filteredPublishers = React.useMemo(
    () => publishers.filter((publisher) => publisherIds.includes(publisher.id)),
    [publisherIds],
  );

  const loadArticles = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const urls = filteredPublishers
        .map((publisher) => publisher.articleFeedUrl)
        .filter((url): url is string => Boolean(url));

      const promises: Promise<FeedItem[]>[] = urls.map(async (url) => {
        const publisher = filteredPublishers.find(
          (publisher) => publisher.articleFeedUrl === url,
        );
        const items = await fetchRSSFeed(url);
        return items.map((item) => ({
          ...item,
          source: publisher?.name ?? url,
        }));
      });

      const results = await Promise.allSettled(promises);

      const successfulFeeds = results
        .filter(
          (result): result is PromiseFulfilledResult<FeedItem[]> =>
            result.status === "fulfilled",
        )
        .flatMap((result) => result.value);

      const failedFeeds = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );

      const sortedItems = successfulFeeds
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime(),
        )
        .slice(0, 5);

      if (sortedItems.length > 0) {
        setItems(sortedItems);
        if (failedFeeds.length > 0) {
          setError(
            failedFeeds.length === 1
              ? "Egy RSS csatorna nem töltődött be. A sikeres cikkek továbbra is megjelennek."
              : `${String(failedFeeds.length)} RSS csatorna nem töltődött be. A sikeres cikkek továbbra is megjelennek.`,
          );
        }
      } else if (failedFeeds.length > 0) {
        throw failedFeeds[0].reason;
      } else {
        setItems([]);
      }
    } catch (err) {
      setError((err as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filteredPublishers]);

  React.useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadArticles();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadArticles]);

  const { disabled: refreshDisabled, trigger: triggerRefresh } =
    useCooldown(10000);

  return (
    <DashboardCard
      title="Legfrissebb cikkek"
      description="A kiválasztott kiadók friss cikkcímei."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (triggerRefresh()) void loadArticles();
          }}
          disabled={refreshDisabled}
        >
          Frissítés
        </Button>
      }
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Cikkek betöltése...
        </div>
      ) : (
        <>
          {error ? (
            <div className="grid gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive-foreground">
              <div className="font-medium">
                Nem sikerült betölteni az összes cikket
              </div>
              <div>{error}</div>
            </div>
          ) : null}
          {items.length ? (
            <div className="grid gap-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-2 rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-semibold underline-offset-4 transition hover:underline"
                      >
                        {item.title}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {item.source}
                      </p>
                    </div>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                      className="size-5 text-muted-foreground"
                    />
                  </div>
                  <Separator />
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.description ?? "No preview available."}
                  </p>
                </article>
              ))}
            </div>
          ) : !error ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Még nincsenek elérhető cikkek.
            </div>
          ) : null}
        </>
      )}
    </DashboardCard>
  );
}
