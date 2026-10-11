import { describe, expect, it } from "vitest";
import type { SearchableDoc } from "./index";
import { buildIndex, parseQuery, query, suggest, tokenize } from "./index";

/**
 * A deliberately mixed corpus: a primary text, a modern paper, a declaration, two entries that are
 * deliberately word-for-word identical (for tie determinism) and one short glossary stub.
 */
const DOCS: SearchableDoc[] = [
  {
    id: "b",
    title: "The paperclip maximiser",
    body:
      "An optimiser asked to make paperclips will make paperclips. Give it enough capability and the paperclip objective stops being a hobby and becomes a world order. Monitoring slows the expansion without ever supplying a stopping condition.",
    kind: "modern",
    tags: ["alignment", "instrumental convergence"],
    year: 2003,
  },
  {
    id: "a",
    title: "The paperclip maximiser",
    body:
      "An optimiser asked to make paperclips will make paperclips. Give it enough capability and the paperclip objective stops being a hobby and becomes a world order. Monitoring slows the expansion without ever supplying a stopping condition.",
    kind: "modern",
    tags: ["alignment", "instrumental convergence"],
    year: 2003,
  },
  {
    id: "c",
    title: "Reifying the proxy",
    body:
      "When a measure becomes a target it stops being a good measure. Strathern adds the part that matters for machines: the human decision to keep optimising after the measure stopped measuring. Goodhart wrote it about monetary policy.",
    kind: "primary",
    tags: ["ethics", "specification"],
    year: 1975,
  },
  {
    id: "d",
    title: "Delft Declaration on AI",
    body:
      "We declare that oversight must be proportional to capability, that an agent which can act deserves standing, and that the people who bear a risk must be the people consulted about it.",
    kind: "declaration",
    tags: ["governance"],
    year: 2024,
  },
  {
    id: "e",
    title: "Mesa",
    body: "A learned optimiser that is optimising something.",
    kind: "glossary",
    tags: ["technical"],
  },
];

const index = buildIndex(DOCS);

describe("tokenize", () => {
  it("lowercases, splits on punctuation and drops stopwords", () => {
    expect(tokenize("The Oversight, and the Audit.")).toEqual(["oversight", "audit"]);
  });

  it("keeps digits because the chronicle needs them", () => {
    expect(tokenize("RLHF in 2022")).toEqual(["rlhf", "2022"]);
  });
});

describe("buildIndex", () => {
  it("records document frequency and term frequency", () => {
    expect(index.docCount).toBe(5);
    expect(index.terms.get("paperclip")?.df).toBe(2);
    // "paperclip" once in the body plus once in the title.
    expect(index.terms.get("paperclip")?.postings.get("a")).toBe(2);
    expect(index.terms.get("paperclips")?.df).toBe(2);
    expect(index.terms.get("glossary")).toBeUndefined();
  });

  it("folds tags into the body tokens so tags are searchable", () => {
    expect(index.docs.get("d")?.bodyTokens).toContain("governance");
    expect(index.docs.get("d")?.year).toBe(2024);
    expect(index.docs.get("e")?.year).toBeNull();
  });

  it("measures average document length", () => {
    expect(index.avgLength).toBeGreaterThan(0);
    expect(buildIndex([]).avgLength).toBe(0);
  });
});

describe("parseQuery", () => {
  it("splits terms, phrases, exclusions and kind filters", () => {
    const parsed = parseQuery('oversight "scalable oversight" -paperclip kind:declaration');
    expect(parsed.terms).toEqual(["oversight"]);
    expect(parsed.phrases).toEqual([["scalable", "oversight"]]);
    expect(parsed.exclude).toEqual(["paperclip"]);
    expect(parsed.kinds).toEqual(["declaration"]);
  });

  it("de-duplicates repeated terms and survives an unclosed quote", () => {
    expect(parseQuery("audit audit").terms).toEqual(["audit"]);
    expect(parseQuery('"unclosed phrase').phrases).toEqual([["unclosed", "phrase"]]);
  });

  it("does not treat a negated kind: as a filter", () => {
    expect(parseQuery("-kind:declaration").kinds).toEqual([]);
    expect(parseQuery("-kind:declaration").exclude).toEqual(["kind", "declaration"]);
  });
});

describe("query", () => {
  it("ranks by relevance", () => {
    const hits = query(index, "paperclip objective");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.id).toBe("a");
    expect(hits[1]?.id).toBe("b");
  });

  it("breaks an exact score tie on id, ascending, and does so repeatably", () => {
    // `a` and `b` are word-for-word identical, so they tie by construction.
    const first = query(index, "paperclip maximiser");
    const second = query(index, "paperclip maximiser");
    const a = first.find((h) => h.id === "a");
    const b = first.find((h) => h.id === "b");
    expect(a?.score).toBe(b?.score);
    expect(first.map((h) => h.id).indexOf("a")).toBeLessThan(first.map((h) => h.id).indexOf("b"));
    expect(second).toEqual(first);
  });

  it("boosts a phrase over loose terms", () => {
    const loose = query(index, "world order");
    const phrase = query(index, '"world order"');
    const looseTop = loose.find((h) => h.id === "a")?.score ?? 0;
    const phraseTop = phrase.find((h) => h.id === "a")?.score ?? 0;
    expect(phraseTop).toBeGreaterThan(looseTop);
  });

  it("honours a quoted phrase as a filter the loose terms would miss", () => {
    // `stopping condition` appears in the paperclip docs; `measure` appears in the Goodhart doc.
    expect(query(index, '"stopping condition"').map((h) => h.id).sort()).toEqual(["a", "b"]);
    expect(query(index, '"measuring"').map((h) => h.id)).toEqual(["c"]);
  });

  it("removes documents matching an exclusion", () => {
    const hits = query(index, "objective -paperclip");
    expect(hits.map((h) => h.id)).not.toContain("a");
    expect(hits.map((h) => h.id)).not.toContain("b");
  });

  it("filters by kind, from the query string or the options", () => {
    expect(query(index, "oversight kind:declaration").map((h) => h.id)).toEqual(["d"]);
    expect(query(index, "measure", { kinds: ["primary"] }).map((h) => h.id)).toEqual(["c"]);
    expect(query(index, "measure", { kinds: ["nope"] })).toEqual([]);
  });

  it("respects limit and minScore", () => {
    expect(query(index, "paperclip", { limit: 1 })).toHaveLength(1);
    const all = query(index, "paperclip");
    const cut = query(index, "paperclip", { minScore: (all[0]?.score ?? 1) + 1 });
    expect(cut).toEqual([]);
  });

  it("returns nothing for a term nobody wrote", () => {
    expect(query(index, "kubernetes")).toEqual([]);
    expect(query(index, "")).toEqual([]);
  });

  it("picks the densest window of the body for the snippet", () => {
    const long: SearchableDoc[] = [
      {
        id: "long",
        title: "Irrelevant heading",
        body: `${"filler ".repeat(60)} The oversight argument resumes here. Oversight again, and oversight once more.`,
        kind: "primary",
        tags: [],
      },
    ];
    const hit = query(buildIndex(long), "oversight")[0];
    const snippet = hit?.snippet ?? "";
    // Snippets are token-normalised: lower-cased, with the stopwords the indexer dropped.
    expect(snippet).toContain("oversight argument resumes here oversight again oversight");
    expect(snippet).toContain("…");
    expect(snippet.split("oversight").length - 1).toBe(3);
    // The window is anchored on the dense region, not on the start of the document.
    expect(snippet.startsWith("… ")).toBe(true);
  });

  it("shows a whole short body without an ellipsis", () => {
    const hit = query(index, "mesa")[0];
    expect(hit?.snippet).toBe("learned optimiser optimising something technical");
    expect(hit?.snippet).not.toContain("…");
  });

  it("is deterministic across repeated calls", () => {
    expect(query(index, "oversight")).toEqual(query(index, "oversight"));
    expect(query(index, 'kind:modern "world order" -paperclip')).toEqual(
      query(index, 'kind:modern "world order" -paperclip'),
    );
  });
});

describe("suggest", () => {
  it("completes a prefix, most common first", () => {
    expect(suggest(index, "paper")).toEqual(["paperclip", "paperclips"]);
    expect(suggest(index, "over", 5).every((t) => t.startsWith("over"))).toBe(true);
    expect(suggest(index, "over", 1)).toEqual(["oversight"]);
  });

  it("ranks by document frequency", () => {
    // "measure" appears twice in the Goodhart entry; "measuring" once.
    expect(suggest(index, "meas")).toEqual(["measure", "measuring"]);
  });

  it("returns nothing for an empty or unmatched prefix", () => {
    expect(suggest(index, "")).toEqual([]);
    expect(suggest(index, "zzz")).toEqual([]);
    expect(suggest(index, "paper", 0)).toEqual([]);
  });

  it("is deterministic", () => {
    expect(suggest(index, "a")).toEqual(suggest(index, "a"));
  });
});