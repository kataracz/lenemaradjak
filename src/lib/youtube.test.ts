import { describe, it, expect } from "vitest";
import { extractYouTubeVideoId, buildYouTubeEmbedUrl } from "@/lib/youtube";

describe("extractYouTubeVideoId", () => {
  it("extracts ID from youtube.com watch URL", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=abc123XYZ"),
    ).toBe("abc123XYZ");
  });

  it("extracts ID from youtu.be short URL", () => {
    expect(extractYouTubeVideoId("https://youtu.be/abc123XYZ")).toBe(
      "abc123XYZ",
    );
  });

  it("extracts ID from a Shorts URL", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/shorts/abc123XYZ"),
    ).toBe("abc123XYZ");
  });

  it("extracts ID from an /embed/ URL", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/embed/abc123XYZ"),
    ).toBe("abc123XYZ");
  });

  it("extracts ID from a /live/ URL", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/live/abc123XYZ"),
    ).toBe("abc123XYZ");
  });

  it("returns null for a non-YouTube URL", () => {
    expect(extractYouTubeVideoId("https://example.com/video")).toBeNull();
  });

  it("returns null for a malformed URL string", () => {
    expect(extractYouTubeVideoId("not-a-url")).toBeNull();
  });

  it("returns null when youtube.com URL has no v param", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/channel/UC123"),
    ).toBeNull();
  });

  it("returns null for youtu.be URL with empty path", () => {
    expect(extractYouTubeVideoId("https://youtu.be/")).toBeNull();
  });
});

describe("buildYouTubeEmbedUrl", () => {
  it("uses youtube-nocookie.com domain", () => {
    const url = buildYouTubeEmbedUrl("abc123");
    expect(new URL(url).hostname).toBe("www.youtube-nocookie.com");
  });

  it("includes rel=0 and modestbranding=1", () => {
    const parsed = new URL(buildYouTubeEmbedUrl("abc123"));
    expect(parsed.searchParams.get("rel")).toBe("0");
    expect(parsed.searchParams.get("modestbranding")).toBe("1");
  });

  it("includes autoplay=1 when autoplay option is true", () => {
    const parsed = new URL(buildYouTubeEmbedUrl("abc123", { autoplay: true }));
    expect(parsed.searchParams.get("autoplay")).toBe("1");
  });

  it("does not include autoplay param when option is omitted", () => {
    const parsed = new URL(buildYouTubeEmbedUrl("abc123"));
    expect(parsed.searchParams.get("autoplay")).toBeNull();
  });
});
