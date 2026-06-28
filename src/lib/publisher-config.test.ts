import { describe, it, expect } from "vitest";
import { publishers, defaultPublisherIds } from "@/lib/publisher-config";

describe("defaultPublisherIds", () => {
  it("matches publishers array ids in the same order", () => {
    expect(defaultPublisherIds).toEqual(publishers.map((p) => p.id));
  });
});
