import * as React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { FeedItem } from "@/types/dashboard";

vi.mock("@/hooks/useRSSFeed", () => ({ useRSSFeed: vi.fn() }));
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

import { useRSSFeed } from "@/hooks/useRSSFeed";
import { PodcastsWidget } from "@/components/dashboard/widgets/PodcastsWidget";

const ITEM: FeedItem = {
  id: "1",
  title: "Episode 1",
  url: "https://example.com/ep1",
  publishedAt: "2024-01-01T00:00:00Z",
};

function mockFeed(
  overrides: Partial<ReturnType<typeof useRSSFeed>> = {},
): void {
  vi.mocked(useRSSFeed).mockReturnValue({
    items: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    refreshDisabled: false,
    ...overrides,
  });
}

describe("PodcastsWidget", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading text when loading=true", () => {
    mockFeed({ loading: true });
    render(<PodcastsWidget publisherIds={[]} />);
    expect(screen.getByText("Podcast epizódok betöltése...")).toBeTruthy();
  });

  it("renders one feed-item per episode when loaded", () => {
    mockFeed({ items: [ITEM, { ...ITEM, id: "2", title: "Episode 2" }] });
    render(<PodcastsWidget publisherIds={[]} />);
    expect(screen.getAllByTestId("feed-item")).toHaveLength(2);
  });

  it("shows error banner when error is set", () => {
    mockFeed({ error: "Feed unavailable", items: [ITEM] });
    render(<PodcastsWidget publisherIds={[]} />);
    expect(
      screen.getByText("Nem sikerült betölteni az összes podcastot"),
    ).toBeTruthy();
    expect(screen.getByText("Feed unavailable")).toBeTruthy();
  });

  it("shows empty state when no items and no error", () => {
    mockFeed();
    render(<PodcastsWidget publisherIds={[]} />);
    expect(
      screen.getByText("Nincsenek elérhető podcast epizódok."),
    ).toBeTruthy();
  });

  it("Frissítés button calls refresh", () => {
    const refresh = vi.fn();
    mockFeed({ refresh });
    render(<PodcastsWidget publisherIds={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Frissítés" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows no pagination when items fit on one page", () => {
    mockFeed({ items: [ITEM] });
    render(<PodcastsWidget publisherIds={[]} />);
    expect(screen.queryByTestId("pagination")).toBeNull();
  });

  it("shows pagination when items exceed page size", () => {
    const manyItems = Array.from({ length: 11 }, (_, i) => ({
      ...ITEM,
      id: `item${String(i)}`,
      title: `Episode ${String(i)}`,
    }));
    mockFeed({ items: manyItems });
    render(<PodcastsWidget publisherIds={[]} />);
    expect(screen.getByTestId("pagination")).toBeTruthy();
    expect(screen.getByTestId("page-indicator").textContent).toBe("1/2");
    expect(screen.getAllByTestId("feed-item")).toHaveLength(10);
  });

  it("navigates to next page showing remaining items", () => {
    const manyItems = Array.from({ length: 11 }, (_, i) => ({
      ...ITEM,
      id: `item${String(i)}`,
      title: `Episode ${String(i)}`,
    }));
    mockFeed({ items: manyItems });
    render(<PodcastsWidget publisherIds={[]} />);
    fireEvent.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("page-indicator").textContent).toBe("2/2");
    expect(screen.getAllByTestId("feed-item")).toHaveLength(1);
  });

  it("resets to page 1 when refresh is called", () => {
    const refresh = vi.fn();
    const manyItems = Array.from({ length: 11 }, (_, i) => ({
      ...ITEM,
      id: `item${String(i)}`,
      title: `Episode ${String(i)}`,
    }));
    mockFeed({ items: manyItems, refresh });
    render(<PodcastsWidget publisherIds={[]} />);
    fireEvent.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("page-indicator").textContent).toBe("2/2");
    fireEvent.click(screen.getByText("Frissítés"));
    expect(screen.getByTestId("page-indicator").textContent).toBe("1/2");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
