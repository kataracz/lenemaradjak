import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import type { DashboardPreferences } from "@/lib/persistence";
import type { DashboardLayouts } from "@/types/dashboard";

const KEY = "lenemaradjak-dashboard-preferences";
const defaultLayouts: DashboardLayouts = {
  lg: [{ i: "widget", x: 0, y: 0, w: 4, h: 4 }],
};
const defaults: DashboardPreferences = {
  layouts: defaultLayouts,
  publisherFilter: "all",
};

describe("useDashboardPreferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when localStorage is empty", () => {
    const { result } = renderHook(() => useDashboardPreferences(defaults));
    expect(result.current.layouts).toEqual(defaultLayouts);
    expect(result.current.publisherFilter).toBe("all");
  });

  it("persists layouts to localStorage when setLayouts is called", () => {
    const { result } = renderHook(() => useDashboardPreferences(defaults));
    const newLayouts: DashboardLayouts = {
      lg: [{ i: "widget", x: 0, y: 0, w: 6, h: 6 }],
    };
    act(() => {
      result.current.setLayouts(newLayouts);
    });
    expect(localStorage.getItem(KEY)).toBe(
      JSON.stringify({ layouts: newLayouts, publisherFilter: "all" }),
    );
  });

  it("persists the publisher filter when setPublisherFilter is called", () => {
    const { result } = renderHook(() => useDashboardPreferences(defaults));
    act(() => {
      result.current.setPublisherFilter("telex");
    });
    expect(result.current.publisherFilter).toBe("telex");
    expect(localStorage.getItem(KEY)).toBe(
      JSON.stringify({ layouts: defaultLayouts, publisherFilter: "telex" }),
    );
  });

  it("returns defaults when stored JSON is corrupted", () => {
    localStorage.setItem(KEY, "corrupted{{json");
    const { result } = renderHook(() => useDashboardPreferences(defaults));
    expect(result.current.layouts).toEqual(defaultLayouts);
    expect(result.current.publisherFilter).toBe("all");
  });

  it("syncs preferences when another tab writes the storage key", () => {
    const { result } = renderHook(() => useDashboardPreferences(defaults));
    const external: DashboardPreferences = {
      layouts: { lg: [{ i: "widget", x: 2, y: 2, w: 8, h: 8 }] },
      publisherFilter: "444",
    };
    act(() => {
      localStorage.setItem(KEY, JSON.stringify(external));
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(result.current.layouts).toEqual(external.layouts);
    expect(result.current.publisherFilter).toBe("444");
  });
});
