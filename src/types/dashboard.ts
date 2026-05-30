import type { ResponsiveLayouts } from "react-grid-layout";

export type DashboardWidgetType =
  | "youtubeVideos"
  | "liveStreams"
  | "podcasts"
  | "articles";

export type DashboardLayouts = ResponsiveLayouts<string>;

export interface PublisherConfig {
  id: string;
  name: string;
  articleFeedUrl?: string;
  podcastFeedUrl?: string;
  youtubeRssFeedUrl?: string;
  youtubeChannelId?: string;
  youtubeChannelHandle?: string;
}

export interface FeedItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  publishedAt: string;
  source?: string;
  thumbnailUrl?: string;
  channelName?: string;
  isLive?: boolean;
  viewCount?: number;
}
