import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  findWidgetDefinition,
  type DashboardWidgetDefinition,
} from "@/components/dashboard/widget-registry";
import type { DashboardWidgetType } from "@/types/dashboard";

const MOBILE_TAB_ORDER: DashboardWidgetType[] = [
  "liveStreams",
  "youtubeVideos",
  "podcasts",
  "articles",
];

export function MobileDashboardTabs({
  publisherIds,
}: {
  publisherIds: string[];
}) {
  const widgets = MOBILE_TAB_ORDER.map((id) => findWidgetDefinition(id)).filter(
    (widget): widget is DashboardWidgetDefinition => Boolean(widget),
  );

  return (
    <Tabs defaultValue={MOBILE_TAB_ORDER[0]} className="w-full">
      <TabsList className="w-full">
        {widgets.map((widget) => (
          <TabsTrigger key={widget.id} value={widget.id} className="flex-1">
            {widget.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {widgets.map((widget) => (
        <TabsContent key={widget.id} value={widget.id}>
          <widget.component publisherIds={publisherIds} bare />
        </TabsContent>
      ))}
    </Tabs>
  );
}
