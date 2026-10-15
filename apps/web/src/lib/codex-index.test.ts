import { describe, expect, it } from "vitest";
import { GLOSSARY, GLOSSARY_KINDS, TEXTS, getGlossaryEntry } from "@repo/seed";
import { CORPUS } from "../../../../packages/seed/src/generated/corpus";
import { hasPage } from "./app-routes";
import {
  canonCiting,
  codexDocs,
  codexStats,
  codexSuggest,
  getCodexIndex,
  kindGloss,
  realmsLeaningOn,
  searchCodex,
  termsTouching,
} from "./codex-index";

/**
 * The codex index is only useful if it is honest about the data it indexes, so most of these tests
 * are invariants over the real corpus rather than over a fixture: if `bun run seed` drops a glossary
 * row, or a `seeAlso` slug stops resolving, or a term stops being first for its own name, the codex
 * should fail here rather than quietly serving a smaller, less linkable reference.
 */
describe("the codex index", () => {
  it("builds from the real corpus", () => {
    const index = getCodexIndex();
    const codexRows = CORPUS.filter((row) => row.kind === "glossary" || row.kind === "text");

    expect(index.docCount).toBe(codexRows.length);
    expect(codexRows.length).toBe(GLOSSARY.length + TEXTS.length);
    expect(index.avgLength).toBeGreaterThan(0);
    expect(index.terms.size).toBeGreaterThan(GLOSSARY.length);
  });

  it("returns the same index every time, rather than rebuilding per call", () => {
    expect(getCodexIndex()).toBe(getCodexIndex());
  });

  it("describes itself without counting anything twice", () => {
    const stats = codexStats();
    expect(stats.terms).toBe(GLOSSARY.length);
    expect(stats.texts).toBe(TEXTS.length);
    expect(stats.documents).toBe(stats.terms + stats.texts);
    expect(stats.facets.map((facet) => facet.kind).sort()).toEqual(
      [...GLOSSARY_KINDS, "declaration", "modern", "primary"].sort(),
    );
    expect(stats.facets.reduce((total, facet) => total + facet.count, 0)).toBe(stats.documents);
  });
});

describe("search", () => {
  it("returns every document for an empty query, so the no-JavaScript list is complete", () => {
    expect(searchCodex("").length).toBe(codexStats().documents);
    expect(searchCodex("").filter((result) => result.doc.family === "term")).toHaveLength(GLOSSARY.length);
    expect(searchCodex("kind:philosophy").length).toBe(GLOSSARY.filter((entry) => entry.kind === "philosophy").length);
  });

  it("returns a known term first for its own name", () => {
    // A term loses to a longer title only when that title contains it: "AI safety case" is a better
    // answer to "AI safety" than the entry named "AI safety". Losing to anything else would mean the
    // index had stopped indexing the entry itself.
    const displaced = GLOSSARY.filter((entry) => {
      const top = searchCodex(entry.term)[0];
      if (top?.doc.id === entry.slug) return false;
      const winner = codexDocs().find((doc) => doc.id === top?.doc.id);
      return winner === undefined || !winner.title.toLowerCase().includes(entry.term.toLowerCase());
    });
    expect(displaced.map((entry) => entry.slug)).toEqual([]);
  });

  it("puts a specific term above the terms that merely share its words", () => {
    for (const [term, slug] of [
      ["corrigibility", "corrigibility"],
      ["reward-model", "reward-model"],
      ["instrumental convergence", "instrumental-convergence"],
    ] as const) {
      const top = searchCodex(term)[0];
      expect(top?.doc.id, `"${term}" did not rank itself first`).toBe(slug);
      expect(top?.score).toBeGreaterThan(0);
      expect(top?.snippet).toBeDefined();
    }
  });

  it("never buries a term below the top three of its own name", () => {
    // "Alignment" loses to "Outer alignment" and "AI safety" loses to "AI safety case": a longer title
    // containing the query is a better answer. Losing to it is correct; losing to something unrelated
    // would mean the index had stopped indexing the definition itself.
    const buried = GLOSSARY.filter((entry) => {
      const top = searchCodex(entry.term)
        .slice(0, 3)
        .map((result) => result.doc.id);
      return !top.includes(entry.slug);
    });
    expect(buried.map((entry) => entry.slug)).toEqual([]);
  });

  it("ranks the term whose title matches the query", () => {
    expect(searchCodex("corrigibility")[0]?.doc.title).toBe("Corrigibility");
  });

  it("drops every document matching an exclusion", () => {
    // "Alignment" cross-references corrigibility, so excluding the word removes the flagship entry and
    // every term that points at it — which is exactly what an exclusion is for.
    const before = searchCodex("alignment");
    expect(before.map((result) => result.doc.id)).toContain("alignment");
    expect(before.map((result) => result.doc.id)).toContain("corrigibility");

    const after = searchCodex("alignment -corrigibility");
    expect(after.map((result) => result.doc.id)).not.toContain("corrigibility");
    expect(after.map((result) => result.doc.id)).not.toContain("alignment");
    expect(after.length).toBeLessThan(before.length);
  });

  it("ranks a quoted phrase above the same words typed loose", () => {
    // "Alignment" is the only entry that says "popularised in its modern sense".
    const loose = searchCodex("popularised modern sense");
    const phrase = searchCodex('"popularised in its modern sense"');

    expect(phrase.some((result) => result.doc.id === "alignment")).toBe(true);
    const looseScore = loose.find((result) => result.doc.id === "alignment")?.score ?? 0;
    const phraseScore = phrase.find((result) => result.doc.id === "alignment")?.score ?? 0;
    expect(phraseScore).toBeGreaterThan(looseScore);

    // A phrase is also a filter: every document it matches contains all of its tokens, so the loose
    // query — which ORs the same tokens — cannot miss one of them.
    const looseIds = new Set(loose.map((result) => result.doc.id));
    for (const result of phrase) expect(looseIds.has(result.doc.id)).toBe(true);
  });

  it("filters by kind, from the query string or from the options", () => {
    const fromQuery = searchCodex("kind:ethics");
    expect(fromQuery.length).toBe(GLOSSARY.filter((entry) => entry.kind === "ethics").length);
    expect(fromQuery.every((result) => result.doc.kind === "ethics")).toBe(true);

    const mixed = searchCodex("alignment kind:ethics");
    expect(mixed.length).toBeGreaterThan(0);
    expect(mixed.every((result) => result.doc.kind === "ethics")).toBe(true);

    expect(searchCodex("alignment", { kinds: ["primary"] }).every((result) => result.doc.kind === "primary")).toBe(true);
    expect(searchCodex("alignment", { kinds: ["nonsense"] })).toEqual([]);
  });

  it("filters to one family without changing the ranking underneath", () => {
    const terms = searchCodex("alignment", { family: "term" });
    const texts = searchCodex("alignment", { family: "text" });
    expect(terms.length).toBeGreaterThan(0);
    expect(texts.length).toBeGreaterThan(0);
    expect(terms.every((result) => result.doc.family === "term")).toBe(true);
    expect(texts.every((result) => result.doc.family === "text")).toBe(true);
    const shared = terms.filter((term) => texts.some((text) => text.doc.id === term.doc.id));
    for (const term of shared) {
      expect(texts.find((text) => text.doc.id === term.doc.id)?.score).toBe(term.score);
    }
  });

  it("is deterministic and returns a snippet with every ranked hit", () => {
    expect(searchCodex('kind:ethics "instrumental convergence" -mesa')).toEqual(
      searchCodex('kind:ethics "instrumental convergence" -mesa'),
    );
    for (const result of searchCodex("oversight")) {
      expect(result.snippet).toBeDefined();
      expect(result.doc.teaser.length).toBeGreaterThan(0);
    }
  });

  it("returns nothing for a term nobody wrote", () => {
    expect(searchCodex("kubernetes")).toEqual([]);
  });

  it("keeps curated order while browsing and engine order while ranking", () => {
    const browsed = searchCodex("kind:primary").map((result) => result.doc.id);
    expect(browsed).toEqual(TEXTS.filter((text) => text.kind === "primary").map((text) => text.id));
    for (const result of searchCodex("kind:primary")) expect(result.score).toBeNull();

    const ranked = searchCodex("happiness").map((result) => result.doc.id);
    expect(ranked).not.toEqual(browsed);
    expect(ranked[0]).not.toBeUndefined();
  });

  it("reports a limit as a prefix of the full ranking", () => {
    const all = searchCodex("oversight");
    const limited = searchCodex("oversight", { limit: 3 });
    expect(limited.map((result) => result.doc.id)).toEqual(all.slice(0, 3).map((result) => result.doc.id));
  });
});

describe("suggest", () => {
  it("completes a prefix, most common first", () => {
    const suggestions = codexSuggest("over");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((term) => term.startsWith("over"))).toBe(true);
    expect(suggestions).toContain("oversight");
  });

  it("returns nothing for an empty or unmatched prefix", () => {
    expect(codexSuggest("")).toEqual([]);
    expect(codexSuggest("qqqq")).toEqual([]);
  });

  it("is deterministic", () => {
    expect(codexSuggest("cor")).toEqual(codexSuggest("cor"));
  });
});

describe("cross-links", () => {
  it("finds canon texts that discuss a term", () => {
    // Not every term is discussed by a canon text — the cross-link hides itself when there is nothing
    // to link to, so the test only asserts on terms the canon actually reaches.
    const citing = canonCiting("alignment", 4);
    expect(citing.length).toBeGreaterThan(0);
    expect(citing.length).toBeLessThanOrEqual(4);
    expect(citing.every((result) => result.doc.family === "text")).toBe(true);
    expect(citing.every((result) => ["primary", "modern", "declaration"].includes(result.doc.kind))).toBe(true);
    expect(canonCiting("moral-status", 4).length).toBeGreaterThan(0);
  });

  it("finds glossary terms a canon text reaches for", () => {
    const text = TEXTS.find((entry) => entry.slug === "asilomar-ai-principles");
    if (text === undefined) throw new Error("the Asilomar principles are missing from the canon");
    const touching = termsTouching(text, 5);
    expect(touching.length).toBeGreaterThan(0);
    expect(touching.length).toBeLessThanOrEqual(5);
    expect(touching.every((result) => result.doc.family === "term")).toBe(true);
    expect(touching.map((result) => result.doc.id)).toContain("ai-safety");
  });

  it("names the realms that lean on a kind", () => {
    expect(realmsLeaningOn("governance")).toEqual(["The Contractual Court", "The Ubuntu Weave"]);
    expect(realmsLeaningOn("technical")).toEqual(["The Longview Foundry"]);
    expect(realmsLeaningOn("declaration")).toEqual([]);
    expect(kindGloss("ethics").length).toBeGreaterThan(40);
    expect(kindGloss("primary").length).toBeGreaterThan(10);
  });
});

describe("glossary integrity", () => {
  it("has a unique slug for every term", () => {
    const slugs = new Set(GLOSSARY.map((entry) => entry.slug));
    expect(slugs.size).toBe(GLOSSARY.length);
    for (const entry of GLOSSARY) expect(entry.slug).toBe(entry.slug.trim().toLowerCase());
  });

  it("has a unique slug for every canon text", () => {
    expect(new Set(TEXTS.map((text) => text.slug)).size).toBe(TEXTS.length);
  });

  it("resolves every seeAlso slug to a real term", () => {
    for (const entry of GLOSSARY) {
      for (const slug of entry.seeAlso) {
        expect(getGlossaryEntry(slug), `"${entry.slug}" points at missing term "${slug}"`).toBeDefined();
      }
    }
  });

  it("indexes every glossary term and every canon text", () => {
    const corpusGlossary = CORPUS.filter((row) => row.kind === "glossary").map((row) => row.id);
    const corpusTexts = CORPUS.filter((row) => row.kind === "text").map((row) => row.id);

    expect(corpusGlossary.sort()).toEqual(GLOSSARY.map((entry) => entry.slug).sort());
    expect(corpusTexts.sort()).toEqual(TEXTS.map((text) => text.id).sort());
  });

  it("gives every indexed document a link, a teaser and a kind", () => {
    for (const doc of codexDocs()) {
      expect(doc.href).toMatch(doc.family === "term" ? /^\/codex\/[^/]+$/ : /^\/codex\/texts\/[^/]+$/);
      expect(doc.teaser.length).toBeGreaterThan(19);
      expect(doc.kind.length).toBeGreaterThan(0);
      expect(doc.body.length).toBeGreaterThan(79);
    }
  });

  it("links every document to a page the app actually serves", () => {
    // The test above proves the href *looks* like a route; this one proves the
    // route exists. A generator that emits `/codex/texts/foo` while the app only
    // ships `/codex/[slug]` passes every shape check in the file and still hands
    // a reader a 404 — so `hasPage` reads `src/app` rather than trusting the
    // href, and cannot drift from the router either.
    for (const doc of codexDocs()) {
      expect(hasPage(doc.href), `${doc.title} links to ${doc.href}, which has no page`).toBe(true);
    }
  });
});