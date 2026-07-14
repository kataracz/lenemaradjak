import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

describe("useAutoRefresh", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("triggers the cooldown on mount and calls load once the kickoff timer fires", () => {
    vi.useFakeTimers();
    const load = vi.fn();
    const triggerRefresh = vi.fn().mockReturnValue(true);

    renderHook(() => useAutoRefresh(load, triggerRefresh));

    expect(triggerRefresh).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith();
  });

  it("does not call load if unmounted before the kickoff timer fires", () => {
    vi.useFakeTimers();
    const load = vi.fn();
    const triggerRefresh = vi.fn().mockReturnValue(true);

    const { unmount } = renderHook(() => useAutoRefresh(load, triggerRefresh));
    unmount();
    vi.runAllTimers();

    expect(load).not.toHaveBeenCalled();
  });

  it("refresh() forces a reload when triggerRefresh allows it", () => {
    const load = vi.fn();
    const triggerRefresh = vi.fn().mockReturnValue(true);

    const { result } = renderHook(() => useAutoRefresh(load, triggerRefresh));
    load.mockClear();
    result.current();

    expect(load).toHaveBeenCalledWith(true);
  });

  it("refresh() is a no-op while triggerRefresh reports cooldown active", () => {
    const load = vi.fn();
    const triggerRefresh = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() => useAutoRefresh(load, triggerRefresh));
    load.mockClear();
    result.current();

    expect(load).not.toHaveBeenCalled();
  });
});
