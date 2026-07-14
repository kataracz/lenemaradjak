import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/publisher-config", () => ({
  publishers: [
    { id: "pub1", name: "Publisher 1" },
    { id: "pub2", name: "Publisher 2" },
  ],
}));

import { useFilteredPublishers } from "@/hooks/useFilteredPublishers";

// Stable references at module scope — avoids re-creating arrays on every render
// which would cause useMemo to recompute on each tick.
const IDS_PUB1 = ["pub1"];
const IDS_BOTH = ["pub1", "pub2"];

describe("useFilteredPublishers", () => {
  it("returns only publishers matching the given ids", () => {
    const { result } = renderHook(() => useFilteredPublishers(IDS_PUB1));
    expect(result.current).toEqual([{ id: "pub1", name: "Publisher 1" }]);
  });

  it("returns multiple publishers in config order", () => {
    const { result } = renderHook(() => useFilteredPublishers(IDS_BOTH));
    expect(result.current.map((p) => p.id)).toEqual(["pub1", "pub2"]);
  });

  it("keeps the same array reference across re-renders with the same ids", () => {
    const { result, rerender } = renderHook(
      ({ ids }) => useFilteredPublishers(ids),
      { initialProps: { ids: IDS_PUB1 } },
    );
    const first = result.current;
    rerender({ ids: IDS_PUB1 });
    expect(result.current).toBe(first);
  });
});
