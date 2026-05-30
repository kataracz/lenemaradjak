"use client";

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DashboardCard } from "@/components/dashboard/widget-card";
import { fetchYouTubeVideos } from "@/lib/fetchers/youtube";
import { publishers } from "@/lib/publisher-config";
import type { FeedItem } from "@/types/dashboard";

export function YoutubeVideosWidget({
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

  const loadVideos = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchYouTubeVideos(filteredPublishers, 5);
      setItems(results);
    } catch (err) {
      setError((err as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filteredPublishers]);

  React.useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  return (
    <DashboardCard
      title="Legfrissebb videók"
      description="A kiválasztott kiadók legújabb feltöltései."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadVideos()}>
          Frissítés
        </Button>
      }
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Videók betöltése...
        </div>
      ) : error ? (
        <div className="grid gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive-foreground">
          <div className="font-medium">Nem sikerült betölteni a videókat</div>
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
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {item.description ?? "Nincs elérhető leírás."}
              </p>
              <Separator />
              <div className="flex flex-row flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{new Date(item.publishedAt).toLocaleString()}</span>
                <span>{item.source}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Még nincsenek elérhető videók.
        </div>
      )}
    </DashboardCard>
  );
}
