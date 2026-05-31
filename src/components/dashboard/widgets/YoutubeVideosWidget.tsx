import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard/widget-card";
import { FeedItemCard } from "@/components/dashboard/feed-item-card";
import { fetchYouTubeVideos } from "@/lib/fetchers/youtube";
import { useYouTubeFeed } from "@/hooks/useYouTubeFeed";

export function YoutubeVideosWidget({
  publisherIds,
}: {
  publisherIds: string[];
}) {
  const { items, loading, error, refresh, refreshDisabled } = useYouTubeFeed(
    publisherIds,
    fetchYouTubeVideos,
  );

  return (
    <DashboardCard
      title="Legfrissebb videók"
      description="A kiválasztott kiadók legújabb feltöltései."
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
            <FeedItemCard
              key={item.id}
              item={item}
              descriptionFallback="Nincs elérhető leírás."
              footer={
                <div className="flex flex-row flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{new Date(item.publishedAt).toLocaleString()}</span>
                  <span>{item.source}</span>
                </div>
              }
            />
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
