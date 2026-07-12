import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadDashboardPreferences,
  saveDashboardPreferences,
} from "@/lib/persistence";

const KEY = "lenemaradjak-dashboard-preferences";

describe("persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when localStorage is empty", () => {
    expect(loadDashboardPreferences()).toBeNull();
  });

  it("round-trips preferences through save and load", () => {
    const preferences = {
      layouts: { lg: [{ i: "a", x: 0, y: 0, w: 4, h: 4 }] },
      publisherFilter: "telex",
    };
    saveDashboardPreferences(preferences);
    expect(loadDashboardPreferences()).toEqual(preferences);
  });

  it("returns null and warns when stored JSON is malformed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    localStorage.setItem(KEY, "not-valid-json{{");
    expect(loadDashboardPreferences()).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not throw when localStorage.setItem throws QuotaExceededError", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => {
      saveDashboardPreferences({ layouts: { lg: [] }, publisherFilter: "all" });
    }).not.toThrow();
  });
});
