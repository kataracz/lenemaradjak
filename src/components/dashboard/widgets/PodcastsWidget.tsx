import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard/widget-card";
import { FeedItemCard } from "@/components/dashboard/feed-item-card";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { useRSSFeed } from "@/hooks/useRSSFeed";
import { usePagination } from "@/hooks/usePagination";
import type { PublisherConfig } from "@/types/dashboard";

const getPodcastFeedUrl = (p: PublisherConfig) => p.podcastFeedUrl;

const getPartialError = (count: number) =>
  count === 1
    ? "Egy RSS csatorna nem töltődött be. A sikeres epizódok továbbra is megjelennek."
    : `${String(count)} RSS csatorna nem töltődött be. A sikeres epizódok továbbra is megjelennek.`;

export function PodcastsWidget({
  publisherIds,
  bare,
}: {
  publisherIds: string[];
  bare?: boolean;
}) {
  const { items, loading, error, refresh, refreshDisabled } = useRSSFeed(
    publisherIds,
    getPodcastFeedUrl,
    getPartialError,
  );
  const { page, totalPages, paginatedItems, prevPage, nextPage, resetPage } =
    usePagination(items, 10);

  const handleRefresh = () => {
    resetPage();
    refresh();
  };

  return (
    <DashboardCard
      title="Podcastok"
      bare={bare}
      actions={
        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPrev={prevPage}
              onNext={nextPage}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshDisabled}
            className="cursor-pointer"
          >
            Frissítés
          </Button>
        </div>
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
              {paginatedItems.map((item) => (
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
