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

import { useRSSFeed } from "@/hooks/useRSSFeed";
import { ArticlesWidget } from "@/components/dashboard/widgets/ArticlesWidget";

const ITEM: FeedItem = {
  id: "1",
  title: "Test Article",
  url: "https://example.com/1",
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

describe("ArticlesWidget", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading text when loading=true", () => {
    mockFeed({ loading: true });
    render(<ArticlesWidget publisherIds={[]} />);
    expect(screen.getByText("Cikkek betöltése...")).toBeTruthy();
  });

  it("renders one feed-item per item when loaded", () => {
    mockFeed({ items: [ITEM, { ...ITEM, id: "2", title: "Article 2" }] });
    render(<ArticlesWidget publisherIds={[]} />);
    expect(screen.getAllByTestId("feed-item")).toHaveLength(2);
  });

  it("shows error banner when error is set", () => {
    mockFeed({ error: "Fetch failed", items: [ITEM] });
    render(<ArticlesWidget publisherIds={[]} />);
    expect(
      screen.getByText("Nem sikerült betölteni az összes cikket"),
    ).toBeTruthy();
    expect(screen.getByText("Fetch failed")).toBeTruthy();
  });

  it("shows empty state when no items and no error", () => {
    mockFeed();
    render(<ArticlesWidget publisherIds={[]} />);
    expect(screen.getByText("Még nincsenek elérhető cikkek.")).toBeTruthy();
  });

  it("Frissítés button calls refresh", () => {
    const refresh = vi.fn();
    mockFeed({ refresh });
    render(<ArticlesWidget publisherIds={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Frissítés" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
