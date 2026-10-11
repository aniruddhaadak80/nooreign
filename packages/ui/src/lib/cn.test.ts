import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("flattens conditional class inputs", () => {
    expect(cn("a", false && "b", ["c", undefined], { d: true, e: false })).toBe("a c d");
  });

  it("lets the later Tailwind utility win a conflict", () => {
    expect(cn("px-2", "px-8")).toBe("px-8");
    expect(cn("text-parchment", "text-gold")).toBe("text-gold");
  });

  it("keeps non-conflicting utilities", () => {
    expect(cn("flex items-center", "gap-2")).toBe("flex items-center gap-2");
  });

  it("returns an empty string for no input", () => {
    expect(cn()).toBe("");
    expect(cn(undefined, null)).toBe("");
  });
});