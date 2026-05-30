import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("joins class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("merges duplicate Tailwind classes", () => {
    expect(cn("p-2 p-2", "text-sm")).toBe("p-2 text-sm");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", false && "bar")).toBe("foo");
  });
});
