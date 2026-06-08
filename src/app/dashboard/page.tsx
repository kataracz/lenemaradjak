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

const breakpoints = { lg: 1280, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const publisherOptions = [{ id: "all", name: "Összes kiadó" }, ...publishers];

export default function Page() {
  const { layouts, setLayouts } = useDashboardPersistence(defaultLayouts);
  const [publisherFilter, setPublisherFilter] = React.useState<string>("all");

  const filteredPublisherIds = React.useMemo(() => {
    if (publisherFilter === "all") {
      return defaultPublisherIds;
    }
    return [publisherFilter];
  }, [publisherFilter]);

  const { width, containerRef, mounted } = useContainerWidth();

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
                  layouts={layouts}
                  breakpoints={breakpoints}
                  cols={cols}
                  rowHeight={28}
                  margin={[12, 12]}
                  containerPadding={[8, 8]}
                  width={width}
                  dragConfig={{
                    handle: ".drag-handle",
                    cancel: "a, button, input, select, textarea",
                  }}
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
                        <widgetDef.component
                          publisherIds={filteredPublisherIds}
                        />
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
