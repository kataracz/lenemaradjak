import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard/widget-card";
import { FeedItemCard } from "@/components/dashboard/feed-item-card";
import { useRSSFeed } from "@/hooks/useRSSFeed";
import type { PublisherConfig } from "@/types/dashboard";

const getPodcastFeedUrl = (p: PublisherConfig) => p.podcastFeedUrl;

const getPartialError = (count: number) =>
  count === 1
    ? "Egy RSS csatorna nem töltődött be. A sikeres epizódok továbbra is megjelennek."
    : `${String(count)} RSS csatorna nem töltődött be. A sikeres epizódok továbbra is megjelennek.`;

export function PodcastsWidget({ publisherIds }: { publisherIds: string[] }) {
  const { items, loading, error, refresh, refreshDisabled } = useRSSFeed(
    publisherIds,
    getPodcastFeedUrl,
    getPartialError,
  );

  return (
    <DashboardCard
      title="Podcastok"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={refreshDisabled}
        >
          Frissítés
        </Button>
      }
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Podcast epizódok betöltése...
        </div>
      ) : (
        <>
          {error ? (
            <div className="grid gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive-foreground">
              <div className="font-medium">
                Nem sikerült betölteni az összes podcastot
              </div>
              <div>{error}</div>
            </div>
          ) : null}
          {items.length ? (
            <div className="divide-y divide-border/60">
              {items.map((item) => (
                <FeedItemCard
                  key={item.id}
                  item={item}
                  descriptionFallback="Nem érhető el epizód-összefoglaló."
                />
              ))}
            </div>
          ) : !error ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Nincsenek elérhető podcast epizódok.
            </div>
          ) : null}
        </>
      )}
    </DashboardCard>
  );
}
