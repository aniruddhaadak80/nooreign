/**
 * The time machine.
 *
 * Everything the chronicle UI needs to answer "where were we, and what could we do then?" in O(n) or
 * better, with no allocation per frame. Two constraints shaped this file:
 *
 *  1. Years are signed integers. -399 is 399 BC and 0 is not a real year in the seed, so the rail has
 *     to cross zero without folding. The BCE/CE divide is placed at year 1, not year 0.
 *  2. Scrubbing is a frame budget. Every function here takes a readonly slice and returns a fresh
 *     array rather than mutating shared state, and the one genuinely expensive derivation (`eraIndex`)
 *     is memoised on the input array identity.
 */
import type { Era, EraDomain, Technique } from "@repo/seed/types";
import { clamp, safeDiv } from "../util/math";

/* ------------------------------------------------------------------ *
 * Ordering
 * ------------------------------------------------------------------ */

/**
 * Chronological, stable. `Array.prototype.sort` is specified as stable since ES2019, so two eras that
 * begin in the same year keep the order the dataset gave them — which is the only tie-break that
 * cannot surprise an editor.
 */
export function sortEras(eras: readonly Era[]): Era[] {
  return [...eras].sort((a, b) => a.startYear - b.startYear);
}

/**
 * The era containing `year`, or null. When two eras overlap we return the one that started latest:
 * a later, narrower era is the more specific description of where we are standing.
 */
export function eraAtYear(eras: readonly Era[], year: number): Era | null {
  let best: Era | null = null;
  for (const era of eras) {
    if (year >= era.startYear && year <= era.endYear) {
      if (best === null || era.startYear >= best.startYear) best = era;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * Contiguous era windows
 * ------------------------------------------------------------------ */

/** An era with the window bookkeeping the scrubber needs, attached. */
export interface IndexedEra extends Era {
  /** Position in the sorted chronology, 0-based. */
  readonly index: number;
  /** Position along the rail, 0..1. */
  readonly position: number;
  /**
   * The *contiguous* window. An era's declared end is advisory — the next era's start minus one
   * year is what the rail actually uses — because gaps in a chronology are indistinguishable from
   * loading failures when the user scrubs through them.
   */
  readonly span: { readonly startYear: number; readonly endYear: number; readonly years: number };
}

const indexCache = new WeakMap<readonly Era[], IndexedEra[]>();

/**
 * Sorted eras with contiguous windows attached. Memoised on the identity of the input array: the UI
 * hands us the same frozen dataset on every frame, so this turns an O(n log n) sort into a lookup.
 *
 * The returned array is shared between calls — treat it as immutable.
 */
export function eraIndex(eras: readonly Era[]): IndexedEra[] {
  const cached = indexCache.get(eras);
  if (cached !== undefined) return cached;

  const sorted = sortEras(eras);
  const lastIndex = sorted.length - 1;
  const out: IndexedEra[] = sorted.map((era, index) => {
    const next = sorted[index + 1];
    // Contiguity beats the declared end date: the era runs until the day before the next one starts.
    const endYear =
      next === undefined ? Math.max(era.startYear, era.endYear) : Math.max(era.startYear, next.startYear - 1);
    return {
      ...era,
      index,
      position: lastIndex <= 0 ? 0 : index / lastIndex,
      span: { startYear: era.startYear, endYear, years: endYear - era.startYear + 1 },
    };
  });

  indexCache.set(eras, out);
  return out;
}

/* ------------------------------------------------------------------ *
 * The stack, as of a year
 * ------------------------------------------------------------------ */

const byYearThenId = (a: Technique, b: Technique): number => a.introduced - b.introduced || a.id.localeCompare(b.id);

/**
 * Every technique that existed at `year`, oldest first. This is the function the scrubber calls
 * every frame; the filter is deliberately a straight scan rather than a sorted binary search because
 * the stack is small and the sort would dominate.
 */
export function stackAtYear(techniques: readonly Technique[], year: number): Technique[] {
  return techniques.filter((t) => t.introduced <= year).sort(byYearThenId);
}

/** Techniques introduced in the inclusive window `[from, to]`. */
export function techniquesBornBetween(techniques: readonly Technique[], from: number, to: number): Technique[] {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return techniques.filter((t) => t.introduced >= lo && t.introduced <= hi).sort(byYearThenId);
}

/* ------------------------------------------------------------------ *
 * Diffing two eras
 * ------------------------------------------------------------------ */

export interface EraDiff {
  /** Techniques present in `b` that `a` did not have. */
  readonly addedTechniques: string[];
  /** People who appear in `b`'s roll but not `a`'s. */
  readonly emergentFigures: string[];
  /** Advances in `b` that `a` had not yet made. */
  readonly advancedTopics: string[];
  /** `b.startYear - a.startYear`. Negative when `b` is earlier. */
  readonly yearsApart: number;
  /** Present only when the two eras sit in different domains — the interesting case. */
  readonly domainsCrossed?: readonly EraDomain[];
}

const added = (before: readonly string[], after: readonly string[]): string[] => {
  const seen = new Set(before);
  return after.filter((x) => !seen.has(x));
};

/** What the world gained between two eras. Set difference only; nothing is inferred. */
export function diffEras(a: Era, b: Era): EraDiff {
  return {
    addedTechniques: added(a.techniques, b.techniques),
    emergentFigures: added(a.figures, b.figures),
    advancedTopics: added(a.advances, b.advances),
    yearsApart: b.startYear - a.startYear,
    ...(a.domain !== b.domain ? { domainsCrossed: [a.domain, b.domain] as const } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * The rail
 * ------------------------------------------------------------------ */

export interface RailStop {
  readonly eraId: string;
  readonly label: string;
  /**
   * Anchor year for this stop. Equal to the era's `startYear` unless two eras begin in the same
   * year, in which case the later one is nudged up by the minimum necessary to keep the rail's
   * year -> position map strictly increasing (and therefore invertible).
   */
  readonly year: number;
  /** Evenly spaced slot in [0, 1]. */
  readonly position: number;
}

export interface Rail {
  readonly stops: readonly RailStop[];
  readonly minYear: number;
  readonly maxYear: number;
  /** The year drawn at the BCE/CE divide. Year 0 is astronomical; year 1 is 1 AD. */
  readonly epochYear: 1;
  /** Where that divide falls on the rail, 0..1. */
  readonly epochPosition: number;
}

/**
 * Build the rail. Each era gets an equally sized slot regardless of how long it lasted — otherwise
 * the four centuries of Socratic method would eat two thirds of the scrub bar and the twentieth
 * century would get a sliver. The year -> position map is piecewise-linear through the stops, so it
 * stays invertible even though the slots are not proportional to time.
 */
export function buildRail(eras: readonly Era[]): Rail {
  const sorted = sortEras(eras);
  const lastIndex = sorted.length - 1;
  const stops: RailStop[] = [];
  let previousYear = Number.NEGATIVE_INFINITY;

  sorted.forEach((era, index) => {
    const year = era.startYear <= previousYear ? previousYear + 1 : era.startYear;
    previousYear = year;
    stops.push({
      eraId: era.id,
      label: era.label,
      year,
      position: lastIndex <= 0 ? 0 : index / lastIndex,
    });
  });

  const first = stops[0];
  const last = stops[stops.length - 1];
  const minYear = first === undefined ? 0 : first.year;
  const maxYear = last === undefined ? 0 : last.year;

  const rail: Rail = {
    stops,
    minYear,
    maxYear,
    epochYear: 1,
    epochPosition: 0,
  };
  return { ...rail, epochPosition: yearToPosition(rail, 1) };
}

/** Where `year` sits on the rail, 0..1, clamped. Piecewise-linear between stops. */
export function yearToPosition(rail: Rail, year: number): number {
  const stops = rail.stops;
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (first === undefined || last === undefined) return 0;
  if (stops.length === 1) return year < first.year ? 0 : 1;
  if (year <= first.year) return first.position;
  if (year >= last.year) return last.position;

  for (let i = 0; i < stops.length - 1; i += 1) {
    const lo = stops[i];
    const hi = stops[i + 1];
    if (lo === undefined || hi === undefined) continue;
    if (year >= lo.year && year <= hi.year) {
      const span = hi.year - lo.year;
      if (span <= 0) return lo.position;
      const t = (year - lo.year) / span;
      return clamp(lo.position + t * (hi.position - lo.position), 0, 1);
    }
  }
  return last.position;
}

/**
 * The year at `position`, 0..1, clamped and rounded to a whole year.
 *
 * Round-tripping `positionToYear(yearToPosition(y))` is exact to the nearest year (error <= 0.5) for
 * any rail with two or more stops. A single-stop rail has no invertible span by construction; it
 * degenerates to "before" / "not before" and we say so rather than pretending.
 */
export function positionToYear(rail: Rail, position: number): number {
  const stops = rail.stops;
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (first === undefined || last === undefined) return 0;
  if (stops.length === 1) return first.year;
  const p = clamp(position, 0, 1);
  if (p <= first.position) return first.year;
  if (p >= last.position) return last.year;

  for (let i = 0; i < stops.length - 1; i += 1) {
    const lo = stops[i];
    const hi = stops[i + 1];
    if (lo === undefined || hi === undefined) continue;
    if (p >= lo.position && p <= hi.position) {
      const span = hi.position - lo.position;
      if (span <= 0) return lo.year;
      const t = (p - lo.position) / span;
      return Math.round(lo.year + t * (hi.year - lo.year));
    }
  }
  return last.year;
}

/* ------------------------------------------------------------------ *
 * Milestones
 * ------------------------------------------------------------------ */

export interface Milestone {
  readonly eraId: string;
  readonly eraLabel: string;
  readonly year: number;
  readonly title: string;
  readonly note: string;
  readonly weight: number;
}

const tokensOf = (id: string): string[] => id.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);

/**
 * Every landmark across the chronology that belongs to `techniqueId`, deduped and ordered.
 *
 * A landmark belongs to a technique when the era already lists that technique, or when the landmark's
 * title names it — the second rule catches the common case where an era lists a technique the era
 * predates it in. Dedupe is by `year + title` because two eras may legitimately record the same
 * paper.
 */
export function milestonesFor(eras: readonly Era[], techniqueId: string): Milestone[] {
  const wanted = tokensOf(techniqueId);
  const seen = new Set<string>();
  const out: Milestone[] = [];

  for (const era of sortEras(eras)) {
    const listed = era.techniques.includes(techniqueId);
    for (const lm of era.landmarks) {
      const key = `${lm.year}|${lm.title}`;
      if (seen.has(key)) continue;
      const title = lm.title.toLowerCase();
      const named = wanted.length > 0 && wanted.some((t) => title.includes(t));
      if (!listed && !named) continue;
      seen.add(key);
      out.push({
        eraId: era.id,
        eraLabel: era.label,
        year: lm.year,
        title: lm.title,
        note: lm.note,
        weight: lm.weight,
      });
    }
  }

  return out.sort((a, b) => a.year - b.year || a.eraId.localeCompare(b.eraId) || a.title.localeCompare(b.title));
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

export interface StackProgress {
  /** Techniques that existed by the close of the era. */
  readonly available: number;
  /** The modern stack — the denominator. */
  readonly total: number;
  /** `available / total`, clamped to [0, 1]. */
  readonly share: number;
}

/**
 * How much of the *modern* alignment stack existed by the close of `era`. Drives the "the stack
 * rebuilds as you scrub" visual.
 *
 * Deliberately date-driven and not driven by `era.techniques`: the curated list is an editorial claim
 * about what mattered, the dates are a fact about when things existed, and a scrubber that disagrees
 * with itself depending on which field it read is a scrubber nobody trusts. The curated list is still
 * the right tool for "what did this era care about" — use `diffEras` for that.
 */
export function progressOf(techniques: readonly Technique[], era: Era): StackProgress {
  const total = techniques.length;
  const available = techniques.reduce((n, t) => (t.introduced <= era.endYear ? n + 1 : n), 0);
  return { available, total, share: clamp(safeDiv(available, total), 0, 1) };
}

/* ------------------------------------------------------------------ *
 * Highlights
 * ------------------------------------------------------------------ */

export interface HighlightedEra extends Era {
  /** Sum of every landmark weight in the era. */
  readonly landmarkWeight: number;
  /** 1-based rank by consequence. */
  readonly rank: number;
}

/** How many eras the observatory highlights. */
export const HIGHLIGHT_COUNT = 8;

/**
 * The most consequential eras, ranked by total landmark weight. Ties break on `startYear` and then
 * on `id` so the ordering never depends on input order — an editorial reshuffle of the dataset must
 * not reshuffle the landing page.
 */
export function highlightEras(eras: readonly Era[]): HighlightedEra[] {
  const scored = sortEras(eras).map((era) => ({
    era,
    weight: era.landmarks.reduce((sum, lm) => sum + lm.weight, 0),
  }));

  scored.sort(
    (a, b) =>
      b.weight - a.weight || a.era.startYear - b.era.startYear || a.era.id.localeCompare(b.era.id),
  );

  const top = scored.slice(0, Math.max(HIGHLIGHT_COUNT, 0));
  return top.map((entry, index) => ({ ...entry.era, landmarkWeight: round4(entry.weight), rank: index + 1 }));
}

const round4 = (n: number): number => Math.round(n * 10_000) / 10_000;