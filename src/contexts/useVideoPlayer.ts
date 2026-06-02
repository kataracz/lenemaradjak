import * as React from "react";
import {
  VideoPlayerContext,
  type VideoPlayerContextValue,
} from "./VideoPlayerContextDef";

export function useVideoPlayer(): VideoPlayerContextValue {
  const ctx = React.use(VideoPlayerContext);
  if (!ctx)
    throw new Error("useVideoPlayer must be used within VideoPlayerProvider");
  return ctx;
}
