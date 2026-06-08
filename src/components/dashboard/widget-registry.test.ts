import { describe, it, expect } from "vitest";
import {
  dashboardWidgets,
  findWidgetDefinition,
} from "@/components/dashboard/widget-registry";
import type { DashboardWidgetType } from "@/types/dashboard";

describe("dashboardWidgets", () => {
  it("contains exactly 4 entries", () => {
    expect(dashboardWidgets).toHaveLength(4);
  });

  it("each entry has id, title, description, and a component function", () => {
    for (const w of dashboardWidgets) {
      expect(typeof w.id).toBe("string");
      expect(w.id.length).toBeGreaterThan(0);
      expect(typeof w.title).toBe("string");
      expect(w.title.length).toBeGreaterThan(0);
      expect(typeof w.description).toBe("string");
      expect(w.description.length).toBeGreaterThan(0);
      expect(typeof w.component).toBe("function");
    }
  });

  it("covers all four DashboardWidgetType values", () => {
    const ids = dashboardWidgets.map((w) => w.id);
    const expected: DashboardWidgetType[] = [
      "youtubeVideos",
      "liveStreams",
      "podcasts",
      "articles",
    ];
    for (const type of expected) {
      expect(ids).toContain(type);
    }
  });
});

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
    const result = findWidgetDefinition("unknown" as DashboardWidgetType);
    expect(result).toBeUndefined();
  });
});
