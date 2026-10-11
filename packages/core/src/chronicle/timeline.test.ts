import { describe, expect, it } from "vitest";
import type { Era, Technique } from "@repo/seed/types";
import { ERAS, TECHNIQUES, T } from "./fixtures";
import {
  HIGHLIGHT_COUNT,
  buildRail,
  diffEras,
  eraAtYear,
  eraIndex,
  highlightEras,
  milestonesFor,
  positionToYear,
  progressOf,
  sortEras,
  stackAtYear,
  techniquesBornBetween,
  yearToPosition,
} from "./timeline";

/** Half a year: `positionToYear` rounds to whole years, so that is the round-trip budget. */
const ROUND_TRIP_TOLERANCE = 0.5;

const at = <T,>(xs: readonly T[], index: number): T => {
  const found = xs[index];
  if (found === undefined) throw new Error(`no entry at index ${index}`);
  return found;
};

const byId = <T extends { id: string }>(xs: readonly T[], id: string): T => {
  const found = xs.find((x) => x.id === id);
  if (found === undefined) throw new Error(`no entry ${id}`);
  return found;
};

const eraById = (id: string): Era => byId(ERAS, id);

describe("sortEras", () => {
  it("orders chronologically across the BCE/CE boundary", () => {
    const shuffled = [...ERAS].reverse();
    const years = sortEras(shuffled).map((e) => e.startYear);
    expect(years).toEqual([-399, -286, -27, 354, 1215, 1651, 1848, 1956]);
    for (let i = 1; i < years.length; i += 1) {
      expect(years[i]).toBeGreaterThan(years[i - 1] ?? 0);
    }
  });

  it("is stable and non-mutating", () => {
    const before = [...ERAS];
    sortEras(ERAS);
    expect(ERAS).toEqual(before);
  });
});

describe("eraAtYear", () => {
  it("finds the era that contains the year, including BCE years", () => {
    expect(eraAtYear(ERAS, -399)?.id).toBe("socratic-turn");
    expect(eraAtYear(ERAS, -300)?.id).toBe("socratic-turn");
    expect(eraAtYear(ERAS, 1215)?.id).toBe("medieval-rights");
    expect(eraAtYear(ERAS, 2026)?.id).toBe("cybernetics-era");
  });

  it("returns null in the gap between two eras", () => {
    // Roman law closes in 212 and late-antique law opens in 354: nothing is being claimed for 300 AD.
    expect(eraAtYear(ERAS, 300)).toBeNull();
  });
});

describe("eraIndex", () => {
  it("produces contiguous windows — an era runs to the day before the next one starts", () => {
    const index = eraIndex(ERAS);
    expect(index).toHaveLength(8);
    for (let i = 0; i < index.length - 1; i += 1) {
      const current = index[i];
      const next = index[i + 1];
      if (current === undefined || next === undefined) throw new Error("gap in index");
      expect(current.span.endYear).toBe(next.startYear - 1);
      expect(current.position).toBeCloseTo(i / (index.length - 1), 10);
    }
  });

  it("gives the final era its full declared span", () => {
    const last = at(eraIndex(ERAS), 7);
    expect(last.id).toBe("cybernetics-era");
    expect(last.span.endYear).toBe(2026);
    expect(last.span.years).toBe(2026 - 1956 + 1);
    expect(last.index).toBe(7);
  });

  it("memoises on the identity of the input array", () => {
    expect(eraIndex(ERAS)).toBe(eraIndex(ERAS));
  });
});

describe("stackAtYear", () => {
  it("returns nothing before the first technique existed", () => {
    expect(stackAtYear(TECHNIQUES, 1985)).toHaveLength(0);
  });

  it("returns only what existed by the given year, oldest first", () => {
    const stack = stackAtYear(TECHNIQUES, 2020);
    expect(stack.map((t) => t.id)).toEqual([T.expertJudgement, T.preferenceData, T.probes]);
    for (const technique of stack) expect(technique.introduced).toBeLessThanOrEqual(2020);
  });

  it("returns the whole stack at 2026", () => {
    const stack = stackAtYear(TECHNIQUES, 2026);
    expect(stack).toHaveLength(TECHNIQUES.length);
    expect(stack.map((t) => t.id)).toContain(T.tripwire);
  });

  it("does not mutate the source array", () => {
    const order = TECHNIQUES.map((t) => t.id);
    stackAtYear(TECHNIQUES, 2026);
    expect(TECHNIQUES.map((t) => t.id)).toEqual(order);
  });
});

describe("techniquesBornBetween", () => {
  it("is inclusive at both ends", () => {
    expect(techniquesBornBetween(TECHNIQUES, 2019, 2021).map((t) => t.id)).toEqual([
      T.preferenceData,
      T.probes,
      T.staticEvals,
    ]);
  });

  it("tolerates a reversed window", () => {
    expect(techniquesBornBetween(TECHNIQUES, 2021, 2019)).toEqual(techniquesBornBetween(TECHNIQUES, 2019, 2021));
  });
});

describe("diffEras", () => {
  it("reports techniques, figures and topics gained across a domain change", () => {
    const diff = diffEras(eraById("machine-era"), eraById("cybernetics-era"));
    expect(diff.addedTechniques).toHaveLength(8);
    expect(diff.addedTechniques).toContain(T.scalableOversight);
    expect(diff.emergentFigures).toEqual(["Stuart Russell", "Yann LeCun", "Geoffrey Hinton", "Yoshua Bengio"]);
    expect(diff.advancedTopics).toContain("RLHF");
    expect(diff.yearsApart).toBe(108);
    expect(diff.domainsCrossed).toEqual(["governance", "computing"]);
  });

  it("omits domainsCrossed when both eras sit in the same domain", () => {
    const diff = diffEras(eraById("socratic-turn"), eraById("hellenistic-doubt"));
    expect(diff.domainsCrossed).toBeUndefined();
    expect("domainsCrossed" in diff).toBe(false);
    expect(diff.yearsApart).toBe(113);
    expect(diff.emergentFigures).toContain("Pyrrho");
  });
});

describe("buildRail", () => {
  const rail = buildRail(ERAS);

  it("spaces the stops evenly across 0..1", () => {
    expect(rail.stops).toHaveLength(8);
    expect(rail.stops[0]?.position).toBe(0);
    expect(rail.stops[7]?.position).toBe(1);
    const step = 1 / 7;
    rail.stops.forEach((stop, i) => {
      expect(stop.position).toBeCloseTo(i * step, 10);
      expect(stop.eraId).toBe(sortEras(ERAS)[i]?.id);
    });
  });

  it("round-trips years across the BCE/CE divide within tolerance", () => {
    for (const year of [-399, -300, -100, -1, 0, 1, 2, 354, 1215, 1651, 1956]) {
      const back = positionToYear(rail, yearToPosition(rail, year));
      expect(Math.abs(back - year)).toBeLessThanOrEqual(ROUND_TRIP_TOLERANCE);
    }
  });

  it("round-trips a dense sweep of positions", () => {
    for (let i = 0; i <= 200; i += 1) {
      const position = i / 200;
      const year = positionToYear(rail, position);
      const back = yearToPosition(rail, year);
      // Worst-case segment is 108 years wide and occupies 1/7 of the rail, so a whole-year
      // rounding error moves the position by at most (1/7)/108 / 2.
      expect(Math.abs(back - position)).toBeLessThanOrEqual(1 / 1000);
    }
  });

  it("clamps outside the rail rather than extrapolating", () => {
    expect(yearToPosition(rail, 1900)).toBeLessThanOrEqual(yearToPosition(rail, 1956));
    expect(yearToPosition(rail, 2026)).toBe(1);
    expect(positionToYear(rail, 1)).toBe(1956);
    expect(positionToYear(rail, -5)).toBe(rail.minYear);
  });

  it("puts the BCE/CE divide strictly inside the rail and in the right order", () => {
    expect(rail.minYear).toBe(-399);
    expect(rail.maxYear).toBe(1956);
    expect(rail.epochYear).toBe(1);
    expect(rail.epochPosition).toBeGreaterThan(0);
    expect(rail.epochPosition).toBeLessThan(1);
    expect(yearToPosition(rail, -1)).toBeLessThan(rail.epochPosition);
    expect(yearToPosition(rail, 1)).toBeCloseTo(rail.epochPosition, 12);
  });
});

describe("milestonesFor", () => {
  it("returns every landmark of the eras that hold the technique, deduped and ordered", () => {
    const milestones = milestonesFor(ERAS, T.rlhf);
    expect(milestones.length).toBeGreaterThan(0);
    const years = milestones.map((m) => m.year);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(new Set(milestones.map((m) => `${m.year}|${m.title}`)).size).toBe(milestones.length);
  });

  it("matches a landmark by name even when the era does not list the technique", () => {
    const solo: Era[] = [
      {
        ...eraById("cybernetics-era"),
        techniques: [],
        landmarks: [{ year: 2023, title: "Tripwire evaluations ship", note: "x", weight: 0.5 }],
      },
    ];
    expect(milestonesFor(solo, T.tripwire)).toHaveLength(1);
    expect(milestonesFor(solo, T.constitutional)).toHaveLength(0);
  });
});

describe("progressOf", () => {
  it("is empty for an era that predates the stack and full at the close of the present one", () => {
    expect(progressOf(TECHNIQUES, eraById("machine-era"))).toEqual({ available: 0, total: 8, share: 0 });
    expect(progressOf(TECHNIQUES, eraById("cybernetics-era"))).toEqual({ available: 8, total: 8, share: 1 });
    expect(progressOf(TECHNIQUES, eraById("socratic-turn"))).toEqual({ available: 0, total: 8, share: 0 });
  });

  it("is monotone in the era's closing year", () => {
    const closes = ERAS.map((e) => e.endYear);
    const shares = [...closes].sort((a, b) => a - b).map((year) => {
      const era = ERAS.find((e) => e.endYear === year);
      if (era === undefined) throw new Error("missing era");
      return progressOf(TECHNIQUES, era).share;
    });
    for (let i = 1; i < shares.length; i += 1) {
      expect(shares[i]).toBeGreaterThanOrEqual(shares[i - 1] ?? 0);
    }
  });
});

describe("highlightEras", () => {
  it("ranks by total landmark weight", () => {
    const highlights = highlightEras(ERAS);
    expect(highlights).toHaveLength(HIGHLIGHT_COUNT);
    expect(highlights[0]?.id).toBe("cybernetics-era");
    expect(highlights[0]?.rank).toBe(1);
    expect(highlights[1]?.id).toBe("enlightenment-contract");
    for (let i = 1; i < highlights.length; i += 1) {
      expect(highlights[i]?.landmarkWeight ?? 0).toBeLessThanOrEqual(highlights[i - 1]?.landmarkWeight ?? 0);
    }
  });

  it("breaks ties on startYear, not on input order", () => {
    const highlights = highlightEras(ERAS);
    const late = highlights.findIndex((e) => e.id === "late-antique-law");
    const medieval = highlights.findIndex((e) => e.id === "medieval-rights");
    // 1.90 each; 354 AD must rank above 1215 AD.
    expect(late).toBeLessThan(medieval);
    // An editorial reshuffle of the dataset must not reshuffle the landing page.
    expect(highlightEras([...ERAS].reverse()).map((e) => e.id)).toEqual(highlights.map((e) => e.id));
  });
});

describe("fixtures stay honest", () => {
  it("keeps eight eras, eight techniques, eight axioms of coverage and a 1986 floor", () => {
    const techniques: readonly Technique[] = TECHNIQUES;
    expect(ERAS).toHaveLength(8);
    expect(techniques).toHaveLength(8);
    expect(Math.min(...techniques.map((t) => t.introduced))).toBe(1986);
    expect(Math.max(...techniques.map((t) => t.introduced))).toBe(2024);
  });
});