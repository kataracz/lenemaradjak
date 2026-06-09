import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { VideoPlayerFloatingWidget } from "./VideoPlayerFloatingWidget";
import { VideoPlayerContext } from "@/contexts/VideoPlayerContextDef";
import type { FeedItem } from "@/types/dashboard";

vi.mock("@videojs/react/video/skin.css", () => ({}));

vi.mock("react-draggable", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("react-resizable", () => ({
  Resizable: ({
    children,
    onResize,
    width,
  }: {
    children: React.ReactNode;
    onResize: (
      e: unknown,
      data: { size: { width: number; height: number } },
    ) => void;
    width: number;
  }) => (
    <div data-testid="resizable" data-width={width}>
      {children}
      <button
        data-testid="simulate-resize"
        onClick={() => {
          onResize({}, { size: { width: 400, height: 0 } });
        }}
      >
        resize
      </button>
    </div>
  ),
}));

const YOUTUBE_VIDEO: FeedItem = {
  id: "vid1",
  title: "Test Video Title",
  url: "https://www.youtube.com/watch?v=testVideoId1",
  publishedAt: "2026-01-01T00:00:00Z",
};

const NON_YOUTUBE_VIDEO: FeedItem = {
  id: "vid2",
  title: "Non-YouTube Video",
  url: "https://example.com/video.mp4",
  publishedAt: "2026-01-01T00:00:00Z",
};

function setup(video: FeedItem | null) {
  const setCurrentVideo = vi.fn();
  const result = render(
    <VideoPlayerContext value={{ currentVideo: video, setCurrentVideo }}>
      <VideoPlayerFloatingWidget />
    </VideoPlayerContext>,
  );
  return { ...result, setCurrentVideo };
}

describe("VideoPlayerFloatingWidget", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when currentVideo is null", () => {
    setup(null);
    expect(screen.queryByLabelText("Videólejátszó")).toBeNull();
  });

  it("renders the widget when currentVideo is set", () => {
    setup(YOUTUBE_VIDEO);
    expect(screen.getByLabelText("Videólejátszó")).toBeTruthy();
  });

  it("displays the video title in the header", () => {
    setup(YOUTUBE_VIDEO);
    expect(screen.getByText("Test Video Title")).toBeTruthy();
  });

  it("renders an iframe for a valid YouTube URL", () => {
    const { container } = setup(YOUTUBE_VIDEO);
    expect(container.querySelector("iframe")).not.toBeNull();
  });

  it("iframe src contains the embed URL with the video ID", () => {
    const { container } = setup(YOUTUBE_VIDEO);
    const src = container.querySelector("iframe")?.getAttribute("src") ?? "";
    expect(src).toContain("youtube-nocookie.com/embed/testVideoId1");
  });

  it("renders error message for a non-YouTube URL", () => {
    setup(NON_YOUTUBE_VIDEO);
    expect(screen.getByText("Nem sikerült betölteni a videót.")).toBeTruthy();
  });

  it("calls setCurrentVideo(null) when close button is clicked", () => {
    const { setCurrentVideo } = setup(YOUTUBE_VIDEO);
    fireEvent.click(screen.getByLabelText("Bezárás"));
    expect(setCurrentVideo).toHaveBeenCalledWith(null);
  });

  it("has a drag-handle element", () => {
    setup(YOUTUBE_VIDEO);
    expect(screen.getByTestId("drag-handle")).toBeTruthy();
  });

  it("initial container width is 320px", () => {
    setup(YOUTUBE_VIDEO);
    const widget = screen.getByLabelText("Videólejátszó");
    expect(widget.style.width).toBe("320px");
  });

  it("updates container width when Resizable fires onResize", () => {
    setup(YOUTUBE_VIDEO);
    fireEvent.click(screen.getByTestId("simulate-resize"));
    const widget = screen.getByLabelText("Videólejátszó");
    expect(widget.style.width).toBe("400px");
  });
});
