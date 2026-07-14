import * as React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
  FeedItemCard: ({ item }: { item: FeedItem }) => (
    <div data-testid="feed-item">{item.title}</div>
  ),
}));
vi.mock("@/components/dashboard/pagination-controls", () => ({
  PaginationControls: ({
    page,
    totalPages,
    onPrev,
    onNext,
  }: {
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
  }) => (
    <div data-testid="pagination">
      <button data-testid="prev-page" onClick={onPrev}>
        prev
      </button>
      <span data-testid="page-indicator">
        {page}/{totalPages}
      </span>
      <button data-testid="next-page" onClick={onNext}>
        next
      </button>
    </div>
  ),
}));

import { useYouTubeData } from "@/hooks/useYouTubeData";
import { fireEvent } from "@testing-library/react";
import { LiveStreamsWidget } from "@/components/dashboard/widgets/LiveStreamsWidget";

const LIVE_ITEM: FeedItem = {
  id: "live1",
  title: "Live Now",
  url: "https://youtube.com/watch?v=live1",
  publishedAt: "2024-01-01T00:00:00Z",
  isLive: true,
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
    hasConfiguredChannels: true,
    notConfigured: false,
    ...overrides,
  });
}

describe("LiveStreamsWidget", () => {
  afterEach(() => {
    cleanup();
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

  it("shows not-configured message when notConfigured is true", () => {
    mockFeed({ hasConfiguredChannels: true, notConfigured: true });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(screen.getByText(/YOUTUBE_API_KEY/)).toBeTruthy();
  });

  it("shows no-live-streams message when key is set and publishers have channels but no streams", () => {
    mockFeed({ hasConfiguredChannels: true });
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
    mockFeed({ hasConfiguredChannels: false });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(screen.getByText(/YOUTUBE_API_KEY/)).toBeTruthy();
  });

  it("shows no pagination when streams fit on one page", () => {
    mockFeed({ streams: [LIVE_ITEM] });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(screen.queryByTestId("pagination")).toBeNull();
  });

  it("shows pagination when streams exceed page size", () => {
    const manyStreams = Array.from({ length: 11 }, (_, i) => ({
      ...LIVE_ITEM,
      id: `live${String(i)}`,
      title: `Live ${String(i)}`,
    }));
    mockFeed({ streams: manyStreams });
    render(<LiveStreamsWidget publisherIds={[]} />);
    expect(screen.getByTestId("pagination")).toBeTruthy();
    expect(screen.getByTestId("page-indicator").textContent).toBe("1/2");
    expect(screen.getAllByTestId("feed-item")).toHaveLength(10);
  });

  it("resets to page 1 when refresh is called", () => {
    const refresh = vi.fn();
    const manyStreams = Array.from({ length: 11 }, (_, i) => ({
      ...LIVE_ITEM,
      id: `live${String(i)}`,
      title: `Live ${String(i)}`,
    }));
    mockFeed({ streams: manyStreams, refresh });
    render(<LiveStreamsWidget publisherIds={[]} />);
    fireEvent.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("page-indicator").textContent).toBe("2/2");
    fireEvent.click(screen.getByText("Frissítés"));
    expect(screen.getByTestId("page-indicator").textContent).toBe("1/2");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
