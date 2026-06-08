import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FeedItemCard } from "@/components/dashboard/feed-item-card";
import type { FeedItem } from "@/types/dashboard";

afterEach(cleanup);

const ITEM: FeedItem = {
  id: "1",
  title: "Test Title",
  url: "https://example.com/article",
  publishedAt: "2024-01-01T00:00:00Z",
  source: "Source Name",
};

const ITEM_WITH_THUMB: FeedItem = {
  ...ITEM,
  thumbnailUrl: "https://example.com/thumb.jpg",
  channelName: "Channel Name",
  description: "Article description",
};

describe("FeedItemCard – full mode", () => {
  it("renders the title as a link pointing to item.url", () => {
    render(<FeedItemCard item={ITEM} />);
    const link = screen.getByRole("link", { name: "Test Title" });
    expect(link.getAttribute("href")).toBe("https://example.com/article");
  });

  it("shows item.description when present", () => {
    render(<FeedItemCard item={ITEM_WITH_THUMB} />);
    expect(screen.getByText("Article description")).toBeTruthy();
  });

  it("shows descriptionFallback when description is absent", () => {
    render(<FeedItemCard item={ITEM} descriptionFallback="No preview." />);
    expect(screen.getByText("No preview.")).toBeTruthy();
  });

  it("renders thumbnail play button and calls onPlay when clicked", () => {
    const onPlay = vi.fn();
    render(<FeedItemCard item={ITEM_WITH_THUMB} onPlay={onPlay} />);
    const button = screen.getByLabelText("Lejátszás");
    fireEvent.click(button);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it("renders text play button when onPlay provided but no thumbnailUrl", () => {
    const onPlay = vi.fn();
    render(<FeedItemCard item={ITEM} onPlay={onPlay} />);
    const button = screen.getByRole("button", { name: /Lejátszás/ });
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it("renders no play button when onPlay is not provided", () => {
    const { container } = render(<FeedItemCard item={ITEM_WITH_THUMB} />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("shows channelName if set, falls back to source", () => {
    const { rerender } = render(<FeedItemCard item={ITEM_WITH_THUMB} />);
    expect(screen.getByText("Channel Name")).toBeTruthy();

    rerender(<FeedItemCard item={ITEM} />);
    expect(screen.getByText("Source Name")).toBeTruthy();
  });

  it("omits the description paragraph when neither description nor descriptionFallback is set", () => {
    const { container } = render(<FeedItemCard item={ITEM} />);
    expect(container.querySelectorAll("p")).toHaveLength(1); // only source/channelName
  });
});

describe("FeedItemCard – compact mode", () => {
  it("renders thumbnail play button and calls onPlay on click", () => {
    const onPlay = vi.fn();
    render(<FeedItemCard item={ITEM_WITH_THUMB} compact onPlay={onPlay} />);
    const button = screen.getByLabelText("Lejátszás");
    fireEvent.click(button);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it("does not render a play button when no thumbnailUrl even if onPlay provided", () => {
    const { container } = render(
      <FeedItemCard item={ITEM} compact onPlay={vi.fn()} />,
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders footer content", () => {
    render(
      <FeedItemCard item={ITEM} compact footer={<span>footer text</span>} />,
    );
    expect(screen.getByText("footer text")).toBeTruthy();
  });
});
