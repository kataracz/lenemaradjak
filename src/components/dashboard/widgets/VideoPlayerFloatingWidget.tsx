import * as React from "react";
import Draggable from "react-draggable";
import { Resizable } from "react-resizable";
import { HugeiconsIcon } from "@hugeicons/react";
import { DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useVideoPlayer } from "@/contexts/useVideoPlayer";
import type { ResizeCallbackData } from "react-resizable";
import { extractYouTubeVideoId, buildYouTubeEmbedUrl } from "@/lib/youtube";

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 240;
const MAX_WIDTH = 640;

export function VideoPlayerFloatingWidget() {
  const { currentVideo, setCurrentVideo } = useVideoPlayer();
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(DEFAULT_WIDTH);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const clampIntoView = () => {
      const node = nodeRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setPosition((pos) => {
        let { x, y } = pos;
        if (rect.right > window.innerWidth) x -= rect.right - window.innerWidth;
        if (rect.left < 0) x -= rect.left;
        if (rect.bottom > window.innerHeight)
          y -= rect.bottom - window.innerHeight;
        if (rect.top < 0) y -= rect.top;
        return x === pos.x && y === pos.y ? pos : { x, y };
      });
    };
    window.addEventListener("resize", clampIntoView);
    return () => {
      window.removeEventListener("resize", clampIntoView);
    };
  }, []);

  if (!currentVideo) return null;

  const videoId = extractYouTubeVideoId(currentVideo.url);
  const embedUrl = videoId
    ? buildYouTubeEmbedUrl(videoId, { autoplay: true })
    : null;

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      cancel=".react-resizable-handle, button"
      bounds="body"
      position={position}
      onStop={(_e, data) => {
        setPosition({ x: data.x, y: data.y });
      }}
    >
      <div ref={nodeRef} className="fixed bottom-6 right-6 z-50">
        <Resizable
          width={width}
          height={0}
          onResize={(
            _e: React.SyntheticEvent,
            { size }: ResizeCallbackData,
          ) => {
            setWidth(size.width);
          }}
          minConstraints={[MIN_WIDTH, 0]}
          maxConstraints={[MAX_WIDTH, 0]}
          resizeHandles={["se"]}
        >
          <div
            style={{ width }}
            className="relative flex flex-col rounded-2xl bg-card shadow-xl ring-1 ring-foreground/10"
            aria-label="Videólejátszó"
          >
            <div
              data-testid="drag-handle"
              className="drag-handle flex cursor-grab items-center gap-2 rounded-t-2xl bg-muted/80 px-3 py-2 select-none active:cursor-grabbing"
            >
              <HugeiconsIcon
                icon={DragDropVerticalIcon}
                size={16}
                aria-hidden="true"
                className="shrink-0 text-muted-foreground/60"
              />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
                {currentVideo.title}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setCurrentVideo(null);
                }}
                aria-label="Bezárás"
                className="ml-2 shrink-0"
              >
                ✕
              </Button>
            </div>
            <div className="overflow-hidden rounded-b-2xl">
              {embedUrl ? (
                <iframe
                  key={currentVideo.id}
                  src={embedUrl}
                  title={currentVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full border-0"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-muted text-sm text-destructive">
                  Nem sikerült betölteni a videót.
                </div>
              )}
            </div>
          </div>
        </Resizable>
      </div>
    </Draggable>
  );
}
