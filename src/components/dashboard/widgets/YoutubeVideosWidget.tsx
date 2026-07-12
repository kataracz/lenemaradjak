import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard/widget-card";
import { FeedItemCard } from "@/components/dashboard/feed-item-card";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { useYouTubeData } from "@/hooks/useYouTubeData";
import { usePagination } from "@/hooks/usePagination";
import { useVideoPlayer } from "@/contexts/useVideoPlayer";
import { useContainerWidth } from "@/hooks/useContainerWidth";

export function YoutubeVideosWidget({
  publisherIds,
  bare,
}: {
  publisherIds: string[];
  bare?: boolean;
}) {
  const { videos, loading, error, refresh, refreshDisabled } =
    useYouTubeData(publisherIds);
  const { setCurrentVideo } = useVideoPlayer();
  const { ref: containerRef, isWide } = useContainerWidth();
  const { page, totalPages, paginatedItems, prevPage, nextPage, resetPage } =
    usePagination(videos, 10);

  const handleRefresh = () => {
    resetPage();
    refresh();
  };

  return (
    <DashboardCard
      title="Videók"
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
                        {new Date(item.publishedAt).toLocaleString()}
                      </span>
                    }
                  />
                </div>
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
