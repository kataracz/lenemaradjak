import * as React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { FeedItem, PublisherConfig } from "@/types/dashboard";

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
  FeedItemCard: ({ item }: { item: FeedItem }) => (
    <div data-testid="feed-item">{item.title}</div>
  ),
}));

import { useYouTubeData } from "@/hooks/useYouTubeData";
import { LiveStreamsWidget } from "@/components/dashboard/widgets/LiveStreamsWidget";

const LIVE_ITEM: FeedItem = {
  id: "live1",
  title: "Live Now",
  url: "https://youtube.com/watch?v=live1",
  publishedAt: "2024-01-01T00:00:00Z",
  isLive: true,
};

const PUBLISHER_WITH_CHANNEL: PublisherConfig = {
  id: "pub1",
  name: "Publisher 1",
  youtubeChannelId: "UC1234",
};

const PUBLISHER_WITHOUT_CHANNEL: PublisherConfig = {
  id: "pub2",
  name: "Publisher 2",
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
    filteredPublishers: [PUBLISHER_WITH_CHANNEL],
    ...overrides,
  });
}

describe("LiveStreamsWidget", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading text when loading=true", () => {
    mockFeed({ loading: true });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(screen.getByText("Élő közvetítések ellenőrzése...")).toBeTruthy();
  });

  it("renders one feed-item per live stream when streams present", () => {
    mockFeed({ streams: [LIVE_ITEM] });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(screen.getAllByTestId("feed-item")).toHaveLength(1);
    expect(screen.getByText("Live Now")).toBeTruthy();
  });

  it("shows error banner when error is set", () => {
    mockFeed({ error: "YouTube API failed" });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(
      screen.getByText("Nem sikerült betölteni az élő közvetítéseket"),
    ).toBeTruthy();
    expect(screen.getByText("YouTube API failed")).toBeTruthy();
  });

  it("shows not-configured message when VITE_YOUTUBE_API_KEY is absent", () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", ""); // clear any value from .env
    mockFeed({ filteredPublishers: [PUBLISHER_WITH_CHANNEL] });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(screen.getByText(/VITE_YOUTUBE_API_KEY/)).toBeTruthy();
  });

  it("shows no-live-streams message when key is set and publishers have channels but no streams", () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "test-key");
    mockFeed({ filteredPublishers: [PUBLISHER_WITH_CHANNEL] });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(screen.getByText(/nem találtunk élő közvetítést/)).toBeTruthy();
  });

  it("shows error banner AND items together when partial error with streams", () => {
    mockFeed({
      streams: [LIVE_ITEM],
      error: "Egy YouTube csatorna nem töltődött be.",
    });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(
      screen.getByText("Nem sikerült betölteni az élő közvetítéseket"),
    ).toBeTruthy();
    expect(screen.getByTestId("feed-item")).toBeTruthy();
  });

  it("shows not-configured message when publishers have no channel info", () => {
    vi.stubEnv("VITE_YOUTUBE_API_KEY", "test-key");
    mockFeed({ filteredPublishers: [PUBLISHER_WITHOUT_CHANNEL] });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(screen.getByText(/VITE_YOUTUBE_API_KEY/)).toBeTruthy();
  });
});
