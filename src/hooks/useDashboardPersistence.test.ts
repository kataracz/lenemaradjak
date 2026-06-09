import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDashboardPersistence } from "@/hooks/useDashboardPersistence";
import type { DashboardLayouts } from "@/types/dashboard";

const KEY = "lenemaradjak-dashboard-layout";
const defaultLayouts: DashboardLayouts = {
  lg: [{ i: "widget", x: 0, y: 0, w: 4, h: 4 }],
};

describe("useDashboardPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaultLayouts when localStorage is empty", () => {
    const { result } = renderHook(() =>
      useDashboardPersistence(defaultLayouts),
    );
    expect(result.current.layouts).toEqual(defaultLayouts);
  });

  it("persists layouts to localStorage when setLayouts is called", () => {
    const { result } = renderHook(() =>
      useDashboardPersistence(defaultLayouts),
    );
    const newLayouts: DashboardLayouts = {
      lg: [{ i: "widget", x: 0, y: 0, w: 6, h: 6 }],
    };
    act(() => {
      result.current.setLayouts(newLayouts);
    });
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(newLayouts));
  });

  it("returns defaultLayouts when stored JSON is corrupted", () => {
    localStorage.setItem(KEY, "corrupted{{json");
    const { result } = renderHook(() =>
      useDashboardPersistence(defaultLayouts),
    );
    expect(result.current.layouts).toEqual(defaultLayouts);
  });
});
