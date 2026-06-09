import { describe, it, expect } from "vitest";
import { publishers, defaultPublisherIds } from "@/lib/publisher-config";

describe("publishers", () => {
  it("has at least one publisher", () => {
    expect(publishers.length).toBeGreaterThan(0);
  });

  it("all publishers have id and name", () => {
    for (const p of publishers) {
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.name).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it("publisher ids are unique", () => {
    const ids = publishers.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("youtube channel ids are unique when specified", () => {
    const ids = publishers
      .map((p) => p.youtubeChannelId)
      .filter((id): id is string => Boolean(id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("at least one publisher has articleFeedUrl", () => {
    expect(publishers.some((p) => Boolean(p.articleFeedUrl))).toBe(true);
  });

  it("at least one publisher has podcastFeedUrl", () => {
    expect(publishers.some((p) => Boolean(p.podcastFeedUrl))).toBe(true);
  });
});

describe("defaultPublisherIds", () => {
  it("matches publishers array ids in the same order", () => {
    expect(defaultPublisherIds).toEqual(publishers.map((p) => p.id));
  });
});
