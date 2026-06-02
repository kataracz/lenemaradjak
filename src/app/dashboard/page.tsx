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
import { useDashboardPersistence } from "@/hooks/useDashboardPersistence";
import { defaultPublisherIds, publishers } from "@/lib/publisher-config";
import type { DashboardLayouts, DashboardWidgetType } from "@/types/dashboard";
import type { Layout } from "react-grid-layout";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { VideoPlayerFloatingWidget } from "@/components/dashboard/widgets/VideoPlayerFloatingWidget";
import { LiveStreamsWidget } from "@/components/dashboard/widgets/LiveStreamsWidget";

const LIVE_STREAMS_COMPACT_H = 6;

const defaultLayouts: DashboardLayouts = {
  lg: [
    { i: "liveStreams", x: 0, y: 0, w: 12, h: 14, minW: 12, minH: 5 },
    { i: "youtubeVideos", x: 0, y: 14, w: 6, h: 12, minW: 4, minH: 10 },
    { i: "podcasts", x: 0, y: 26, w: 6, h: 12, minW: 4, minH: 10 },
    { i: "articles", x: 6, y: 26, w: 6, h: 12, minW: 4, minH: 10 },
  ],
  md: [
    { i: "liveStreams", x: 0, y: 0, w: 10, h: 14, minW: 10, minH: 5 },
    { i: "youtubeVideos", x: 0, y: 14, w: 5, h: 12, minW: 4, minH: 10 },
    { i: "podcasts", x: 0, y: 26, w: 5, h: 12, minW: 4, minH: 10 },
    { i: "articles", x: 5, y: 26, w: 5, h: 12, minW: 4, minH: 10 },
  ],
  sm: [
    { i: "liveStreams", x: 0, y: 0, w: 6, h: 14 },
    { i: "youtubeVideos", x: 0, y: 14, w: 6, h: 12 },
    { i: "podcasts", x: 0, y: 28, w: 6, h: 12 },
    { i: "articles", x: 0, y: 40, w: 6, h: 12 },
  ],
  xs: [
    { i: "liveStreams", x: 0, y: 0, w: 2, h: 14 },
    { i: "youtubeVideos", x: 0, y: 14, w: 2, h: 12 },
    { i: "podcasts", x: 0, y: 28, w: 2, h: 12 },
    { i: "articles", x: 0, y: 40, w: 2, h: 12 },
  ],
  xxs: [
    { i: "liveStreams", x: 0, y: 0, w: 2, h: 14 },
    { i: "youtubeVideos", x: 0, y: 14, w: 2, h: 12 },
    { i: "podcasts", x: 0, y: 28, w: 2, h: 12 },
    { i: "articles", x: 0, y: 40, w: 2, h: 12 },
  ],
};

const breakpoints = { lg: 1280, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const publisherOptions = [{ id: "all", name: "Összes kiadó" }, ...publishers];

export default function Page() {
  const { layouts, setLayouts } = useDashboardPersistence(defaultLayouts);
  const [publisherFilter, setPublisherFilter] = React.useState<string>("all");
  const [liveStreamsHasContent, setLiveStreamsHasContent] =
    React.useState(true);

  const filteredPublisherIds = React.useMemo(() => {
    if (publisherFilter === "all") {
      return defaultPublisherIds;
    }
    return [publisherFilter];
  }, [publisherFilter]);

  const { width, containerRef, mounted } = useContainerWidth();

  const displayLayouts = React.useMemo<DashboardLayouts>(() => {
    if (liveStreamsHasContent) return layouts;
    const result: DashboardLayouts = {};
    for (const [bp, bpLayouts] of Object.entries(layouts)) {
      result[bp] = (bpLayouts ?? []).map((item) =>
        item.i === "liveStreams"
          ? { ...item, h: LIVE_STREAMS_COMPACT_H, minH: LIVE_STREAMS_COMPACT_H }
          : item,
      );
    }
    return result;
  }, [layouts, liveStreamsHasContent]);

  const handleLayoutChange = React.useCallback(
    (_layout: Layout, allLayouts: DashboardLayouts) => {
      if (!liveStreamsHasContent) {
        // Don't persist the compact height — restore liveStreams from saved layouts
        const restored: DashboardLayouts = {};
        for (const [bp, bpLayouts] of Object.entries(allLayouts)) {
          restored[bp] = (bpLayouts ?? []).map((item) => {
            if (item.i !== "liveStreams") return item;
            const prev = (layouts[bp] ?? []).find((l) => l.i === "liveStreams");
            return prev ? { ...item, h: prev.h, minH: prev.minH } : item;
          });
        }
        setLayouts(restored);
      } else {
        setLayouts(allLayouts);
      }
    },
    [liveStreamsHasContent, layouts, setLayouts],
  );

  return (
    <VideoPlayerProvider>
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2 px-4 py-4 md:gap-4 md:py-4 lg:px-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-muted/10 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Le ne maradjak</h1>
                <p className="text-sm text-muted-foreground">
                  Mi történik? Mit csinál Magyar Péter?
                </p>
              </div>
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
            <div
              ref={containerRef}
              className="rounded-3xl border border-muted/10 bg-background/80 p-1 shadow-sm"
            >
              {mounted && (
                <ResponsiveGridLayout
                  className="layout"
                  layouts={displayLayouts}
                  breakpoints={breakpoints}
                  cols={cols}
                  rowHeight={28}
                  margin={[12, 12]}
                  containerPadding={[8, 8]}
                  width={width}
                  dragConfig={{ cancel: "a, button, input, select, textarea" }}
                  onLayoutChange={handleLayoutChange}
                >
                  {(layouts.lg ?? defaultLayouts.lg ?? []).map((item) => {
                    const widgetDef = findWidgetDefinition(
                      item.i as DashboardWidgetType,
                    );
                    if (!widgetDef) {
                      return null;
                    }

                    return (
                      <div
                        key={item.i}
                        className="rounded-3xl border border-muted/10 shadow-sm"
                      >
                        {item.i === "liveStreams" ? (
                          <LiveStreamsWidget
                            publisherIds={filteredPublisherIds}
                            onHasContent={setLiveStreamsHasContent}
                          />
                        ) : (
                          <widgetDef.component
                            publisherIds={filteredPublisherIds}
                          />
                        )}
                      </div>
                    );
                  })}
                </ResponsiveGridLayout>
              )}
            </div>
          </div>
        </main>
      </div>
      <VideoPlayerFloatingWidget />
    </VideoPlayerProvider>
  );
}
