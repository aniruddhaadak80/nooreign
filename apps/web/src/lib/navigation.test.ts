import { describe, expect, it } from "vitest";
import { ATLAS_STATS, DILEMMAS, KINGDOMS } from "@repo/seed";
import { formatShortYear, formatSpan, formatYear } from "@/components/atlas/format";
import { NAV_BY_HREF, NAV_SECTIONS } from "./navigation";
import { hasPage, topLevelRoutes } from "./app-routes";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

/** The footer links, mirrored here so the reachability check above stays honest. */
const FOOTER_HREFS: readonly string[] = [
  "/method",
  "https://github.com/aniruddhaadak80/nooreign",
  "https://github.com/aniruddhaadak80/nooreign/blob/main/CONTRIBUTING.md",
  "https://github.com/aniruddhaadak80/nooreign/issues",
];

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
    //
    // The route list is scanned from `src/app` rather than hand-maintained here.
    // A hardcoded list is a test that agrees with you about a lie: it passes
    // exactly as long as nobody remembers to update it when a page moves. This
    // one cannot drift, and adding a page without linking it still fails
    // `indexes every page in the navigation` below.
    for (const section of NAV_SECTIONS) {
      expect(hasPage(section.href), `${section.href} has no page`).toBe(true);
    }
  });

  it("indexes every top-level page in the navigation or the footer", () => {
    // The converse of the test above: a page nobody links to is unreachable.
    // `/compare/<slug>` and `/journal` are covered by the footer column set.
    const linked = new Set(NAV_SECTIONS.map((section) => section.href));
    for (const href of FOOTER_HREFS) linked.add(href);
    for (const route of topLevelRoutes()) {
      expect(linked.has(route), `${route} exists but nothing links to it`).toBe(true);
    }
  });
});

describe("the sitemap", () => {
  it("advertises only URLs the atlas actually serves", () => {
    // Crawlers are told about these URLs, so a hand-written pattern that has
    // drifted from the router publishes a list of 404s to Google — and unlike a
    // broken nav link, nobody clicks it and notices. `hasPage` reads `src/app`.
    for (const { url } of sitemap()) {
      expect(hasPage(new URL(url).pathname), `${url} is in the sitemap but has no page`).toBe(true);
    }
  });

  it("advertises every top-level route", () => {
    // The converse: a page that exists but is never advertised is invisible to
    // crawlers, and `topLevelRoutes()` reads the filesystem, so this cannot be
    // satisfied by remembering to edit a list.
    const advertised = new Set(sitemap().map(({ url }) => new URL(url).pathname));
    for (const route of topLevelRoutes()) {
      expect(advertised.has(route), `${route} exists but the sitemap never mentions it`).toBe(true);
    }
  });

  it("agrees with robots.txt about the origin", () => {
    // `sitemap.ts` and `robots.ts` each declare the canonical origin in their
    // own file. If they disagree, robots.txt points crawlers at a sitemap on a
    // host that does not serve one.
    const { host } = robots();
    expect(host).toBeTruthy();
    for (const { url } of sitemap()) {
      expect(new URL(url).origin, `${url} disagrees with robots.txt`).toBe(host);
    }
    expect(robots().sitemap).toEqual([`${host}/sitemap.xml`]);
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
