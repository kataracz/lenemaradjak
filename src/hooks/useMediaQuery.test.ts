import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<() => void>();
  let matches = initialMatches;

  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.delete(listener);
    }),
  };

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mql),
  );

  return {
    mql,
    fireChange: (nextMatches: boolean) => {
      matches = nextMatches;
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}

describe("useMediaQuery", () => {
  it("returns the initial matchMedia result", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(true);
  });

  it("updates when the media query change event fires", () => {
    const { fireChange } = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(false);
    act(() => {
      fireChange(true);
    });
    expect(result.current).toBe(true);
  });

  it("removes the change listener on unmount", () => {
    const { mql } = stubMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("returns false when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(false);
  });
});
