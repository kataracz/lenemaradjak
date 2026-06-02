import * as React from "react";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard/widget-card";
import { FeedItemCard } from "@/components/dashboard/feed-item-card";
import { fetchYouTubeLiveStreams } from "@/lib/fetchers/youtube";
import { useYouTubeFeed } from "@/hooks/useYouTubeFeed";
import { useVideoPlayer } from "@/contexts/useVideoPlayer";

export function LiveStreamsWidget({
  publisherIds,
  onHasContent,
}: {
  publisherIds: string[];
  onHasContent?: (hasContent: boolean) => void;
}) {
  const {
    items,
    loading,
    error,
    refresh,
    refreshDisabled,
    filteredPublishers,
  } = useYouTubeFeed(publisherIds, fetchYouTubeLiveStreams);
  const { setCurrentVideo } = useVideoPlayer();

  const hasYouTubeApiKey = Boolean(import.meta.env.VITE_YOUTUBE_API_KEY);
  const hasChannelHandles = React.useMemo(
    () =>
      filteredPublishers.some(
        (publisher) =>
          publisher.youtubeChannelId ?? publisher.youtubeChannelHandle,
      ),
    [filteredPublishers],
  );

  React.useEffect(() => {
    onHasContent?.(items.length > 0 || loading || error !== null);
  }, [items.length, loading, error, onHasContent]);

  return (
    <DashboardCard
      title="Élők"
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
        <div className="divide-y divide-border/60">
          {items.map((item) => (
            <FeedItemCard
              key={item.id}
              item={item}
              onPlay={() => {
                setCurrentVideo(item);
              }}
              footer={
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <span>Élőben</span>
                  <span>{new Date(item.publishedAt).toLocaleString()}</span>
                </div>
              }
            />
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
