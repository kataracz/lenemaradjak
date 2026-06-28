import { describe, it, expect } from "vitest";
import { findWidgetDefinition } from "@/components/dashboard/widget-registry";

describe("findWidgetDefinition", () => {
  it("returns the correct widget for 'articles'", () => {
    const result = findWidgetDefinition("articles");
    expect(result).toBeTruthy();
    expect(result?.id).toBe("articles");
  });

  it("returns the correct widget for 'youtubeVideos'", () => {
    const result = findWidgetDefinition("youtubeVideos");
    expect(result).toBeTruthy();
    expect(result?.id).toBe("youtubeVideos");
  });

  it("returns undefined for an unknown type", () => {
    const result = findWidgetDefinition("unknown");
    expect(result).toBeUndefined();
  });
});
