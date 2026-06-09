import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "@/hooks/usePagination";

const ITEMS = Array.from({ length: 25 }, (_, i) => `item-${String(i + 1)}`);

describe("usePagination", () => {
  it("returns first page of items on initial render", () => {
    const { result } = renderHook(() => usePagination(ITEMS, 10));
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedItems).toEqual(ITEMS.slice(0, 10));
  });

  it("navigates to next page", () => {
    const { result } = renderHook(() => usePagination(ITEMS, 10));
    act(() => {
      result.current.nextPage();
    });
    expect(result.current.page).toBe(2);
    expect(result.current.paginatedItems).toEqual(ITEMS.slice(10, 20));
  });

  it("navigates to previous page", () => {
    const { result } = renderHook(() => usePagination(ITEMS, 10));
    act(() => {
      result.current.nextPage();
    });
    act(() => {
      result.current.prevPage();
    });
    expect(result.current.page).toBe(1);
  });

  it("does not go below page 1", () => {
    const { result } = renderHook(() => usePagination(ITEMS, 10));
    act(() => {
      result.current.prevPage();
    });
    expect(result.current.page).toBe(1);
  });

  it("does not go past totalPages", () => {
    const { result } = renderHook(() => usePagination(ITEMS, 10));
    act(() => {
      result.current.nextPage();
    });
    act(() => {
      result.current.nextPage();
    });
    act(() => {
      result.current.nextPage();
    });
    expect(result.current.page).toBe(3);
  });

  it("last page contains remaining items", () => {
    const { result } = renderHook(() => usePagination(ITEMS, 10));
    act(() => {
      result.current.nextPage();
    });
    act(() => {
      result.current.nextPage();
    });
    expect(result.current.paginatedItems).toEqual(ITEMS.slice(20));
  });

  it("resetPage returns to page 1", () => {
    const { result } = renderHook(() => usePagination(ITEMS, 10));
    act(() => {
      result.current.nextPage();
    });
    act(() => {
      result.current.resetPage();
    });
    expect(result.current.page).toBe(1);
  });

  it("clamps page when items shrink below current page", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: string[] }) => usePagination(items, 10),
      { initialProps: { items: ITEMS } },
    );
    act(() => {
      result.current.nextPage();
    });
    expect(result.current.page).toBe(2);
    rerender({ items: ITEMS.slice(0, 5) });
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(1);
  });

  it("totalPages is 1 for empty array", () => {
    const { result } = renderHook(() => usePagination([], 10));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedItems).toEqual([]);
  });

  it("shows all items when count equals pageSize", () => {
    const tenItems = ITEMS.slice(0, 10);
    const { result } = renderHook(() => usePagination(tenItems, 10));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedItems).toHaveLength(10);
  });
});
