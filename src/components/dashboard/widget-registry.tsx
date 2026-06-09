import type { ComponentType } from "react";
import type { DashboardWidgetType } from "@/types/dashboard";
import { ArticlesWidget } from "@/components/dashboard/widgets/ArticlesWidget";
import { LiveStreamsWidget } from "@/components/dashboard/widgets/LiveStreamsWidget";
import { PodcastsWidget } from "@/components/dashboard/widgets/PodcastsWidget";
import { YoutubeVideosWidget } from "@/components/dashboard/widgets/YoutubeVideosWidget";

export interface DashboardWidgetDefinition {
  id: DashboardWidgetType;
  title: string;
  description: string;
  component: ComponentType<{ publisherIds: string[] }>;
}

export const dashboardWidgets: DashboardWidgetDefinition[] = [
  {
    id: "youtubeVideos",
    title: "Latest videos",
    description: "Recent uploads across your selected publishers.",
    component: YoutubeVideosWidget,
  },
  {
    id: "liveStreams",
    title: "Live streams",
    description:
      "Live broadcast signals for publishers that support YouTube API live detection.",
    component: LiveStreamsWidget,
  },
  {
    id: "podcasts",
    title: "Latest podcasts",
    description: "Newest podcast episodes from tracked publishers.",
    component: PodcastsWidget,
  },
  {
    id: "articles",
    title: "Latest articles",
    description: "Fresh articles from selected publisher feeds.",
    component: ArticlesWidget,
  },
];

export function findWidgetDefinition(
  type: string,
): DashboardWidgetDefinition | undefined {
  return dashboardWidgets.find((widget) => widget.id === type);
}
