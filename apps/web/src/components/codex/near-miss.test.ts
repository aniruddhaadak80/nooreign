import { describe, expect, it } from "vitest";
import { buildIndex } from "@repo/core";
import type { SearchableDoc } from "@repo/core";
import { queryCorrections } from "./near-miss";

/**
 * A fixture index rather than the real corpus: the behaviour under test is "which word does the reader
 * most plausibly mean", and a five-word vocabulary makes every expected distance legible in the test
 * rather than importable from the seed. The vocabulary is real codex terms so the examples read true.
 */
const docs: SearchableDoc[] = [
  {
    id: "d-oversight",
    title: "Scalable oversight",
    body: "oversight alignment corrigibility",
    kind: "alignment",
    tags: [],
  },
  {
    id: "d-consequentialism",
    title: "Consequentialism",
    body: "utilitarianism utilitarian utility happiness",
    kind: "declaration",
    tags: [],
  },
  {
    id: "d-goodhart",
    title: "Goodhart's law",
    body: "goodhart metric proxy",
    kind: "technical",
    tags: [],
  },
];

const index = buildIndex(docs);

describe("queryCorrections", () => {
  it("corrects a single misspelled term", () => {
    expect(queryCorrections(index, "utiliterianism")).toEqual([
      { query: "utilitarianism", replaced: ["utiliterianism"] },
    ]);
  });

  it("offers nothing while the query is sound or hopeless", () => {
    expect(queryCorrections(index, "oversight alignment")).toEqual([]);
    expect(queryCorrections(index, "")).toEqual([]);
    expect(queryCorrections(index, "   ")).toEqual([]);
    expect(queryCorrections(index, "zzzzzz")).toEqual([]);
  });

  it("does not 'correct' a word the index contains, even when the filters leave nothing", () => {
    // An empty result set for a real term is the reader's own doing — a correction would be a lie.
    expect(queryCorrections(index, "oversight kind:declaration")).toEqual([]);
  });

  it("fixes every typo first, then one at a time", () => {
    const corrections = queryCorrections(index, "overisght utiliterianism");
    expect(corrections).toEqual([
      { query: "oversight utilitarianism", replaced: ["overisght", "utiliterianism"] },
      { query: "oversight utiliterianism", replaced: ["overisght"] },
      { query: "overisght utilitarianism", replaced: ["utiliterianism"] },
    ]);
  });

  it("leaves quoted phrases and kind filters untouched", () => {
    expect(queryCorrections(index, '"scalable oversight" overisght')).toEqual([
      { query: '"scalable oversight" oversight', replaced: ["overisght"] },
    ]);
    expect(queryCorrections(index, "kind:alignment overisght")).toEqual([
      { query: "kind:alignment oversight", replaced: ["overisght"] },
    ]);
  });

  it("corrects an excluded term and keeps the minus sign", () => {
    expect(queryCorrections(index, "oversight -goodheart")).toEqual([
      { query: "oversight -goodhart", replaced: ["goodheart"] },
    ]);
  });

  it("deduplicates a word the parser folds into one term", () => {
    expect(queryCorrections(index, "utiliterianism utiliterianism")).toEqual([
      { query: "utilitarianism", replaced: ["utiliterianism"] },
    ]);
  });

  it("honours the limit, including zero", () => {
    const raw = "overisght utiliterianism goodheart";
    expect(queryCorrections(index, raw, 1)).toHaveLength(1);
    expect(queryCorrections(index, raw, 1)[0]?.query).toBe("oversight utilitarianism goodhart");
    expect(queryCorrections(index, raw)).toHaveLength(3);
    expect(queryCorrections(index, raw, 0)).toEqual([]);
  });

  it("returns the same candidates on every call", () => {
    expect(queryCorrections(index, "overisght utiliterianism")).toEqual(
      queryCorrections(index, "overisght utiliterianism"),
    );
  });
});
