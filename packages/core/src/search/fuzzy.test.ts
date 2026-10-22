import { describe, expect, it } from "vitest";

import { boundedDistance, didYouMean, NEAR_MISS_MAX_DISTANCE } from "./fuzzy";
import { buildIndex, type SearchableDoc } from "./index";

const docs: SearchableDoc[] = [
  {
    id: "d-utilitarian",
    title: "Consequentialism",
    body: "utilitarianism utilitarian utility greatest happiness",
    kind: "declaration",
    tags: ["ethics"],
  },
  {
    id: "d-beast",
    title: "Beast",
    body: "beast",
    kind: "glossary",
    tags: [],
  },
  {
    id: "d-yeast",
    title: "Yeast",
    body: "yeast",
    kind: "glossary",
    tags: [],
  },
];

const index = buildIndex(docs);

describe("fuzzy / boundedDistance", () => {
  it("returns 0 for identical strings regardless of the budget", () => {
    expect(boundedDistance("oversight", "oversight", 0)).toBe(0);
    expect(boundedDistance("oversight", "oversight", 2)).toBe(0);
    expect(boundedDistance("", "", 0)).toBe(0);
  });

  it("counts insertions, deletions and substitutions", () => {
    expect(boundedDistance("abc", "abd", 2)).toBe(1);
    expect(boundedDistance("abc", "ab", 2)).toBe(1);
    expect(boundedDistance("ab", "abc", 2)).toBe(1);
    expect(boundedDistance("kitten", "sitting", 3)).toBe(3);
  });

  it("charges 2 for an adjacent transposition (Levenshtein, not Damerau)", () => {
    expect(boundedDistance("ab", "ba", 2)).toBe(2);
  });

  it("abandons as soon as the budget is provably blown", () => {
    expect(boundedDistance("kitten", "sitting", 2)).toBe(3);
    expect(boundedDistance("abcdef", "uvwxyz", 2)).toBe(3);
    expect(boundedDistance("", "abc", 2)).toBe(3);
  });

  it("is symmetric", () => {
    const pairs: Array<[string, string]> = [
      ["oversight", "obersight"],
      ["utilitarianism", "utiliterianism"],
      ["", "abc"],
      ["ab", "ba"],
    ];
    for (const [a, b] of pairs) {
      expect(boundedDistance(a, b, 3)).toBe(boundedDistance(b, a, 3));
    }
  });

  it("treats a zero budget as exact-match-only", () => {
    expect(boundedDistance("abc", "abd", 0)).toBe(1);
    expect(boundedDistance("", "a", 0)).toBe(1);
  });
});

describe("fuzzy / didYouMean", () => {
  it("recovers a stem misspelling from the index's own terms", () => {
    expect(didYouMean(index, "utiliterianism")).toEqual(["utilitarianism"]);
  });

  it("returns the exact term first when it is present", () => {
    expect(didYouMean(index, "utility")[0]).toBe("utility");
  });

  it("returns nothing for the empty query and for distant strings", () => {
    expect(didYouMean(index, "  ")).toEqual([]);
    expect(didYouMean(index, "zzzzzz")).toEqual([]);
  });

  it("honours the max distance and the limit", () => {
    // The stem misspelling is a single substitution away, so a one-edit budget
    // still recovers it; an exact-only budget recovers nothing.
    expect(didYouMean(index, "utiliterianism", { maxDistance: 1 })).toEqual(["utilitarianism"]);
    expect(didYouMean(index, "utiliterianism", { maxDistance: 0 })).toEqual([]);
    expect(didYouMean(index, "utiliterianism", { limit: 0 })).toEqual([]);
    expect(didYouMean(index, "utility", { limit: 1 })).toEqual(["utility"]);
  });

  it("breaks distance ties deterministically (code-unit order, insertion-independent)", () => {
    // "beast" and "yeast" are both one substitution away from "zeast".
    expect(didYouMean(index, "zeast")).toEqual(["beast", "yeast"]);

    const reversed = buildIndex([...docs].reverse());
    expect(didYouMean(reversed, "zeast")).toEqual(didYouMean(index, "zeast"));
  });

  it("defaults to a two-edit budget", () => {
    expect(NEAR_MISS_MAX_DISTANCE).toBe(2);
  });
});
