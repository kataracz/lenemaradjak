import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useContainerWidth } from "@/hooks/useContainerWidth";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useContainerWidth", () => {
  it("starts with isWide = false", () => {
    const { result } = renderHook(() => useContainerWidth());
    expect(result.current.isWide).toBe(false);
  });

  it("remains false when ResizeObserver is unavailable", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { result } = renderHook(() => useContainerWidth());
    act(() => {
      result.current.ref(document.createElement("div"));
    });
    expect(result.current.isWide).toBe(false);
  });

  describe("with ResizeObserver stubbed", () => {
    let mockObserve: ReturnType<typeof vi.fn>;
    let mockDisconnect: ReturnType<typeof vi.fn>;
    // assigned inside the ResizeObserver constructor when the hook attaches its ref
    let fireResize: (width: number) => void = () => undefined;

    beforeEach(() => {
      mockObserve = vi.fn();
      mockDisconnect = vi.fn();

      vi.stubGlobal(
        "ResizeObserver",
        class {
          observe = mockObserve;
          disconnect = mockDisconnect;
          constructor(cb: ResizeObserverCallback) {
            fireResize = (width) => {
              cb(
                [{ contentRect: { width } } as ResizeObserverEntry],
                this as unknown as ResizeObserver,
              );
            };
          }
        },
      );
    });

    it("becomes true when the observed width meets the threshold", () => {
      const { result } = renderHook(() => useContainerWidth());
      act(() => {
        result.current.ref(document.createElement("div"));
      });
      act(() => {
        fireResize(1264);
      });
      expect(result.current.isWide).toBe(true);
    });

    it("resets to false when the observed width drops below the threshold", () => {
      const { result } = renderHook(() => useContainerWidth());
      act(() => {
        result.current.ref(document.createElement("div"));
      });
      act(() => {
        fireResize(1264);
      });
      act(() => {
        fireResize(626);
      });
      expect(result.current.isWide).toBe(false);
    });

    it("uses a default threshold of 800", () => {
      const { result } = renderHook(() => useContainerWidth());
      act(() => {
        result.current.ref(document.createElement("div"));
      });
      act(() => {
        fireResize(799);
      });
      expect(result.current.isWide).toBe(false);
      act(() => {
        fireResize(800);
      });
      expect(result.current.isWide).toBe(true);
    });

    it("respects a custom threshold", () => {
      const { result } = renderHook(() =>
        useContainerWidth({ threshold: 500 }),
      );
      act(() => {
        result.current.ref(document.createElement("div"));
      });
      act(() => {
        fireResize(499);
      });
      expect(result.current.isWide).toBe(false);
      act(() => {
        fireResize(500);
      });
      expect(result.current.isWide).toBe(true);
    });

    it("disconnects the observer when the ref is detached", () => {
      const { result } = renderHook(() => useContainerWidth());
      const el = document.createElement("div");
      act(() => {
        result.current.ref(el);
      });
      expect(mockObserve).toHaveBeenCalledWith(el);
      act(() => {
        result.current.ref(null);
      });
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it("disconnects the observer on unmount", () => {
      const { result, unmount } = renderHook(() => useContainerWidth());
      act(() => {
        result.current.ref(document.createElement("div"));
      });
      unmount();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});
