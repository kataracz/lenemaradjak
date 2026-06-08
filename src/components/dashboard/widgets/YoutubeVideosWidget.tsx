import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard/widget-card";
import { FeedItemCard } from "@/components/dashboard/feed-item-card";
import { useYouTubeData } from "@/hooks/useYouTubeData";
import { useVideoPlayer } from "@/contexts/useVideoPlayer";

export function YoutubeVideosWidget({
  publisherIds,
}: {
  publisherIds: string[];
}) {
  const { videos, loading, error, refresh, refreshDisabled } =
    useYouTubeData(publisherIds);
  const { setCurrentVideo } = useVideoPlayer();

  return (
    <DashboardCard
      title="Videók"
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
      ) : (
        <>
          {error ? (
            <div className="grid gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive-foreground">
              <div className="font-medium">
                Nem sikerült betölteni a videókat
              </div>
              <div>{error}</div>
            </div>
          ) : null}
          {videos.length ? (
            <div className="divide-y divide-border/60">
              {videos.map((item) => (
                <FeedItemCard
                  key={item.id}
                  item={item}
                  compact
                  onPlay={() => {
                    setCurrentVideo(item);
                  }}
                  footer={
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.publishedAt).toLocaleString()}
                    </span>
                  }
                />
              ))}
            </div>
          ) : !error ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Még nincsenek elérhető videók.
            </div>
          ) : null}
        </>
      )}
    </DashboardCard>
  );
}
