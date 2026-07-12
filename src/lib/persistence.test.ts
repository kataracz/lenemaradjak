import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadDashboardLayouts, saveDashboardLayouts } from "@/lib/persistence";

const KEY = "lenemaradjak-dashboard-layout";

describe("persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when localStorage is empty", () => {
    expect(loadDashboardLayouts()).toBeNull();
  });

  it("round-trips layouts through save and load", () => {
    const layouts = { lg: [{ i: "a", x: 0, y: 0, w: 4, h: 4 }] };
    saveDashboardLayouts(layouts);
    expect(loadDashboardLayouts()).toEqual(layouts);
  });

  it("returns null and warns when stored JSON is malformed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    localStorage.setItem(KEY, "not-valid-json{{");
    expect(loadDashboardLayouts()).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not throw when localStorage.setItem throws QuotaExceededError", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => {
      saveDashboardLayouts({ lg: [] });
    }).not.toThrow();
  });
});
