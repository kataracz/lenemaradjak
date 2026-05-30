"use client";

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DashboardCard } from "@/components/dashboard/widget-card";
import { fetchYouTubeLiveStreams } from "@/lib/fetchers/youtube";
import { publishers } from "@/lib/publisher-config";
import useCooldown from "@/hooks/useCooldown";
import type { FeedItem } from "@/types/dashboard";

export function LiveStreamsWidget({
  publisherIds,
}: {
  publisherIds: string[];
}) {
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filteredPublishers = React.useMemo(
    () => publishers.filter((publisher) => publisherIds.includes(publisher.id)),
    [publisherIds],
  );

  const hasYouTubeApiKey = Boolean(import.meta.env.VITE_YOUTUBE_API_KEY);
  const hasChannelHandles = React.useMemo(
    () =>
      filteredPublishers.some(
        (publisher) =>
          publisher.youtubeChannelId ?? publisher.youtubeChannelHandle,
      ),
    [filteredPublishers],
  );

  const loadLiveStreams = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchYouTubeLiveStreams(filteredPublishers, 5);
      setItems(results);
    } catch (err) {
      setError((err as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filteredPublishers]);

  React.useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadLiveStreams();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadLiveStreams]);

  const { disabled: refreshDisabled, trigger: triggerRefresh } =
    useCooldown(10000);

  return (
    <DashboardCard
      title="Élő közvetítések"
      description="Élő vagy közelgő adások a kiválasztott kiadóktól, ha a YouTube API elérhető."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (triggerRefresh()) void loadLiveStreams();
          }}
          disabled={refreshDisabled}
        >
          Frissítés
        </Button>
      }
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Élő közvetítések ellenőrzése...
        </div>
      ) : error ? (
        <div className="grid gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive-foreground">
          <div className="font-medium">
            Nem sikerült betölteni az élő közvetítéseket
          </div>
          <div>{error}</div>
        </div>
      ) : items.length ? (
        <div className="grid gap-4">
          {items.map((item) => (
            <article key={item.id} className="grid gap-2 rounded-lg border p-4">
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
                    {item.channelName ?? item.source}
                  </p>
                </div>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  className="size-5 text-muted-foreground"
                />
              </div>
              <Separator />
              <div className="grid gap-2 text-sm text-muted-foreground">
                <span>Élőben</span>
                <span>{new Date(item.publishedAt).toLocaleString()}</span>
              </div>
            </article>
          ))}
        </div>
      ) : !hasYouTubeApiKey || !hasChannelHandles ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Az élő közvetítés-felismerés nem aktív. Add meg a
          `VITE_YOUTUBE_API_KEY` értékét és ellenőrizd a kiadók YouTube-csatorna
          adatait.
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          A kiválasztott kiadóknál nem találtunk élő közvetítést. Próbáld újra.
        </div>
      )}
    </DashboardCard>
  );
}
