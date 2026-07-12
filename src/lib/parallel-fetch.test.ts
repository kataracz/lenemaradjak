import { describe, it, expect, vi, afterEach } from "vitest";
import { settleParallel } from "@/lib/parallel-fetch";

describe("settleParallel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("collects fulfilled values in input order", async () => {
    const { fulfilled, failedCount, firstError } = await settleParallel(
      [1, 2, 3],
      (n) => Promise.resolve(n * 2),
    );

    expect(fulfilled).toEqual([2, 4, 6]);
    expect(failedCount).toBe(0);
    expect(firstError).toBeUndefined();
  });

  it("counts failures and keeps the first error, logging each rejection", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const err1 = new Error("first");
    const err2 = new Error("second");

    const { fulfilled, failedCount, firstError } = await settleParallel(
      ["ok", "bad1", "bad2"],
      (input) => {
        if (input === "bad1") return Promise.reject(err1);
        if (input === "bad2") return Promise.reject(err2);
        return Promise.resolve(input);
      },
    );

    expect(fulfilled).toEqual(["ok"]);
    expect(failedCount).toBe(2);
    expect(firstError).toBe(err1);
    expect(console.error).toHaveBeenCalledWith(err1);
    expect(console.error).toHaveBeenCalledWith(err2);
  });

  it("returns an empty result for an empty input list", async () => {
    const { fulfilled, failedCount, firstError } = await settleParallel(
      [] as number[],
      (n) => Promise.resolve(n),
    );

    expect(fulfilled).toEqual([]);
    expect(failedCount).toBe(0);
    expect(firstError).toBeUndefined();
  });
});
