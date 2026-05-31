import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCooldown } from "@/hooks/useCooldown";

describe("useCooldown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with disabled = false", () => {
    const { result } = renderHook(() => useCooldown(1000));
    expect(result.current.disabled).toBe(false);
  });

  it("trigger() sets disabled = true and returns true", () => {
    const { result } = renderHook(() => useCooldown(1000));
    let returned: boolean | undefined;
    act(() => {
      returned = result.current.trigger();
    });
    expect(returned).toBe(true);
    expect(result.current.disabled).toBe(true);
  });

  it("trigger() while disabled returns false without changing state", () => {
    const { result } = renderHook(() => useCooldown(1000));
    act(() => {
      result.current.trigger();
    });
    let returned: boolean | undefined;
    act(() => {
      returned = result.current.trigger();
    });
    expect(returned).toBe(false);
    expect(result.current.disabled).toBe(true);
  });

  it("disabled resets to false after cooldown expires", () => {
    const { result } = renderHook(() => useCooldown(1000));
    act(() => {
      result.current.trigger();
    });
    expect(result.current.disabled).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.disabled).toBe(false);
  });

  it("unmounting during active cooldown does not throw", () => {
    const { result, unmount } = renderHook(() => useCooldown(1000));
    act(() => {
      result.current.trigger();
    });
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
