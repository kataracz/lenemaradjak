import * as React from "react";
import type { FeedItem } from "@/types/dashboard";

export interface VideoPlayerContextValue {
  currentVideo: FeedItem | null;
  setCurrentVideo: (item: FeedItem | null) => void;
}

export const VideoPlayerContext =
  React.createContext<VideoPlayerContextValue | null>(null);
