import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { findWidgetDefinition } from "@/components/dashboard/widget-registry";
import { MobileDashboardTabs } from "@/components/dashboard/mobile-dashboard-tabs";
import { WidgetErrorBoundary } from "@/components/dashboard/widget-error-boundary";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { defaultPublisherIds, publishers } from "@/lib/publisher-config";
import { MOBILE_BREAKPOINT } from "@/lib/breakpoints";
import type { DashboardLayouts } from "@/types/dashboard";
import type { Layout } from "react-grid-layout";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { VideoPlayerFloatingWidget } from "@/components/dashboard/widgets/VideoPlayerFloatingWidget";

const defaultLayouts: DashboardLayouts = {
  lg: [
    { i: "liveStreams", x: 0, y: 0, w: 6, h: 10, minW: 3, minH: 4 },
    { i: "youtubeVideos", x: 6, y: 0, w: 6, h: 12, minW: 4, minH: 10 },
    { i: "podcasts", x: 0, y: 10, w: 6, h: 12, minW: 4, minH: 10 },
    { i: "articles", x: 6, y: 12, w: 6, h: 12, minW: 4, minH: 10 },
  ],
  md: [
    { i: "liveStreams", x: 0, y: 0, w: 5, h: 10, minW: 3, minH: 4 },
    { i: "youtubeVideos", x: 5, y: 0, w: 5, h: 12, minW: 4, minH: 10 },
    { i: "podcasts", x: 0, y: 10, w: 5, h: 12, minW: 4, minH: 10 },
    { i: "articles", x: 5, y: 12, w: 5, h: 12, minW: 4, minH: 10 },
  ],
  sm: [
    { i: "liveStreams", x: 0, y: 0, w: 3, h: 10, minW: 3, minH: 4 },
    { i: "youtubeVideos", x: 3, y: 0, w: 3, h: 12 },
    { i: "podcasts", x: 0, y: 10, w: 6, h: 12 },
    { i: "articles", x: 0, y: 22, w: 6, h: 12 },
  ],
  xs: [
    { i: "liveStreams", x: 0, y: 0, w: 4, h: 10, minW: 2, minH: 4 },
    { i: "youtubeVideos", x: 0, y: 10, w: 4, h: 12 },
    { i: "podcasts", x: 0, y: 22, w: 4, h: 12 },
    { i: "articles", x: 0, y: 34, w: 4, h: 12 },
  ],
  xxs: [
    { i: "liveStreams", x: 0, y: 0, w: 2, h: 10, minW: 2, minH: 4 },
    { i: "youtubeVideos", x: 0, y: 10, w: 2, h: 12 },
    { i: "podcasts", x: 0, y: 22, w: 2, h: 12 },
    { i: "articles", x: 0, y: 34, w: 2, h: 12 },
  ],
};

const breakpoints = {
  lg: 1280,
  md: 996,
  sm: MOBILE_BREAKPOINT,
  xs: 480,
  xxs: 0,
};
const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const GRID_MARGIN = {
  lg: [12, 12],
  md: [12, 12],
  sm: [12, 12],
  xs: [8, 8],
  xxs: [8, 8],
} as const;
const GRID_CONTAINER_PADDING: readonly [number, number] = [0, 0];
const DRAG_CONFIG = {
  handle: ".drag-handle",
  cancel: "a, button, input, select, textarea",
};
const publisherOptions = [{ id: "all", name: "Összes kiadó" }, ...publishers];

export default function Page() {
  const { layouts, setLayouts, publisherFilter, setPublisherFilter } =
    useDashboardPreferences({
      layouts: defaultLayouts,
      publisherFilter: "all",
    });

  const filteredPublisherIds = React.useMemo(() => {
    if (publisherFilter === "all") {
      return defaultPublisherIds;
    }
    return [publisherFilter];
  }, [publisherFilter]);

  const { width, containerRef, mounted } = useContainerWidth();
  const isMobile = useMediaQuery(
    `(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`,
  );

  const handleLayoutChange = React.useCallback(
    (_layout: Layout, allLayouts: DashboardLayouts) => {
      setLayouts(allLayouts);
    },
    [setLayouts],
  );

  return (
    <VideoPlayerProvider>
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2 px-3 py-3 md:gap-4 md:px-4 md:py-4 lg:px-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-muted/10 bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div>
                <h1 className="text-2xl font-semibold">Le ne maradjak!</h1>
                <p className="text-sm text-muted-foreground">
                  Hírek, élő adások, videók és podcastok egy helyen, hogy le ne
                  maradj!
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Select
                  value={publisherFilter}
                  onValueChange={setPublisherFilter}
                >
                  <SelectTrigger className="w-56" size="sm">
                    <SelectValue placeholder="Válassz kiadót" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {publisherOptions.map((publisher) => (
                        <SelectItem key={publisher.id} value={publisher.id}>
                          {publisher.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isMobile ? (
              <MobileDashboardTabs publisherIds={filteredPublisherIds} />
            ) : (
              <div
                ref={containerRef}
                className="rounded-3xl border border-muted/10"
              >
                {mounted && (
                  <ResponsiveGridLayout
                    className="layout"
                    layouts={layouts}
                    breakpoints={breakpoints}
                    cols={cols}
                    rowHeight={28}
                    margin={GRID_MARGIN}
                    containerPadding={GRID_CONTAINER_PADDING}
                    width={width}
                    dragConfig={DRAG_CONFIG}
                    onLayoutChange={handleLayoutChange}
                  >
                    {(layouts.lg ?? defaultLayouts.lg ?? []).map((item) => {
                      const widgetDef = findWidgetDefinition(item.i);
                      if (!widgetDef) {
                        return null;
                      }

                      return (
                        <div
                          key={item.i}
                          className="rounded-3xl border border-muted/10 shadow-sm"
                        >
                          <WidgetErrorBoundary title={widgetDef.title}>
                            <widgetDef.component
                              publisherIds={filteredPublisherIds}
                            />
                          </WidgetErrorBoundary>
                        </div>
                      );
                    })}
                  </ResponsiveGridLayout>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <VideoPlayerFloatingWidget />
    </VideoPlayerProvider>
  );
}
