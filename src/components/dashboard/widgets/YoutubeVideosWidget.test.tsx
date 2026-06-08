import * as React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { FeedItem } from "@/types/dashboard";

vi.mock("@/hooks/useYouTubeData", () => ({ useYouTubeData: vi.fn() }));
vi.mock("@/contexts/useVideoPlayer", () => ({
  useVideoPlayer: vi.fn(() => ({
    setCurrentVideo: vi.fn(),
    currentVideo: null,
  })),
}));
vi.mock("@/components/dashboard/widget-card", () => ({
  DashboardCard: ({
    title,
    children,
    actions,
  }: {
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h2>{title}</h2>
      {actions}
      {children}
    </div>
  ),
}));
vi.mock("@/components/dashboard/feed-item-card", () => ({
  FeedItemCard: ({ item, onPlay }: { item: FeedItem; onPlay?: () => void }) => (
    <div data-testid="feed-item">
      {item.title}
      {onPlay && (
        <button data-testid="play-btn" onClick={onPlay}>
          play
        </button>
      )}
    </div>
  ),
}));

import { useYouTubeData } from "@/hooks/useYouTubeData";
import { useVideoPlayer } from "@/contexts/useVideoPlayer";
import { YoutubeVideosWidget } from "@/components/dashboard/widgets/YoutubeVideosWidget";

const ITEM: FeedItem = {
  id: "vid1",
  title: "Test Video",
  url: "https://youtube.com/watch?v=vid1",
  publishedAt: "2024-01-01T00:00:00Z",
};

function mockFeed(
  overrides: Partial<ReturnType<typeof useYouTubeData>> = {},
): void {
  vi.mocked(useYouTubeData).mockReturnValue({
    videos: [],
    streams: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    refreshDisabled: false,
    filteredPublishers: [],
    ...overrides,
  });
}

describe("YoutubeVideosWidget", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading text when loading=true", () => {
    mockFeed({ loading: true });
    render(<YoutubeVideosWidget publisherIds={[]} />);
    expect(screen.getByText("Videók betöltése...")).toBeTruthy();
  });

  it("renders one feed-item per video when loaded", () => {
    mockFeed({ videos: [ITEM, { ...ITEM, id: "vid2", title: "Video 2" }] });
    render(<YoutubeVideosWidget publisherIds={[]} />);
    expect(screen.getAllByTestId("feed-item")).toHaveLength(2);
  });

  it("shows error banner when error is set", () => {
    mockFeed({ error: "API quota exceeded" });
    render(<YoutubeVideosWidget publisherIds={[]} />);
    expect(screen.getByText("Nem sikerült betölteni a videókat")).toBeTruthy();
    expect(screen.getByText("API quota exceeded")).toBeTruthy();
  });

  it("shows empty state when no videos", () => {
    mockFeed();
    render(<YoutubeVideosWidget publisherIds={[]} />);
    expect(screen.getByText("Még nincsenek elérhető videók.")).toBeTruthy();
  });

  it("shows error banner AND items together when partial error with videos", () => {
    mockFeed({
      videos: [ITEM],
      error: "Egy YouTube csatorna nem töltődött be.",
    });
    render(<YoutubeVideosWidget publisherIds={[]} />);
    expect(screen.getByText("Nem sikerült betölteni a videókat")).toBeTruthy();
    expect(screen.getByTestId("feed-item")).toBeTruthy();
  });

  it("calls setCurrentVideo when play button is clicked", () => {
    const setCurrentVideo = vi.fn();
    vi.mocked(useVideoPlayer).mockReturnValue({
      setCurrentVideo,
      currentVideo: null,
    });
    mockFeed({ videos: [ITEM] });

    render(<YoutubeVideosWidget publisherIds={[]} />);
    fireEvent.click(screen.getByTestId("play-btn"));
    expect(setCurrentVideo).toHaveBeenCalledWith(ITEM);
  });
});
