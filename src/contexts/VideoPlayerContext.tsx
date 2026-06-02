import * as React from "react";
import type { FeedItem } from "@/types/dashboard";
import { VideoPlayerContext } from "./VideoPlayerContextDef";

export function VideoPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentVideo, setCurrentVideo] = React.useState<FeedItem | null>(null);
  const value = React.useMemo(
    () => ({ currentVideo, setCurrentVideo }),
    [currentVideo],
  );
  return <VideoPlayerContext value={value}>{children}</VideoPlayerContext>;
}
