import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  OG_ID_MAX,
  OG_KICKER_MAX,
  OG_KINDS,
  OG_TITLE_MAX,
  ellipsize,
  isOgKind,
  parseOgParams,
} from "./og-params";

describe("parseOgParams", () => {
  it("returns every field null for a bare request", () => {
    expect(parseOgParams("")).toEqual({ kind: null, id: null, title: null, kicker: null, unknownKind: false });
    expect(parseOgParams("?")).toEqual({ kind: null, id: null, title: null, kicker: null, unknownKind: false });
    expect(parseOgParams(new URLSearchParams())).toEqual({
      kind: null,
      id: null,
      title: null,
      kicker: null,
      unknownKind: false,
    });
  });

  it("reads every kind the atlas knows how to look up", () => {
    for (const kind of OG_KINDS) {
      expect(parseOgParams(`?kind=${kind}&id=x`).kind).toBe(kind);
    }
  });

  it("normalises case and padding on the kind", () => {
    expect(parseOgParams("?kind=%20Kingdom%20").kind).toBe("kingdom");
    expect(parseOgParams("?kind=DILEMMA").kind).toBe("dilemma");
  });

  it("folds the id to lower case so a shouted slug still resolves", () => {
    expect(parseOgParams("?kind=kingdom&id=Kantian-Citadel").id).toBe("kantian-citadel");
  });

  it("flags a supplied kind that names nothing in the registry", () => {
    const parsed = parseOgParams("?kind=not-a-kind&id=x");
    expect(parsed.unknownKind).toBe(true);
    expect(parsed.kind).toBeNull();
  });

  it("treats an empty kind as absent rather than broken", () => {
    // Link builders emit `?kind=` for every empty optional field; a 400 there
    // would break the card for a URL that is asking for the default.
    const parsed = parseOgParams("?kind=&id=");
    expect(parsed.unknownKind).toBe(false);
    expect(parsed.kind).toBeNull();
    expect(parsed.id).toBeNull();
  });

  it("treats whitespace-only values as absent", () => {
    const parsed = parseOgParams("?kind=%20&id=%20&title=%20%20&kicker=%0A%0A");
    expect(parsed).toEqual({ kind: null, id: null, title: null, kicker: null, unknownKind: false });
  });

  it("keeps an id when the kind is missing, so the route can still try", () => {
    expect(parseOgParams("?id=kantian-citadel")).toEqual({
      kind: null,
      id: "kantian-citadel",
      title: null,
      kicker: null,
      unknownKind: false,
    });
  });

  it("keeps the title and kicker exactly as written apart from whitespace runs", () => {
    const parsed = parseOgParams("?title=%20The%20%20Kantian%20Citadel%20&kicker=realm%20%C2%B7%20citadel");
    expect(parsed.title).toBe("The Kantian Citadel");
    expect(parsed.kicker).toBe("realm · citadel");
  });

  it("caps a hostile title and an over-long id", () => {
    const parsed = parseOgParams(`?title=${"a".repeat(5000)}&id=${"b".repeat(500)}`);
    expect(Array.from(parsed.title ?? "").length).toBe(OG_TITLE_MAX);
    expect(parsed.title?.endsWith("…")).toBe(true);
    expect(Array.from(parsed.id ?? "").length).toBe(OG_ID_MAX);
  });

  it("caps the kicker independently of the title", () => {
    const parsed = parseOgParams(`?kicker=${"k".repeat(500)}`);
    expect(Array.from(parsed.kicker ?? "").length).toBe(OG_KICKER_MAX);
  });

  it("prefers the first value when a param is repeated", () => {
    expect(parseOgParams("?kind=era&kind=kingdom").kind).toBe("era");
  });

  it("decodes percent-encoded values", () => {
    expect(parseOgParams("?title=Caf%C3%A9%20%26%20Co").title).toBe("Café & Co");
  });
});

describe("isOgKind", () => {
  it("accepts only the registry", () => {
    expect(isOgKind("kingdom")).toBe(true);
    expect(isOgKind("glossary")).toBe(true);
    expect(isOgKind("Kingdom")).toBe(false);
    expect(isOgKind("techniquez")).toBe(false);
    expect(isOgKind("")).toBe(false);
  });
});

describe("ellipsize", () => {
  it("leaves short strings alone", () => {
    expect(ellipsize("abyss", 10)).toBe("abyss");
    expect(ellipsize("exactlyten", 10)).toBe("exactlyten");
  });

  it("cuts to at most `max` code points", () => {
    const result = ellipsize("abcdefghij", 4);
    expect(result).toBe("abc…");
    expect(Array.from(result).length).toBe(4);
  });

  it("never splits a surrogate pair", () => {
    const result = ellipsize("align 🌍 intelligence", 8);
    expect(Array.from(result).length).toBeLessThanOrEqual(8);
    expect(result).toBe(ellipsize("align 🌍 intelligence", 8));
    expect(result.endsWith("\uFFFD")).toBe(false);
  });

  it("drops the trailing space an ellipsis would otherwise follow", () => {
    // 12 code points cuts at "the courts |" — the space must not survive.
    expect(ellipsize("the courts deliberate", 12)).toBe("the courts…");
  });

  it("degrades sensibly at the edges", () => {
    expect(ellipsize("anything", 0)).toBe("");
    expect(ellipsize("anything", -5)).toBe("");
    expect(ellipsize("anything", 1)).toBe("…");
  });
});

/* ------------------------------------------------------------------ *
 * Palette contract
 *
 * satori renders the card from a detached style tree and never sees a CSS
 * cascade, so `og/route.tsx` has to spell the palette out in hex. That is the
 * one place in this app where a second copy of the design tokens is
 * unavoidable — so this block is what stops the copy from becoming a second
 * source of truth.
 * ------------------------------------------------------------------ */

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const HEX = /#[0-9a-fA-F]{6}\b/g;
const TOKEN = /--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g;

/** The `--color-*` tokens declared in the `@theme` block, lower-cased. */
function designTokens(): ReadonlyMap<string, string> {
  const tokens = new Map<string, string>();
  for (const match of read("../app/globals.css").matchAll(TOKEN)) {
    tokens.set((match[1] ?? "").toLowerCase(), (match[2] ?? "").toLowerCase());
  }
  return tokens;
}

/** Every hex literal written into the card route. */
function cardHexes(): ReadonlySet<string> {
  return new Set([...read("../app/og/route.tsx").matchAll(HEX)].map((match) => match[0].toLowerCase()));
}

describe("the OG card palette does not drift from the design system", () => {
  it("reuses globals.css tokens and invents no colour of its own", () => {
    const tokens = designTokens();
    const hexes = cardHexes();
    expect(hexes.size).toBeGreaterThan(0);
    for (const hex of hexes) {
      const owner = [...tokens].find(([, value]) => value === hex)?.[0];
      expect(owner, `${hex} is not a --color-* token in globals.css`).toBeDefined();
    }
  });

  it("keeps every token the card design leans on", () => {
    const tokens = designTokens();
    const hexes = cardHexes();
    const used = [
      "abyss",
      "abyss-raised",
      "abyss-border",
      "parchment",
      "parchment-dim",
      "crimson",
      "gold",
      "verdigris",
      "indigo-glow",
    ];
    for (const name of used) {
      const hex = tokens.get(name);
      expect(hex, `--color-${name} is gone from globals.css`).toBeDefined();
      expect(hexes.has(hex ?? ""), `the card no longer uses --color-${name}`).toBe(true);
    }
  });

  it("agrees with layout.tsx on the browser chrome colour", () => {
    const abyss = designTokens().get("abyss");
    expect(abyss).toBeDefined();
    expect(read("../app/layout.tsx")).toContain(`themeColor: "${abyss}"`);
  });
});