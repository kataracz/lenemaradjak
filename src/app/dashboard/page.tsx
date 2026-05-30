"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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

const defaultLayouts: DashboardLayouts = {
  lg: [
    { i: "liveStreams", x: 0, y: 0, w: 12, h: 14, minW: 12, minH: 12 },
    { i: "youtubeVideos", x: 0, y: 14, w: 6, h: 12, minW: 4, minH: 10 },
    { i: "podcasts", x: 0, y: 26, w: 6, h: 12, minW: 4, minH: 10 },
    { i: "articles", x: 6, y: 26, w: 6, h: 12, minW: 4, minH: 10 },
  ],
  md: [
    { i: "liveStreams", x: 0, y: 0, w: 10, h: 14, minW: 10, minH: 12 },
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

export default function Page() {
  const { layouts, setLayouts } = useDashboardPersistence(defaultLayouts);
  const [publisherFilter, setPublisherFilter] = React.useState<string>("all");

  const filteredPublisherIds = React.useMemo(() => {
    if (publisherFilter === "all") {
      return defaultPublisherIds;
    }
    return [publisherFilter];
  }, [publisherFilter]);

  const selectedPublishers = React.useMemo(
    () =>
      publishers.filter((publisher) =>
        filteredPublisherIds.includes(publisher.id),
      ),
    [filteredPublisherIds],
  );

  const filteredPublisherOptions = React.useMemo(
    () => [{ id: "all", name: "Összes kiadó" }, ...publishers],
    [],
  );

  const articleFeedCount = selectedPublishers.filter(
    (publisher) => publisher.articleFeedUrl,
  ).length;
  const podcastFeedCount = selectedPublishers.filter(
    (publisher) => publisher.podcastFeedUrl,
  ).length;
  const youtubeSourceCount = selectedPublishers.filter((publisher) =>
    Boolean(
      publisher.youtubeChannelId ||
      publisher.youtubeChannelHandle ||
      publisher.youtubeRssFeedUrl,
    ),
  ).length;
  const hasYouTubeApiKey = Boolean(import.meta.env.VITE_YOUTUBE_API_KEY);

  const { width, containerRef, mounted } = useContainerWidth();

  const handleLayoutChange = (
    _currentLayout: Layout,
    allLayouts: DashboardLayouts,
  ) => {
    setLayouts(allLayouts);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-muted/10 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Le ne maradjak</h1>
              <p className="text-sm text-muted-foreground">
                Mi történik? Mit csinál Magyar Péter?
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={publisherFilter}
                onValueChange={setPublisherFilter}
              >
                <SelectTrigger className="w-56" size="sm">
                  <SelectValue placeholder="Válassz kiadót" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {filteredPublisherOptions.map((publisher) => (
                      <SelectItem key={publisher.id} value={publisher.id}>
                        {publisher.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPublisherFilter("all")}
              >
                Összes megjelenítése
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-muted/10 bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Kiválasztott kiadók
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {selectedPublishers.length}
              </p>
            </div>
            <div className="rounded-3xl border border-muted/10 bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Elérhető cikkforrások
              </p>
              <p className="mt-2 text-3xl font-semibold">{articleFeedCount}</p>
            </div>
            <div className="rounded-3xl border border-muted/10 bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Elérhető podcast források
              </p>
              <p className="mt-2 text-3xl font-semibold">{podcastFeedCount}</p>
            </div>
            <div className="rounded-3xl border border-muted/10 bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">YouTube források</p>
              <p className="mt-2 text-3xl font-semibold">
                {youtubeSourceCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasYouTubeApiKey ? "API kulcs elérhető" : "API kulcs hiányzik"}
              </p>
            </div>
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
                margin={[16, 16]}
                containerPadding={[16, 16]}
                width={width}
                onLayoutChange={handleLayoutChange}
              >
                {(layouts.lg ?? defaultLayouts.lg ?? []).map((item) => {
                  const widgetDef = findWidgetDefinition(
                    item.i as DashboardWidgetType,
                  );
                  if (!widgetDef) {
                    return null;
                  }

                  const Widget = widgetDef.component;
                  return (
                    <div
                      key={item.i}
                      className="rounded-3xl border border-muted/10 bg-card shadow-sm"
                    >
                      <Widget publisherIds={filteredPublisherIds} />
                    </div>
                  );
                })}
              </ResponsiveGridLayout>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
