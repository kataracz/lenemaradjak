import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard/widget-card";
import { FeedItemCard } from "@/components/dashboard/feed-item-card";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { useYouTubeData } from "@/hooks/useYouTubeData";
import { usePagination } from "@/hooks/usePagination";
import { useVideoPlayer } from "@/contexts/useVideoPlayer";
import { useContainerWidth } from "@/hooks/useContainerWidth";

export function LiveStreamsWidget({
  publisherIds,
}: {
  publisherIds: string[];
}) {
  const {
    streams,
    loading,
    error,
    refresh,
    refreshDisabled,
    hasConfiguredChannels,
  } = useYouTubeData(publisherIds);
  const { setCurrentVideo } = useVideoPlayer();
  const { ref: containerRef, isWide } = useContainerWidth();
  const { page, totalPages, paginatedItems, prevPage, nextPage, resetPage } =
    usePagination(streams, 10);

  const hasYouTubeApiKey = Boolean(import.meta.env.VITE_YOUTUBE_API_KEY);

  const handleRefresh = () => {
    resetPage();
    refresh();
  };

  return (
    <DashboardCard
      title="Élők"
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
          Élő közvetítések ellenőrzése...
        </div>
      ) : (
        <>
          {error ? (
            <div className="grid gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive-foreground">
              <div className="font-medium">
                Nem sikerült betölteni az élő közvetítéseket
              </div>
              <div>{error}</div>
            </div>
          ) : null}
          {streams.length ? (
            <div
              ref={containerRef}
              className={
                isWide
                  ? "flex flex-row gap-3 overflow-x-auto px-4 pb-3"
                  : "divide-y divide-border/60"
              }
            >
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  className={isWide ? "w-48 shrink-0" : undefined}
                >
                  <FeedItemCard
                    item={item}
                    compact={!isWide}
                    onPlay={() => {
                      setCurrentVideo(item);
                    }}
                    footer={
                      <span className="text-xs text-muted-foreground">
                        Élőben · {new Date(item.publishedAt).toLocaleString()}
                      </span>
                    }
                  />
                </div>
              ))}
            </div>
          ) : !error ? (
            !hasYouTubeApiKey || !hasConfiguredChannels ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Az élő közvetítés-felismerés nem aktív. Add meg a
                `VITE_YOUTUBE_API_KEY` értékét és ellenőrizd a kiadók
                YouTube-csatorna adatait.
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                A kiválasztott kiadóknál nem találtunk élő közvetítést. Próbáld
                újra.
              </div>
            )
          ) : null}
        </>
      )}
    </DashboardCard>
  );
}
