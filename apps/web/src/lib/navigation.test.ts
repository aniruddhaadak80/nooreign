import { describe, expect, it } from "vitest";
import { ATLAS_STATS, DILEMMAS, KINGDOMS } from "@repo/seed";
import { formatShortYear, formatSpan, formatYear } from "@/components/atlas/format";
import { NAV_BY_HREF, NAV_SECTIONS } from "./navigation";

describe("BCE year formatting", () => {
  it("renders negative years as BCE and positive years as CE", () => {
    expect(formatYear(-350)).toBe("350 BCE");
    expect(formatYear(1986)).toBe("1986 CE");
  });

  it("treats year zero as the hinge rather than a year that never existed", () => {
    expect(formatYear(0)).toBe("1 BCE / 1 CE");
  });

  it("has a compact form without the era suffix", () => {
    expect(formatShortYear(-470)).toBe("470 BCE");
    expect(formatShortYear(2026)).toBe("2026");
  });

  it("collapses a single-year span", () => {
    expect(formatSpan(1986, 1986)).toBe("1986");
    expect(formatSpan(-470, -399)).toBe("470 BCE – 399 BCE");
    expect(formatSpan(1770, 1781)).toBe("1770 – 1781");
  });
});

describe("navigation", () => {
  it("has no duplicate hrefs", () => {
    const hrefs = NAV_SECTIONS.map((section) => section.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("gives every section a hint and keywords for the command palette", () => {
    for (const section of NAV_SECTIONS) {
      expect(section.label.length).toBeGreaterThan(0);
      expect(section.hint.length).toBeGreaterThan(10);
      expect(section.keywords.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("indexes every section by href", () => {
    for (const section of NAV_SECTIONS) {
      expect(NAV_BY_HREF.get(section.href)).toEqual(section);
    }
  });

  it("links only to routes the atlas actually serves", () => {
    // Every header link has a page; a dead link in the chrome is the most
    // embarrassing bug this repository can ship.
    const routes = new Set([
      "/",
      "/kingdoms",
      "/court",
      "/council",
      "/dilemmas",
      "/chronicle",
      "/observatory",
      "/experiments",
      "/codex",
      "/method",
    ]);
    for (const section of NAV_SECTIONS) {
      expect(routes.has(section.href), `${section.href} has no page`).toBe(true);
    }
  });
});

describe("dataset invariants the UI depends on", () => {
  it("twelve kingdoms, twenty dilemmas", () => {
    expect(ATLAS_STATS.kingdoms).toBe(12);
    expect(ATLAS_STATS.dilemmas).toBe(20);
    expect(KINGDOMS).toHaveLength(ATLAS_STATS.kingdoms);
    expect(DILEMMAS).toHaveLength(ATLAS_STATS.dilemmas);
  });

  it("every dilemma offers at least two options and a real prompt", () => {
    for (const dilemma of DILEMMAS) {
      expect(dilemma.options.length).toBeGreaterThanOrEqual(2);
      expect(dilemma.prompt.length).toBeGreaterThan(40);
      expect(dilemma.slug).not.toBe("");
    }
  });

  it("every kingdom plots inside the atlas plane", () => {
    for (const kingdom of KINGDOMS) {
      expect(kingdom.capital.x).toBeGreaterThanOrEqual(0);
      expect(kingdom.capital.x).toBeLessThanOrEqual(100);
      expect(kingdom.capital.y).toBeGreaterThanOrEqual(0);
      expect(kingdom.capital.y).toBeLessThanOrEqual(100);
    }
  });
});
